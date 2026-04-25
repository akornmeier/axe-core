import { describe, expect, it } from 'vitest';
import memoize, { clearAllMemoized } from '../../../../lib/core/utils/memoize';

describe('memoize', function () {
  it('returns the same value for repeated calls with the same args', function () {
    let calls = 0;
    const square = memoize((n: number) => {
      calls++;
      return n * n;
    });

    expect(square(4)).toBe(16);
    expect(square(4)).toBe(16);
    expect(calls).toBe(1);
  });

  it('clears the cache for every memoized function via clearAllMemoized', function () {
    let calls = 0;
    const counter = memoize((label: string) => {
      calls++;
      return `${label}-${calls}`;
    });

    expect(counter('x')).toBe('x-1');
    expect(counter('x')).toBe('x-1');
    expect(calls).toBe(1);

    clearAllMemoized();

    expect(counter('x')).toBe('x-2');
    expect(calls).toBe(2);
  });

  it('does not throw when clearAllMemoized is called with no registered functions', function () {
    expect(() => clearAllMemoized()).not.toThrow();
  });
});
