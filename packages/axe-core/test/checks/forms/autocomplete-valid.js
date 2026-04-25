describe('autocomplete-valid', function () {
  'use strict';

  const fixture = document.getElementById('fixture');
  const checkSetup = axe.testUtils.checkSetup;
  const checkContext = axe.testUtils.MockCheckContext();
  const evaluate = axe.testUtils.getCheckEvaluate('autocomplete-valid');

  afterEach(function () {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('returns true if autocomplete is valid', function () {
    const params = checkSetup('<input autocomplete="on" id="target" />');
    assert.isTrue(evaluate.apply(checkContext, params));
  });

  it('returns false if autocomplete is not valid', function () {
    const params = checkSetup('<input autocomplete="foo" id="target" />');
    assert.isFalse(evaluate.apply(checkContext, params));
  });

  it('returns undefined (incomplete) if autocomplete is ignored', function () {
    const params = checkSetup('<input autocomplete="text" id="target" />');
    assert.isUndefined(evaluate.apply(checkContext, params));
  });

  it('uses options to change what is valid autocomplete', function () {
    const options = { stateTerms: ['foo'] };
    const params = checkSetup(
      '<input autocomplete="foo" id="target" />',
      options
    );
    assert.isTrue(evaluate.apply(checkContext, params));
  });
});
