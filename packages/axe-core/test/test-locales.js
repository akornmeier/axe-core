const fs = require('fs');
const path = require('path');
const assert = require('assert');
const glob = require('glob');
// Phase 2 build moved axe.js from the package root into dist/. This script
// stays on the Karma-era code path until Sprint 5 task #16 deletes it; until
// then we point at the new location explicitly.
const axe = require(path.join(__dirname, '../dist/axe.js'));

const localeFiles = glob.sync(path.join(__dirname, '../locales/*.json'));

describe('locales', function () {
  localeFiles.forEach(function (localeFile) {
    const localeName = path.basename(localeFile);
    it(localeName + ' should be valid', function () {
      const localeData = fs.readFileSync(localeFile, 'utf-8');
      const locale = JSON.parse(localeData);
      function fn() {
        axe.configure({ locale: locale });
      }

      assert.doesNotThrow(fn);
    });
  });
});
