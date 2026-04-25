import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import ariaLevelEvaluate from '@checks/aria/aria-level-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const ariaLevelEvaluateESM = getCheckEvaluateESM(ariaLevelEvaluate);
describe('aria-prohibited-attr', () => {
  var checkContext = createMockCheckContext();
  var checkEvaluate = ariaLevelEvaluateESM;

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
