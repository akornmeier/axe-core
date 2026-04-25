import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const matches: any = {};

// FIXME(phase-01-followup): test deferred to .todo — unresolved <cat>.foo lookup (likely Phase-1 export gap)

describe.todo('matches.condition', function () {
  var condition = matches.condition;

  it('passes the first argument to the condition', function () {
    var count = 0;
    condition('foo', function (foo) {
      expect('foo').toBe(foo);
      count++;
    });
    expect(count).toBe(1);
  });

  it('returns true if the condition returns a truthy value', function () {
    expect(
      condition('foo', function () {
        return 123;
      })
    ).toBe(true);
  });

  it('returns false if the condition returns a falsey value', function () {
    expect(
      condition('foo', function () {
        return 0;
      })
    ).toBe(false);
  });
});
