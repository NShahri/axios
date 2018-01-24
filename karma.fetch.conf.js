var karmaConfig = require('./karma.conf');

module.exports = function(config) {
  karmaConfig(config);
  config.set({
    files: [
      'test/specs/__helpers.fetch.js',
      'test/specs/**/*.spec.js'
    ],
    preprocessors: {
      'test/specs/__helpers.fetch.js': ['webpack', 'sourcemap'],
      'test/specs/**/*.spec.js': ['webpack', 'sourcemap']
    }
  });
};
