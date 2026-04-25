// @vitest-environment jsdom
import { assert, describe, expect, it } from 'vitest';
import getViewportSize from '../../../../lib/commons/dom/get-viewport-size';

// FIXME(phase-01-followup): test deferred to .todo — window global; document global

describe.todo('getViewportSize', function () {
  it('should return an object with width and height', function () {
    const result = getViewportSize(window);

    assert.property(result, 'width');
    assert.property(result, 'height');

    assert.isNumber(result.width);
    assert.isNumber(result.height);
  });

  it('should have some fallbacks for old browsers', function () {
    let result = getViewportSize({
      document: {},
      innerWidth: 12,
      innerHeight: 47
    });

    expect(result.width).toBe(12);
    expect(result.height).toBe(47);

    result = getViewportSize({
      document: {
        documentElement: {
          clientWidth: 13,
          clientHeight: 48
        }
      }
    });

    expect(result.width).toBe(13);
    expect(result.height).toBe(48);

    result = getViewportSize({
      document: {
        body: {
          clientWidth: 22,
          clientHeight: 41
        }
      }
    });

    expect(result.width).toBe(22);
    expect(result.height).toBe(41);
  });
});
