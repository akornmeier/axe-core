describe('aria-label', function () {
  'use strict';

  const fixture = document.getElementById('fixture');
  const checkSetup = axe.testUtils.checkSetup;

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should return true if an aria-label is present', function () {
    const checkArgs = checkSetup('<div id="target" aria-label="woohoo"></div>');
    assert.isTrue(
      axe.testUtils.getCheckEvaluate('aria-label').apply(null, checkArgs)
    );
  });

  it('should return false if an aria-label is not present', function () {
    const checkArgs = checkSetup('<div id="target"></div>');
    assert.isFalse(
      axe.testUtils.getCheckEvaluate('aria-label').apply(null, checkArgs)
    );
  });

  it('should return false if an aria-label is present, but empty', function () {
    const checkArgs = checkSetup('<div id="target" aria-label=" "></div>');
    assert.isFalse(
      axe.testUtils.getCheckEvaluate('aria-label').apply(null, checkArgs)
    );
  });

  it('should collapse whitespace', function () {
    const checkArgs = checkSetup(
      '<div id="target" aria-label=" \t \n \r \t  \t\r\n "></div>'
    );
    assert.isFalse(
      axe.testUtils.getCheckEvaluate('aria-label').apply(null, checkArgs)
    );
  });
});
