describe('non-empty-alt', function () {
  'use strict';

  const fixture = document.getElementById('fixture');
  const checkSetup = axe.testUtils.checkSetup;
  const checkEvaluate = axe.testUtils.getCheckEvaluate('non-empty-alt');
  const checkContext = axe.testUtils.MockCheckContext();

  afterEach(function () {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if an alt is present', function () {
    const params = checkSetup('<img id="target" alt="woohoo" />');
    assert.isTrue(checkEvaluate.apply(checkContext, params));
  });

  it('should return false if an alt is not present', function () {
    const params = checkSetup('<img id="target" />');
    assert.isFalse(checkEvaluate.apply(checkContext, params));
    assert.equal(checkContext._data.messageKey, 'noAttr');
  });

  it('should return false if an alt is present, but empty', function () {
    const params = checkSetup('<img id="target" alt=" " />');
    assert.isFalse(checkEvaluate.apply(checkContext, params));
    assert.equal(checkContext._data.messageKey, 'emptyAttr');
  });

  it('should collapse whitespace', function () {
    const params = checkSetup(
      '<img id="target" alt=" \t \n \r \t  \t\r\n " />'
    );
    assert.isFalse(checkEvaluate.apply(checkContext, params));
    assert.equal(checkContext._data.messageKey, 'emptyAttr');
  });
});
