import { assert, describe, expect, it } from 'vitest';
import toArray from '../../../../lib/core/utils/to-array';
import uniqueArray from '../../../../lib/core/utils/unique-array';

describe('toArray', function () {
  it('should call Array.prototype.slice', function () {
    const orig = Array.prototype.slice;
    const arrayLike = { 0: 'cats', length: 1 };
    let called = false;

    Array.prototype.slice = function () {
      called = true;
      expect(this).toBe(arrayLike);
    };

    toArray(arrayLike);

    expect(called).toBe(true);

    Array.prototype.slice = orig;
  });

  it('should return an array', function () {
    const arrayLike = { 0: 'cats', length: 1 };

    const result = toArray(arrayLike);
    assert.isArray(result);
  });
});

describe('axe.utils.uniqueArray', function () {
  it('should filter duplicate values', function () {
    const array1 = [1, 2, 3, 4, 5];
    const array2 = [1, 3, 7];

    const result = uniqueArray(array1, array2);
    assert.isArray(result);
    assert.includeMembers(result, [1, 2, 3, 4, 5, 7]);
  });
});
