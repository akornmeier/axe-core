import { describe, expect, it } from 'vitest';
import { axe } from '@helpers/check-helpers';

describe('axe.utils.getNodeAttributes', function () {
  it('should return the list of attributes', function () {
    const node = document.createElement('div');
    node.setAttribute('class', 'foo bar');
    const actual = axe.utils.getNodeAttributes(node);
    expect(actual instanceof window.NamedNodeMap).toBe(true);
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('class');
  });

  it('should return the list of attributes when the DOM is clobbered', function () {
    const node = document.createElement('form');
    node.setAttribute('id', '123');
    node.innerHTML = '<select name="attributes"></select>';

    // eslint-disable-next-line no-restricted-syntax
    expect(node.attributes instanceof window.NamedNodeMap).toBe(false);

    const actual = axe.utils.getNodeAttributes(node);
    expect(actual instanceof window.NamedNodeMap).toBe(true);
    expect(actual.length).toBe(1);
    expect(actual[0].name).toBe('id');
  });
});
