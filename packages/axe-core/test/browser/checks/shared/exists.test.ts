import { checks } from '../../_helpers/check-helpers';
import { describe, it, expect } from 'vitest';
describe('exists', () => {
  it('should return undefined', () => {
    expect(checks.exists.evaluate()).toBeUndefined();
  });
});
