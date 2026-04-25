import { describe, expect, it } from 'vitest';
import { axe, queryFixture } from '@helpers/check-helpers';

/* global axe */
describe('axe.utils.isHtmlElement', function () {
  const isHtmlElement = axe.utils.isHtmlElement;

  it('returns true if given ul', function () {
    const node = document.createElement('ul');
    expect(isHtmlElement(node)).toBe(true);
  });

  it('returns true if given nav', function () {
    const node = document.createElement('nav');
    expect(isHtmlElement(node)).toBe(true);
  });

  it('returns true if given iframe', function () {
    const node = document.createElement('iframe');
    expect(isHtmlElement(node)).toBe(true);
  });

  it('returns false if given custom element', function () {
    const node = document.createElement('myElement');
    expect(isHtmlElement(node)).toBe(false);
  });

  it('returns false if given svg namespace', function () {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    expect(isHtmlElement(node)).toBe(false);
  });

  it('returns false if node has inherited svg namespace', function () {
    const svgNameSpace = 'http://www.w3.org/2000/svg';
    const node = document.createElementNS(svgNameSpace, 'svg');
    const child = document.createElementNS(svgNameSpace, 'a');
    child.setAttribute('href', '');
    child.textContent = 'Child Node';
    node.appendChild(child);

    const childNode = node.querySelector('a');
    expect(isHtmlElement(childNode)).toBe(false);
  });

  it('works with VirtualNodes', function () {
    const vNode = queryFixture('<ul id="target"></ul>');
    expect(isHtmlElement(vNode)).toBe(true);
  });

  it('works with SerialVirtualNode', function () {
    const vNode = new axe.SerialVirtualNode({ nodeName: 'ul' });
    expect(isHtmlElement(vNode)).toBe(true);
  });
});
