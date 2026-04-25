import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('is-element-focusable', () => {
  const checkContext = createMockCheckContext();
  const isFocusable = getCheckEvaluate('is-element-focusable');

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
