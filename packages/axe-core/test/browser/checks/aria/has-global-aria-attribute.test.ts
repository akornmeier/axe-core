import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('has-global-aria-attribute', () => {
  const checkContext = createMockCheckContext();
  const hasGlobalAriaAttribute = getCheckEvaluate('has-global-aria-attribute');

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
