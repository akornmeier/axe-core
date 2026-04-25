describe('axe.utils.toArray', function () {
  'use strict';
  it('should call Array.prototype.slice', function () {
    let orig = Array.prototype.slice,
      called = false,
      arrayLike = { 0: 'cats', length: 1 };

    Array.prototype.slice = function () {
      called = true;
      assert.equal(this, arrayLike);
    };

    axe.utils.toArray(arrayLike);

    assert.isTrue(called);

    Array.prototype.slice = orig;
  });

  it('should return an array', function () {
    const arrayLike = { 0: 'cats', length: 1 };

    const result = axe.utils.toArray(arrayLike);
    assert.isArray(result);
  });
});

describe('axe.utils.uniqueArray', function () {
  'use strict';

  it('should filter duplicate values', function () {
    const array1 = [1, 2, 3, 4, 5];
    const array2 = [1, 3, 7];

    const result = axe.utils.uniqueArray(array1, array2);
    assert.isArray(result);
    assert.includeMembers(result, [1, 2, 3, 4, 5, 7]);
  });
});
