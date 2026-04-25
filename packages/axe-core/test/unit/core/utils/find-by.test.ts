import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import findBy from '../../../../lib/core/utils/find-by';

describe('findBy', function () {
  it('should find the first matching object', function () {
    var array = [
      {
        id: 'monkeys',
        foo: 'bar'
      },
      {
        id: 'bananas'
      },
      {
        id: 'monkeys',
        bar: 'baz'
      }
    ];

    expect(findBy(array, 'id', 'monkeys')).toBe(array[0]);
  });

  it('should return undefined with no match', function () {
    var array = [
      {
        id: 'monkeys',
        foo: 'bar'
      },
      {
        id: 'bananas'
      },
      {
        id: 'monkeys',
        bar: 'baz'
      }
    ];

    expect(findBy(array, 'id', 'macaque')).toBeUndefined();
  });

  it('should not throw if passed falsey first parameter', function () {
    expect(findBy(null, 'id', 'macaque')).toBeUndefined();
  });

  it('ignores any non-object elements in the array', function () {
    const obj = {
      id: 'monkeys',
      foo: 'bar'
    };
    const array = ['bananas', true, null, 123, obj];

    expect(findBy(array, 'id', 'monkeys')).toBe(obj);
  });

  it('only looks at owned properties', function () {
    const obj1 = { id: 'monkeys', eat: 'bananas' };
    const obj2 = Object.create(obj1);
    obj2.id = 'gorillas';
    expect(findBy([obj2, obj1], 'eat', 'bananas')).toBe(obj1);
  });
});
