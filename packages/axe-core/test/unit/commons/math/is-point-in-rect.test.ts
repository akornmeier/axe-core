// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isPointInRect } from '../../../../lib/commons/math/is-point-in-rect';

// jsdom does not implement DOMPoint, so we hand-roll {x,y} object literals.
// `isPointInRect` only reads `x` and `y` off its first argument (see signature).

describe('isPointInRect', () => {
  it('returns true when the point is inside the rect', () => {
    const rect = new DOMRect(10, 20, 10, 20);
    const point = { x: 15, y: 30 };
    expect(isPointInRect(point, rect)).toBe(true);
  });

  it('returns true when the point is on the edge', () => {
    const rect = new DOMRect(10, 20, 10, 20);
    expect(isPointInRect({ x: 10, y: 20 }, rect)).toBe(true);
    expect(isPointInRect({ x: 20, y: 40 }, rect)).toBe(true);
  });

  it('returns false when the point is vertically outside the rect', () => {
    const rect = new DOMRect(10, 20, 10, 20);
    const point = { x: 15, y: 50 };
    expect(isPointInRect(point, rect)).toBe(false);
  });

  it('returns false when the point is horizontally outside the rect', () => {
    const rect = new DOMRect(10, 20, 10, 20);
    const point = { x: 25, y: 30 };
    expect(isPointInRect(point, rect)).toBe(false);
  });
});
