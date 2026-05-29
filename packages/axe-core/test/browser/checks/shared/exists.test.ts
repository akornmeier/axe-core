import { describe, it, expect } from 'vitest';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

const audit = createSyntheticAudit(['exists']);

describe('exists', () => {
  it('should return undefined', () => {
    expect(audit.checks['exists'].evaluate()).toBeUndefined();
  });
});
