import { describe, expect, it } from 'vitest';
import { axe } from '@helpers/check-helpers';

describe('aria.arialabelText', function () {
  var aria = axe.commons.aria;

  it('returns "" if there is no aria-label', function () {
    var vNode = new axe.SerialVirtualNode({ nodeName: 'div' });
    expect(aria.arialabelText(vNode)).toBe('');
  });

  it('returns the aria-label attribute', function () {
    var label = ' my label ';
    var vNode = new axe.SerialVirtualNode({
      nodeName: 'div',
      attributes: { 'aria-label': label }
    });
    expect(aria.arialabelText(vNode)).toBe(label);
  });

  it('returns "" if there is no aria-label', function () {
    var vNode = new axe.SerialVirtualNode({ nodeName: 'div' });
    expect(aria.arialabelText(vNode)).toBe('');
  });

  it('looks up the node in the flat tree', function () {
    var label = 'harambe';
    var node = document.createElement('div');
    node.setAttribute('aria-label', label);

    axe.utils.getFlattenedTree(node);
    expect(aria.arialabelText(node)).toBe(label);
  });

  it('returns "" if the node is not an element', function () {
    var node = document.createTextNode('my text node');
    expect(aria.arialabelText(node)).toBe('');
  });
});
