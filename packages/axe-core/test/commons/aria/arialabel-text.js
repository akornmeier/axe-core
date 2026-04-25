describe('aria.arialabelText', function () {
  'use strict';
  const aria = axe.commons.aria;

  it('returns "" if there is no aria-label', function () {
    const vNode = new axe.SerialVirtualNode({ nodeName: 'div' });
    assert.equal(aria.arialabelText(vNode), '');
  });

  it('returns the aria-label attribute', function () {
    const label = ' my label ';
    const vNode = new axe.SerialVirtualNode({
      nodeName: 'div',
      attributes: { 'aria-label': label }
    });
    assert.equal(aria.arialabelText(vNode), label);
  });

  it('returns "" if there is no aria-label', function () {
    const vNode = new axe.SerialVirtualNode({ nodeName: 'div' });
    assert.equal(aria.arialabelText(vNode), '');
  });

  it('looks up the node in the flat tree', function () {
    const label = 'harambe';
    const node = document.createElement('div');
    node.setAttribute('aria-label', label);

    axe.utils.getFlattenedTree(node);
    assert.equal(aria.arialabelText(node), label);
  });

  it('returns "" if the node is not an element', function () {
    const node = document.createTextNode('my text node');
    assert.equal(aria.arialabelText(node), '');
  });
});
