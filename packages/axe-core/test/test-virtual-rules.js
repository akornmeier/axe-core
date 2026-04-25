const path = require('path');
const assert = require('chai').assert;
const glob = require('glob');
const axe = require('../axe');

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
