import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import extendMetaData from '../../../../lib/core/utils/extend-meta-data';

describe('axe.utils.extend', function () {
  it('should merge properties', function () {
    var src = {
      cats: 'fail',
      dogs: 'fail'
    };

    extendMetaData(src, {
      cats: 'meow',
      dogs: 'woof'
    });
    expect(Object.keys(src).length).toBe(2);
    expect(src.cats).toBe('meow');
    expect(src.dogs).toBe('woof');
  });

  it('should execute any found functions', function () {
    var src = {
      cats: 'fail',
      dogs: 'fail'
    };
    extendMetaData(src, {
      cats: function (ctxt) {
        expect(ctxt).toBe(src);
        return 'meow';
      },
      dogs: 'woof'
    });
    expect(Object.keys(src).length).toBe(2);
    expect(src.cats).toBe('meow');
    expect(src.dogs).toBe('woof');
  });
  it('should catch exceptions in functions and default to `null`', function () {
    var src = {
      cats: 'fail',
      dogs: 'fail'
    };
    extendMetaData(src, {
      cats: function () {
        throw new Error('hehe');
      },
      dogs: 'woof'
    });
    expect(Object.keys(src).length).toBe(2);
    expect(src.cats).toBeNull();
    expect(src.dogs).toBe('woof');
  });
});
