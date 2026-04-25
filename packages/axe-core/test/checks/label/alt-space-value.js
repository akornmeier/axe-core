describe('alt-space-value', function () {
  'use strict';

  const checkSetup = axe.testUtils.checkSetup;
  const checkContext = axe.testUtils.MockCheckContext();
  const check = checks['alt-space-value'];

  afterEach(function () {
    checkContext.reset();
  });

  it('should return true if alt contains a space character', function () {
    const params = checkSetup('<img id="target" alt=" " />');
    assert.isTrue(check.evaluate.apply(checkContext, params));
  });

  it('should return true if alt contains a non-breaking space character', function () {
    const params = checkSetup('<img id="target" alt="&nbsp;" />');
    assert.isTrue(check.evaluate.apply(checkContext, params));
  });

  it('should return false if alt attribute is empty', function () {
    const params = checkSetup('<img id="target" alt="" />');
    assert.isFalse(check.evaluate.apply(checkContext, params));
  });

  it('should return false if alt attribute has a proper text value', function () {
    const params = checkSetup('<img id="target" alt="text content" />');
    assert.isFalse(check.evaluate.apply(checkContext, params));
  });
});
