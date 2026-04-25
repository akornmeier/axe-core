import { describe, expect, it } from 'vitest';

describe('index', function () {
  it('should redefine `define`', function () {
    expect(typeof define).toBe('undefined');
  });
  it('should redefine `require`', function () {
    expect(typeof require).toBe('undefined');
  });
});
