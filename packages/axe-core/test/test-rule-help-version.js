const https = require('https');
const path = require('path');
const assert = require('assert');
const packageJSON = require(path.join(__dirname, '../package.json'));

const versions = packageJSON.version.split('.');
const version = versions[0] + '.' + versions[1];

it(
  'latest axe version (' + version + ') rule help docs should be active',
  function (done) {
    https.get(
      'https://dequeuniversity.com/rules/axe/' + version,
      function (res) {
        assert(res.statusCode >= 200 && res.statusCode <= 299);
        done();
      }
    );
  }
);
