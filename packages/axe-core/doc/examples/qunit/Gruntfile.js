const { dirname, join } = require('path');

module.exports = function (grunt) {
  'use strict';

  grunt.loadNpmTasks('grunt-contrib-qunit');

  grunt.initConfig({
    qunit: {
      all: ['test/**/*.html'],
      options: {
        inject: [
          require.resolve('grunt-contrib-qunit/chrome/bridge.js'),
          join(dirname(require.resolve('axe-core')), 'axe.min.js')
        ],
        puppeteer: {
          args: ['--disable-web-security', '--allow-file-access-from-files']
        },
        timeout: 10000
      }
    }
  });
};
