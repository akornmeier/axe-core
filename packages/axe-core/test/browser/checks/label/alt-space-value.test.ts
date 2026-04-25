import {
  createMockCheckContext,
  checkSetup,
  checks
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('alt-space-value', () => {
  const checkContext = createMockCheckContext();
  const check = checks['alt-space-value'];

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true if alt contains a space character', () => {
    const params = checkSetup('<img id="target" alt=" " />');
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if alt contains a non-breaking space character', () => {
    const params = checkSetup('<img id="target" alt="&nbsp;" />');
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if alt attribute is empty', () => {
    const params = checkSetup('<img id="target" alt="" />');
    expect(check.evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return false if alt attribute has a proper text value', () => {
    const params = checkSetup('<img id="target" alt="text content" />');
    expect(check.evaluate.apply(checkContext, params as any)).toBe(false);
  });
});
