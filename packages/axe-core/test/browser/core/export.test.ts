import { describe, expect, it } from 'vitest';
import { axe } from '@helpers/check-helpers';

describe('export', function () {
  it('should publish a global `axe` variable', function () {
    expect(window.axe).toBeDefined();
  });
  it('should define version', function () {
    expect(axe.version).not.toBeNull();
  });
});
