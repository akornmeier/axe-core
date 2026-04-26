import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import hasGlobalAriaAttributeEvaluate from '@checks/aria/has-global-aria-attribute-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const hasGlobalAriaAttributeEvaluateESM = getCheckEvaluateESM(
  hasGlobalAriaAttributeEvaluate
);
describe('has-global-aria-attribute', () => {
  const checkContext = createMockCheckContext();
  const hasGlobalAriaAttribute = hasGlobalAriaAttributeEvaluateESM;

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true if any global ARIA attributes are found', () => {
    const params = checkSetup('<div aria-label="hello" id="target"></div>');
    expect(hasGlobalAriaAttribute.apply(checkContext, params as any)).toBe(
      true
    );
  });

  it('should return false if no valid ARIA attributes are found', () => {
    const params = checkSetup('<div aria-random="hello" id="target"></div>');
    expect(hasGlobalAriaAttribute.apply(checkContext, params as any)).toBe(
      false
    );
  });
});
