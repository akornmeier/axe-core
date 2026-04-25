// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getBoundingRect } from '../../../../lib/commons/math/get-bounding-rect';

describe('getBoundingRect', () => {
  it('returns a rect that bounds both rects', () => {
    const rectA = new DOMRect(10, 10, 5, 5);
    const rectB = new DOMRect(25, 25, 5, 5);
    const rectC = new DOMRect(10, 10, 20, 20);
    expect(getBoundingRect(rectA, rectB)).toEqual(rectC);
  });
});
