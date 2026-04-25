import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import deepMerge from '../../../../lib/core/utils/deep-merge';

describe('utils.deepMerge', function () {
  it('should merge two objects', function () {
    const obj1 = { a: 'one' };
    const obj2 = { b: 'two' };

    expect(deepMerge(obj1, obj2)).toEqual({
      a: 'one',
      b: 'two'
    });
  });

  it('should not modify the objects', function () {
    const obj1 = { a: 'one' };
    const obj2 = { a: 'two' };
    deepMerge(obj1, obj2);

    expect(obj1).toEqual({ a: 'one' });
    expect(obj2).toEqual({ a: 'two' });
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

    expect(deepMerge(obj1, obj2)).toEqual({ a: ['three'] });
  });

  it('should merge nested objects', function () {
    const obj1 = { a: { a: ['one'] } };
    const obj2 = { a: { a: ['one', 'two'], b: 'three' } };

    expect(deepMerge(obj1, obj2)).toEqual({
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

    expect(deepMerge(obj1, obj2, obj3)).toEqual({
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
    expect(obj).toEqual({ a: 'b' });
  });
});
