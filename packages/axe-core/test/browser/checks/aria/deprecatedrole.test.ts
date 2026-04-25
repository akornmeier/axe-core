import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('deprecatedrole', () => {
  var checkContext = createMockCheckContext();
  var checkEvaluate = getCheckEvaluate('deprecatedrole');
  afterEach(() => {
    checkContext.reset();
    axe.reset();
  });

  it('returns true if applied to a deprecated role', () => {
    axe.configure({
      standards: {
        ariaRoles: {
          melon: {
            type: 'widget',
            deprecated: true
          }
        }
      }
    });
    var params = checkSetup('<div id="target" role="melon">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual('melon');
  });

  it('returns true if applied to a deprecated DPUB role', () => {
    axe.configure({
      standards: {
        ariaRoles: {
          'doc-fizzbuzz': {
            type: 'widget',
            deprecated: true
          }
        }
      }
    });
    var params = checkSetup(
      '<div id="target" role="doc-fizzbuzz">Contents</div>'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual('doc-fizzbuzz');
  });

  it('returns false if applied to a non-deprecated role', () => {
    var params = checkSetup('<div id="target" role="button">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data).toBeNull();

    var params = checkSetup('<button id="target">Contents</button>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('returns false if applied to an invalid role', () => {
    var params = checkSetup('<input id="target" role="foo">');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  describe('with fallback roles', () => {
    it('returns true if the deprecated role is the first valid role', () => {
      axe.configure({
        standards: {
          ariaRoles: {
            melon: {
              type: 'widget',
              deprecated: true
            }
          }
        }
      });
      var params = checkSetup(
        '<div id="target" role="foo widget melon button">Contents</div>'
      );
      expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
      expect(checkContext._data).toEqual('melon');
    });

    it('returns false if the deprecated role is not the first valid role', () => {
      axe.configure({
        standards: {
          ariaRoles: {
            melon: {
              type: 'widget',
              deprecated: true
            }
          }
        }
      });
      var params = checkSetup(
        '<div id="target" role="button melon widget">Contents</div>'
      );
      expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
      expect(checkContext._data).toBeNull();
    });
  });
});
