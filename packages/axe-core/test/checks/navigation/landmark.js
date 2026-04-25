describe('landmark', function () {
  'use strict';

  const fixture = document.getElementById('fixture');
  const checkSetup = axe.testUtils.checkSetup;
  const shadowSupport = axe.testUtils.shadowSupport;
  const checkEvaluate = axe.testUtils.getCheckEvaluate('landmark');
  const checkContext = axe.testUtils.MockCheckContext();

  afterEach(function () {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true when role=main is found', function () {
    const checkArgs = checkSetup('<div role="main"></div>', '#fixture');
    assert.isTrue(checkEvaluate.apply(checkContext, checkArgs));
  });

  it('should return true when <main> is found', function () {
    const checkArgs = checkSetup('<main></main>', '#fixture');
    assert.isTrue(checkEvaluate.apply(checkContext, checkArgs));
  });

  it('should otherwise return false', function () {
    const checkArgs = checkSetup('<div role="contentinfo"></div>', '#fixture');
    assert.isFalse(checkEvaluate.apply(checkContext, checkArgs));
  });

  (shadowSupport.v1 ? it : xit)(
    'should not automatically pass if there is a shadow tree',
    function () {
      const node = document.createElement('div');
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<div></div>';
      const checkArgs = checkSetup(node, '#fixture');

      assert.isFalse(checkEvaluate.apply(checkContext, checkArgs));
    }
  );

  (shadowSupport.v1 ? it : xit)(
    'should find elements inside shadow trees',
    function () {
      const node = document.createElement('div');
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<main></main>';
      const checkArgs = checkSetup(node, '#fixture');

      assert.isTrue(checkEvaluate.apply(checkContext, checkArgs));
    }
  );

  (shadowSupport.v1 ? it : xit)(
    'should find elements slotted in shadow trees',
    function () {
      const node = document.createElement('div');
      node.innerHTML = '<main></main>';
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot>';
      const checkArgs = checkSetup(node, '#fixture');

      assert.isTrue(checkEvaluate.apply(checkContext, checkArgs));
    }
  );
});
