describe('abstractrole', function () {
  'use strict';

  const fixture = document.getElementById('fixture');
  const queryFixture = axe.testUtils.queryFixture;
  const checkContext = axe.testUtils.MockCheckContext();

  afterEach(function () {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if applied to a concrete role', function () {
    const virtualNode = queryFixture(
      '<div id="target" role="alert">Contents</div>'
    );
    assert.isFalse(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    );
    assert.isNull(checkContext._data);
  });

  it('should return false if applied to a nonsensical role', function () {
    const virtualNode = queryFixture(
      '<div id="target" role="foo">Contents</div>'
    );
    assert.isFalse(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    );
    assert.isNull(checkContext._data);
  });

  it('should return true if applied to an abstract role', function () {
    const virtualNode = queryFixture(
      '<div id="target" role="widget">Contents</div>'
    );
    assert.isTrue(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    );
    assert.deepEqual(checkContext._data, ['widget']);
  });

  it('should return false if applied to multiple concrete roles', function () {
    const virtualNode = queryFixture(
      '<div id="target" role="alert button">Contents</div>'
    );
    assert.isFalse(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    );
    assert.isNull(checkContext._data);
  });

  it('should return true if applied to at least one abstract role', function () {
    const virtualNode = queryFixture(
      '<div id="target" role="alert widget structure">Contents</div>'
    );
    assert.isTrue(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    );
    assert.deepEqual(checkContext._data, ['widget', 'structure']);
  });
});
