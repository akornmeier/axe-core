describe('utils.deepMerge', function () {
  const deepMerge = axe.utils.deepMerge;

  it('should merge two objects', function () {
    const obj1 = { a: 'one' };
    const obj2 = { b: 'two' };

    assert.deepEqual(deepMerge(obj1, obj2), {
      a: 'one',
      b: 'two'
    });
  });

  it('should not modify the objects', function () {
    const obj1 = { a: 'one' };
    const obj2 = { a: 'two' };
    deepMerge(obj1, obj2);

    assert.deepEqual(obj1, { a: 'one' });
    assert.deepEqual(obj2, { a: 'two' });
  });

  it('should return a new object', function () {
    const obj1 = { a: 'one' };
    const obj2 = { a: 'two' };
    const obj3 = deepMerge(obj1, obj2);

    assert.notStrictEqual(obj1, obj3);
    assert.notStrictEqual(obj2, obj3);
  });

  it('should not merge arrays', function () {
    const obj1 = { a: ['one', 'two'] };
    const obj2 = { a: ['three'] };

    assert.deepEqual(deepMerge(obj1, obj2), { a: ['three'] });
  });

  it('should merge nested objects', function () {
    const obj1 = { a: { a: ['one'] } };
    const obj2 = { a: { a: ['one', 'two'], b: 'three' } };

    assert.deepEqual(deepMerge(obj1, obj2), {
      a: {
        a: ['one', 'two'],
        b: 'three'
      }
    });
  });

  it('should accept multiple objects', function () {
    const obj1 = { a: { a: ['one'] } };
    const obj2 = { a: { a: ['one', 'two'], b: 'three' } };
    const obj3 = { a: { b: 'four' }, b: 'five' };

    assert.deepEqual(deepMerge(obj1, obj2, obj3), {
      a: {
        a: ['one', 'two'],
        b: 'four'
      },
      b: 'five'
    });
  });

  it('should handle bad sources', function () {
    let obj;

    assert.doesNotThrow(function () {
      obj = deepMerge(null, undefined, true, 'one', ['a', 'b'], 1, { a: 'b' });
    });
    assert.deepEqual(obj, { a: 'b' });
  });
});
