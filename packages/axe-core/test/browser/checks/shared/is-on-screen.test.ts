import { queryFixture, getCheckEvaluate } from '@helpers/check-helpers';
import { describe, it, expect } from 'vitest';
describe('is-on-screen', () => {
  it('should return true for visible elements', () => {
    var vNode = queryFixture('<div id="target">elm</div>');

    expect(getCheckEvaluate('is-on-screen')(vNode)).toBe(true);
  });

  it('should return true for aria-hidden=true elements', () => {
    var vNode = queryFixture('<div id="target" aria-hidden="true">elm</div>');

    expect(getCheckEvaluate('is-on-screen')(vNode)).toBe(true);
  });

  it('should return false for display:none elements', () => {
    var vNode = queryFixture('<div id="target" style="display:none">elm</div>');

    expect(getCheckEvaluate('is-on-screen')(vNode)).toBe(false);
  });

  it('should return false for off screen elements', () => {
    var vNode = queryFixture(
      '<div id="target" style="position:absolute; top:-10000px">elm</div>'
    );

    expect(getCheckEvaluate('is-on-screen')(vNode)).toBe(false);
  });
});
