import { axe } from '@helpers/check-helpers';
import { describe, it, expect } from 'vitest';
describe('axe.teardown', function () {
  it('should reset the tree', function () {
    axe._tree = 'foo';
    axe.teardown();
    expect(axe._tree).toBeUndefined();
  });

  it('should reset selector data', function () {
    axe._selectorData = 'foo';
    axe.teardown();
    expect(axe._selectorData).toBeUndefined();
  });

  it('should reset selector data', function () {
    axe._selectCache = 'foo';
    axe.teardown();
    expect(axe._selectCache).toBeUndefined();
  });

  it('should reset memozied functions', function () {
    const orgFn = axe._memoizedFns[0];
    let called = false;
    axe._memoizedFns[0] = {
      clear: function () {
        called = true;
      }
    };
    axe.teardown();
    expect(called).toBe(true);
    axe._memoizedFns[0] = orgFn;
  });

  it('should reset the cache', function () {
    const orgFn = axe._cache.clear;
    let called = false;
    axe._cache.clear = function () {
      called = true;
    };
    axe.teardown();
    expect(called).toBe(true);
    axe._cache.clear = orgFn;
  });
});
