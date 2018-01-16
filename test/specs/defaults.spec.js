var defaults = require('../../lib/defaults');
var utils = require('../../lib/utils');
var testHeaderValue = require('../testHelpers').testHeaderValue;


describe('defaults', function () {
  var XSRF_COOKIE_NAME = 'CUSTOM-XSRF-TOKEN';

  beforeEach(function () {
    jasmine.Ajax.install();
  });

  afterEach(function () {
    jasmine.Ajax.uninstall();
    delete axios.defaults.baseURL;
    delete axios.defaults.headers.get['X-CUSTOM-HEADER'];
    delete axios.defaults.headers.post['X-CUSTOM-HEADER'];
    document.cookie = XSRF_COOKIE_NAME + '=;expires=' + new Date(Date.now() - 86400000).toGMTString();
  });

  it('should transform request json', function () {
    expect(defaults.transformRequest[0]({foo: 'bar'})).toEqual('{"foo":"bar"}');
  });

  it('should do nothing to request string', function () {
    expect(defaults.transformRequest[0]('foo=bar')).toEqual('foo=bar');
  });

  it('should transform response json', function () {
    var data = defaults.transformResponse[0]('{"foo":"bar"}');

    expect(typeof data).toEqual('object');
    expect(data.foo).toEqual('bar');
  });

  it('should do nothing to response string', function () {
    expect(defaults.transformResponse[0]('foo=bar')).toEqual('foo=bar');
  });

  it('should use global defaults config', function (done) {
    axios('/foo');

    getAjaxRequest().then(function (request) {
      expect(request.url).toBe('/foo');
      done();
    });
  });

  it('should use modified defaults config', function (done) {
    axios.defaults.baseURL = 'http://example.com/';

    axios('/foo');

    getAjaxRequest().then(function (request) {
      expect(request.url).toBe('http://example.com/foo');
      done();
    });
  });

  it('should use request config', function (done) {
    axios('/foo', {
      baseURL: 'http://www.example.com'
    });

    getAjaxRequest().then(function (request) {
      expect(request.url).toBe('http://www.example.com/foo');
      done();
    });
  });

  it('should use default config for custom instance', function (done) {
    var instance = axios.create({
      xsrfCookieName: XSRF_COOKIE_NAME,
      xsrfHeaderName: 'X-CUSTOM-XSRF-TOKEN'
    });
    document.cookie = instance.defaults.xsrfCookieName + '=foobarbaz';

    instance.get('/foo');

    getAjaxRequest().then(function (request) {
      testHeaderValue(request.requestHeaders, instance.defaults.xsrfHeaderName, 'foobarbaz');
      done();
    });
  });

  it('should use GET headers', function (done) {
    axios.defaults.headers.get['X-CUSTOM-HEADER'] = 'foo';
    axios.get('/foo');

    getAjaxRequest().then(function (request) {
      testHeaderValue(request.requestHeaders, 'X-CUSTOM-HEADER', 'foo');
      done();
    });
  });

  it('should use POST headers', function (done) {
    axios.defaults.headers.post['X-CUSTOM-HEADER'] = 'foo';
    axios.post('/foo', {});

    getAjaxRequest().then(function (request) {
      testHeaderValue(request.requestHeaders, 'X-CUSTOM-HEADER', 'foo');
      done();
    });
  });

  it('should use header config', function (done) {
    var instance = axios.create({
      headers: {
        common: {
          'X-COMMON-HEADER': 'commonHeaderValue'
        },
        get: {
          'X-GET-HEADER': 'getHeaderValue'
        },
        post: {
          'X-POST-HEADER': 'postHeaderValue'
        }
      }
    });

    instance.get('/foo', {
      headers: {
        'X-FOO-HEADER': 'fooHeaderValue',
        'X-BAR-HEADER': 'barHeaderValue'
      }
    });

    getAjaxRequest().then(function (request) {
      var expextedHeaders = utils.merge(defaults.headers.common, defaults.headers.get, {
        'X-COMMON-HEADER': 'commonHeaderValue',
        'X-GET-HEADER': 'getHeaderValue',
        'X-FOO-HEADER': 'fooHeaderValue',
        'X-BAR-HEADER': 'barHeaderValue'
      })
;
      expect(Object.keys(request.requestHeaders).length).toEqual(Object.keys(expextedHeaders).length);
      object.keys(expextedHeaders).forEach(function (key){
        testHeaderValue(request.requestHeaders, key, expextedHeaders[key]);
      });
      done();
    });
  });

  it('should be used by custom instance if set before instance created', function (done) {
    axios.defaults.baseURL = 'http://example.org/';
    var instance = axios.create();

    instance.get('/foo');

    getAjaxRequest().then(function (request) {
      expect(request.url).toBe('http://example.org/foo');
      done();
    });
  });

  it('should be used by custom instance if set after instance created', function (done) {
    var instance = axios.create();
    axios.defaults.baseURL = 'http://example.org/';

    instance.get('/foo');

    getAjaxRequest().then(function (request) {
      expect(request.url).toBe('http://example.org/foo');
      done();
    });
  });
});
