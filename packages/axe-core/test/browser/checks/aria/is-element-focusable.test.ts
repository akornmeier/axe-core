import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import isElementFocusableEvaluate from '@checks/aria/is-element-focusable-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const isElementFocusableEvaluateESM = getCheckEvaluateESM(
  isElementFocusableEvaluate
);
describe('is-element-focusable', () => {
  const checkContext = createMockCheckContext();
  const isFocusable = isElementFocusableEvaluateESM;

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true for div with a tabindex', () => {
    const params = checkSetup('<div tabIndex="1" id="target"></div>');
    expect(isFocusable.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false for natively unfocusable element', () => {
    const params = checkSetup('<span role="link" href="#" id="target"></span>');
    expect(isFocusable.apply(checkContext, params as any)).toBe(false);
  });
});
