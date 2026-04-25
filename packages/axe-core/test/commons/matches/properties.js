describe('matches.properties', function () {
  const properties = axe.commons.matches.properties;
  const fixture = document.querySelector('#fixture');
  const queryFixture = axe.testUtils.queryFixture;

  beforeEach(function () {
    fixture.innerHTML = '';
  });

  it('returns true if all properties match', function () {
    const virtualNode = queryFixture('<input type="text" id="target"></input>');

    assert.isTrue(
      properties(virtualNode, {
        nodeName: 'input',
        id: 'target',
        type: 'text'
      })
    );
  });

  it('returns false if some properties do not match', function () {
    const virtualNode = queryFixture('<input type="text" id="target"></input>');

    assert.isFalse(
      properties(virtualNode, {
        nodeName: 'input',
        id: 'target',
        type: 'num'
      })
    );
  });

  it('returns false if any properties are missing', function () {
    const virtualNode = queryFixture('<h1 id="target">foo</h1>');

    assert.isFalse(
      properties(virtualNode, {
        nodeName: 'h1',
        id: 'target',
        type: 'text'
      })
    );
  });

  it('works with actual nodes', function () {
    const virtualNode = queryFixture('<input type="text" id="target"></input>');

    assert.isTrue(
      properties(virtualNode.actualNode, {
        nodeName: 'input',
        id: 'target',
        type: 'text'
      })
    );
  });

  it('works with SerialVirtualNode', function () {
    const serialNode = new axe.SerialVirtualNode({
      nodeName: 'input',
      type: 'text',
      id: 'target'
    });

    assert.isTrue(
      properties(serialNode, {
        nodeName: 'input',
        id: 'target',
        type: 'text'
      })
    );
  });
});
