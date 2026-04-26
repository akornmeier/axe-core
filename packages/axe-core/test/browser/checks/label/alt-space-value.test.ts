import { createMockCheckContext, checkSetup } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import { describe, it, expect, afterEach } from 'vitest';
const audit = createSyntheticAudit(['alt-space-value']);

describe('alt-space-value', () => {
  const checkContext = createMockCheckContext();
  const check = audit.checks['alt-space-value'];

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
