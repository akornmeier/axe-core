/*global mocha */
const failedTests = [];
function flattenTitles(test) {
  const titles = [];
  while (test.parent.title) {
    titles.push(test.parent.title);
    test = test.parent;
  }
  return titles.reverse();
}

(function () {
  'use strict';

  const runner = mocha.run();
  runner.on('end', function () {
    window.mochaResults = runner.stats;
    window.mochaResults.reports = failedTests;
    // Sprint 5c Wave A: bubble results to the parent window so the Vitest
    // page-fixture-runner can harvest them across the cross-origin boundary.
    // Target origin is `'*'` because the fixture server binds to a dynamic
    // port that the embedded fixture cannot know in advance.
    // Harmless under the legacy Selenium driver (no parent listener exists).
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(
          { type: 'axe-fixture-results', results: window.mochaResults },
          '*'
        );
      } catch (e) {
        // Ignore: structured-clone of mochaResults may fail on exotic shapes.
      }
    }
  });
  runner.on('fail', function logFailure(test, err) {
    failedTests.push({
      name: test.title,
      result: false,
      message: err.message,
      stack: err.stack,
      titles: flattenTitles(test)
    });
  });
})();
