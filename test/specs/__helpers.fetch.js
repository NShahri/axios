window.fetch = undefined;

// Import axios
var axios = require('../../index');
axios.defaults.adapter = require('../../lib/adapters/fetch');
require('./__helpers');

require('whatwg-fetch');
require('abortcontroller-polyfill');