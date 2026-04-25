import { assert, describe, expect, it } from 'vitest';
import log from '../../../lib/core/log';

describe('log', function () {
  it('should be a function', function () {
    assert.isFunction(log);
  });
  it('should invoke console.log', function () {
    const orig = console.log;
    const expected = ['hi', 'hello'];
    let success = false;

    console.log = function (...args: unknown[]) {
      success = true;
      expect(args[0]).toBe(expected[0]);
      expect(args[1]).toBe(expected[1]);
    };

    log(...expected);
    expect(success).toBe(true);

    console.log = orig;
  });
});
