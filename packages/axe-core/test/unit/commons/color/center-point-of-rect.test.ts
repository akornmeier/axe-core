// @vitest-environment jsdom
import { assert, describe, expect, it } from 'vitest';
import centerPointOfRect from '../../../../lib/commons/color/center-point-of-rect';

// FIXME(phase-01-followup): test deferred to .todo — window global

describe.todo('centerPointOfRect', function () {
  it('returns `undefined` when element is placed outside of viewport (left position > window dimension)', function () {
    var actual = centerPointOfRect({
      left: 9999,
      top: 0,
      width: 200,
      height: 100
    });
    expect(actual).toBeUndefined();
  });

  it('returns `{x,y}` when element is with in viewport', function () {
    var actual = centerPointOfRect({
      left: 0,
      top: 0,
      width: 200,
      height: 100
    });
    expect(actual).toBeDefined();
    assert.hasAllKeys(actual, ['x', 'y']);
  });

  it('returns `{x,y}` when element is with in viewport (check returned coordinate values)', function () {
    var actual = centerPointOfRect({
      left: 100,
      top: 100,
      width: 250,
      height: 250
    });

    expect(actual).toBeDefined();
    assert.hasAllKeys(actual, ['x', 'y']);
    expect(actual.x).toBe(225);
    expect(actual.y).toBe(225);
  });
});
