const { dirname, join } = require('path');

module.exports = function (config) {
  config.set({
    basePath: '',

    frameworks: ['jasmine'],

    files: [
      'spec/**/*.js',
      join(dirname(require.resolve('axe-core')), 'axe.js')
    ],

    exclude: [],

    preprocessors: {},

    reporters: ['progress'],

    port: 9876,

    colors: true,

    logLevel: config.LOG_INFO,

    autoWatch: true,

    browsers: ['ChromeHeadless'],

    singleRun: true,

    concurrency: Infinity
  });
};
