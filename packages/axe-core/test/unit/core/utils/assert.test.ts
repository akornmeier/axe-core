import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import axeAssert from '../../../../lib/core/utils/assert';

describe('axeAssert', function () {
  it('does nothing when passed a truthy value', function () {
    assert.doesNotThrow(function () {
      axeAssert(true);
      axeAssert('foo');
      axeAssert(123);
      axeAssert([]);
      axeAssert({});
    });
  });

  it('throws an error when passed a falsey value', function () {
    expect(function () {
      axeAssert(false);
    }).toThrow();
    expect(function () {
      axeAssert(0);
    }).toThrow();
    expect(function () {
      axeAssert(null);
    }).toThrow();
    expect(function () {
      axeAssert(undefined);
    }).toThrow();
  });

  it('sets second argument as the error message', function () {
    var message = 'Something went wrong';
    try {
      axeAssert(false, message);
    } catch (e) {
      assert.instanceOf(e, Error);
      expect(e.message).toBe(message);
    }
  });
});
