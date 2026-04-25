import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('aria-prohibited-attr', () => {
  var checkContext = createMockCheckContext();
  var checkEvaluate = getCheckEvaluate('aria-level');

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true if aria-level is less than 6', () => {
    var params = checkSetup('<div id="target" aria-level="2">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if aria-level is 6', () => {
    var params = checkSetup('<div id="target" aria-level="6">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if aria-level is negative', () => {
    var params = checkSetup('<div id="target" aria-level="-2">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if there is no aria-level', () => {
    var params = checkSetup('<div id="target">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return undefined if aria-level is greater than 6', () => {
    var params = checkSetup('<div id="target" aria-level="8">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBeUndefined();
  });
});
