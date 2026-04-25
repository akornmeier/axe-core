import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import parseTabindex from '../../../../lib/core/utils/parse-tabindex';

describe('parseTabindex', function () {
  it('should return 0 for "0"', function () {
    expect(parseTabindex('0')).toBe(0);
  });

  it('should return 1 for "+1"', function () {
    expect(parseTabindex('+1')).toBe(1);
  });

  it('should return -1 for "-1"', function () {
    expect(parseTabindex('-1')).toBe(-1);
  });

  it('should return null for null', function () {
    expect(parseTabindex(null)).toBe(null);
  });

  it('should return null for an empty string', function () {
    expect(parseTabindex('')).toBe(null);
  });

  it('should return null for a whitespace string', function () {
    expect(parseTabindex('   ')).toBe(null);
  });

  it('should return null for non-numeric strings', function () {
    expect(parseTabindex('abc')).toBe(null);
  });

  it('should return the first valid digit(s) for decimal numbers', function () {
    expect(parseTabindex('2.5')).toBe(2);
  });

  it('should return 123 for "123abc"', function () {
    expect(parseTabindex('123abc')).toBe(123);
  });
});
