import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import ariaLevelEvaluate from '@checks/aria/aria-level-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const ariaLevelEvaluateESM = getCheckEvaluateESM(ariaLevelEvaluate);
describe('aria-prohibited-attr', () => {
  const checkContext = createMockCheckContext();
  const checkEvaluate = ariaLevelEvaluateESM;

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true if aria-level is less than 6', () => {
    const params = checkSetup('<div id="target" aria-level="2">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if aria-level is 6', () => {
    const params = checkSetup('<div id="target" aria-level="6">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if aria-level is negative', () => {
    const params = checkSetup(
      '<div id="target" aria-level="-2">Contents</div>'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if there is no aria-level', () => {
    const params = checkSetup('<div id="target">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return undefined if aria-level is greater than 6', () => {
    const params = checkSetup('<div id="target" aria-level="8">Contents</div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBeUndefined();
  });
});
