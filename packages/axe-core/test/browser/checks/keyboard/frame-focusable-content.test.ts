import { queryFixture, getCheckEvaluate } from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('frame-focusable-content tests', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const frameFocusableContent = getCheckEvaluate('frame-focusable-content');

  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if element has no focusable content', () => {
    const vNode = queryFixture('<div id="target"><span>Hello</span></div>');
    expect(frameFocusableContent(null, null, vNode)).toBe(true);
  });

  it('should return true if element is empty', () => {
    const vNode = queryFixture('<div id="target"></div>');
    expect(frameFocusableContent(null, null, vNode)).toBe(true);
  });

  it('should return true if element only has text content', () => {
    const vNode = queryFixture('<div id="target">Hello</div>');
    expect(frameFocusableContent(null, null, vNode)).toBe(true);
  });

  it('should return false if element has focusable content', () => {
    const vNode = queryFixture(
      '<div id="target"><span tabindex="0">Hello</span></div>'
    );
    expect(frameFocusableContent(null, null, vNode)).toBe(false);
  });

  it('should return false if element has natively focusable content', () => {
    const vNode = queryFixture(
      '<div id="target"><a href="foo.html">Hello</a></div>'
    );
    expect(frameFocusableContent(null, null, vNode)).toBe(false);
  });

  it('should return true if element is natively focusable but has tabindex=-1', () => {
    const vNode = queryFixture(
      '<div id="target"><button tabindex="-1">Hello</button></div>'
    );
    expect(frameFocusableContent(null, null, vNode)).toBe(true);
  });

  it('should return false if element is natively focusable but has tabindex=0', () => {
    const vNode = queryFixture(
      '<div id="target"><button tabindex="0">Hello</button></div>'
    );
    expect(frameFocusableContent(null, null, vNode)).toBe(false);
  });
});
