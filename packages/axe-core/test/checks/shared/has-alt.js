describe('has-alt', function () {
  'use strict';

  const fixture = document.getElementById('fixture');
  const checkSetup = axe.testUtils.checkSetup;

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should return true if an alt is present', function () {
    const checkArgs = checkSetup('<img id="target" alt="woohoo" />');
    assert.isTrue(
      axe.testUtils.getCheckEvaluate('has-alt').apply(null, checkArgs)
    );
  });

  it('should return true if an empty alt is present', function () {
    const checkArgs = checkSetup('<img id="target" alt="" />');
    assert.isTrue(
      axe.testUtils.getCheckEvaluate('has-alt').apply(null, checkArgs)
    );
  });

  it('should return true if a null alt is present', function () {
    const checkArgs = checkSetup('<img id="target" alt />');
    assert.isTrue(
      axe.testUtils.getCheckEvaluate('has-alt').apply(null, checkArgs)
    );
  });

  it('should return false if an alt is not present', function () {
    const checkArgs = checkSetup('<img id="target" />');
    assert.isFalse(
      axe.testUtils.getCheckEvaluate('has-alt').apply(null, checkArgs)
    );
  });
});
