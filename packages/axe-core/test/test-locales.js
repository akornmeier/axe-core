const fs = require('fs');
const path = require('path');
const assert = require('assert');
const glob = require('glob');
const axe = require(path.join(__dirname, '../axe'));

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
