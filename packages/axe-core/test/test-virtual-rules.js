const path = require('path');
const assert = require('chai').assert;
const glob = require('glob');
// Phase 2 build moved axe.js from the package root into dist/.
// See test-locales.js for context.
const axe = require('../dist/axe.js');

const files = glob.sync(path.join(__dirname, 'integration/virtual-rules/*.js'));

before(function () {
  global.axe = axe;
  global.assert = assert;
});

after(function () {
  delete global.axe;
  delete global.assert;
});

describe('virtual-rule node tests', function () {
  files.forEach(function (file) {
    // load the test file and run with global axe and assert now defined
    require(file);
  });
});
