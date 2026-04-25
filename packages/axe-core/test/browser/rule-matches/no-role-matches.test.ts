import { describe, expect, it } from 'vitest';
import { axe, queryFixture } from '@helpers/check-helpers';

describe('link-in-text-block-matches', () => {
  const rule = axe.utils.getRule('definition-list');

  it('should return true if element does not have a role attribute', () => {
    const vNode = queryFixture('<div id="target"></div>');
    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('should return true if element has an empty role attribute', () => {
    const vNode = queryFixture('<div role="" id="target"></div>');
    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('should return false if element has a role attribute', () => {
    const vNode = queryFixture('<div role="button" id="target"></div>');
    expect(rule.matches(null, vNode)).toBe(false);
  });
});
