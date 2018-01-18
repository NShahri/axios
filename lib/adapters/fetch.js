'use strict';

var fetchAuth = require('./adapterHelper').fetchAuth;

var settle = require('./../core/settle');
var url = require('url');
var buildURL = require('./../helpers/buildURL');
var createError = require('../core/createError');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var utils = require('./../utils');
var cookies = require('./../helpers/cookies');

var contentTypeHeaderName = 'content-type';

/**
 * @typedef {object} AdapterResponse
 * @property data {object} is the response that was provided by the server
 * @property status {number} is the HTTP status code from the server response
 * @property statusText {string} is the HTTP status message from the server response
 * @property headers {array} the headers that the server responded with
 * @property config {object} is the config that was provided to `axios` for the request
 * @property request {object} is the request that generated this response. It is the last request instance in redirects.
 */

/**
 * typedef {object} AuthConfig
 * @property username {string}
 * @property password {string}
 */

/**
 * @typedef {object} AdapterConfig
 * @property {string} url  is the server URL that will be used for the request.
 * @property params {object} are the URL parameters to be sent with the request
 * @property paramsSerializer {function({{object}}:string} an optional function in charge of serializing `params`
 * @property method {string} is the request method to be used when making the request
 * @property transformRequest {function} is the data to be sent as the request body
 *      Only applicable for request methods 'PUT', 'POST', and 'PATCH'
 *      When no `transformRequest` is set, must be of one of the following types:
 *      - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
 *      - Browser only: FormData, File, Blob
 *      - Node only: Stream, Buffer
 * @property data {object} is the data to be sent as the request body.
 *    This is only applicable for request methods 'PUT', 'POST', and 'PATCH'.
 *    When no `transformRequest` is set, must be of one of the following types:
 *      - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
 *      - Browser only: FormData, File, Blob
 *      - Node only: Stream, Buffer
 * @property headers {object} are custom headers to be sent
 * @property withCredentials {boolean} indicates whether or not cross-site Access-Control requests, only browser
 * @property xsrfCookieName {string} is the name of the cookie to use as a value for xsrf token (default: 'XSRF-TOKEN'). only browser and withCredentials=true
 * @property xsrfHeaderName {string} is the name of the http header that carries the xsrf token value (default: 'X-XSRF-TOKEN'). only browser and withCredentials=true
 * @property auth {AuthConfig} indicates that HTTP Basic auth should be used, and supplies credentials.
 * @property timeout {number} specifies the number of milliseconds before the request times out. If the request takes longer than `timeout`, the request will be aborted.
 * @property responseType {'arraybuffer'|'blob'|'document'|'json'|'text'|'stream'} indicates the type of data that the server will respond with.
 * @property cancelToken {CancelToken} specifies a cancel token that can be used to cancel the request
 */

/*
* @property transformRequest {array.<function({data: {object}, {headers: {object})>} allows changes to the request data before it is sent to the server
*    This is only applicable for request methods 'PUT', 'POST', and 'PATCH'.
*    The last function in the array must return a string or an instance of Buffer, ArrayBuffer, FormData or Stream.
*    You may modify the headers object.
*/

function responseBuilder(config, request, response, body) {
  var headers = {};

  response.headers.forEach(function(val, key) {
    headers[key] = val;
  });

  return {
    data: body,
    status: response.status,
    statusText: response.statusText,
    headers: headers,
    config: config,
    request: request
  };
}

function responseParser(config, request, response) {
  if (config.responseType === 'arraybuffer') {
    return response.arrayBuffer().then(function(data) {
      return responseBuilder(config, request, response, data);
    });
  } else if (config.responseType === 'blob') {
    return response.blob().then(function(data) {
      return responseBuilder(config, request, response, data);
    });
  } else if (config.responseType === 'json') {
    return response.json().then(function(data) {
      return responseBuilder(config, request, response, data);
    });
  } else if (config.responseType === 'stream') {
    return responseBuilder(config, request, response, response.body);
  }

  //
  // TODO: when responseType is document, what should be returned?
  //
  // config.responseType is 'document' or 'text'
  //
  return response.text().then(function(data) {
    return responseBuilder(config, request, response, data);
  });
}

/**
 * Handles dispatching a request and settling a returned Promise once a response is received.
 *
 * @param config {AdapterConfig}
 * @returns {Promise.<AdapterResponse>}
 */
function fetchAdapter(config) {
  var parsed = url.parse(config.url);

  var request = new Request(
    buildURL(config.url, config.params, config.paramsSerializer),
    /** @type RequestInit **/ {
      method: config.method.toUpperCase(),
      body: config.data,
      // headers: new Headers(),
      // mode: 'cors',
      credentials: config.withCredentials ? 'include' : 'omit',
      // cache: 'default',
      redirect: 'manual'
      // referrer: 'client',
      // integrity: undefined
    });

  var auth = fetchAuth(config.auth, parsed.auth);
  if (auth) {
    request.headers.set('Authorization', auth);
  }

  // Add xsrf header
  // This is only done if running in a standard browser environment.
  // Specifically not if we're in a web worker, or react-native.
  if (utils.isStandardBrowserEnv()) {
    // Add xsrf header
    var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) &&
    config.xsrfCookieName ?
      cookies.read(config.xsrfCookieName) :
      undefined;

    if (xsrfValue) {
      request.headers.set(config.xsrfHeaderName, xsrfValue);
    }
  }

  //
  // Set all headers
  //
  if (request.headers.get(contentTypeHeaderName)) {
    request.headers.delete(contentTypeHeaderName);
  }

  utils.forEach(config.headers, function(val, key) {
    if (key.toUpperCase() !== contentTypeHeaderName.toUpperCase() ||
      (config.data !== undefined && !utils.isFormData(config.data))) {
      request.headers.append(key, val);
    }
  });

  if (config.data !== undefined &&
    !request.headers.has(contentTypeHeaderName)) {
    request.headers.set(contentTypeHeaderName, 'application/json');
  }

  //
  // Chrome does not support AbortController, and needs polyfill
  //
  var controller = AbortController ? new AbortController() : null;
  if (controller) {
    request.signal = controller.signal;

    if (config.timeout) {
      setTimeout(function() {
        controller.abort();
      }, config.timeout);
    }

    if (config.cancelToken) {
      config.cancelToken.promise.then(function onCanceled() {
        controller.abort();
      });
    }
  }

  return fetch(request).catch(function(err) {
    //
    // WHEN request failed
    //
    console.log('ERR11', err, err.message);
    return Promise.reject(createError('Network Error', config, null, request));
  }).then(function(response) {
    return responseParser(config, request, response);
  }).then(function(result) {
    return new Promise(function(resolve, reject) {
      settle(resolve, reject, result);
    });
  }).catch(function(err) {
    console.log('ERR22', err.message, request.headers);
    throw err;
  });
}

module.exports = fetchAdapter;
