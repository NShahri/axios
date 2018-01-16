'use strict';

var btoa = (typeof window !== 'undefined' && window.btoa &&
  window.btoa.bind(window)) || require('./../helpers/btoa');

/**
 * @private
 *
 * @param auth {string}
 * @returns {string}
 */
function basicAuthBuilder(auth) {
  return 'Basic ' + btoa(auth);
}


/**
 * returns the value of Authorization header based on auth config or auth in url
 *
 * @param authConfig {AuthConfig}
 * @param auth {string}
 * @returns {string|undefined}
 */
module.exports.fetchAuth = function(authConfig, auth) {
  if (authConfig) {
    var username = authConfig.username || '';
    var password = authConfig.password || '';
    return basicAuthBuilder(username + ':' + password);
  }

  if (auth) {
    return basicAuthBuilder(auth);
  }

  return undefined;
};
