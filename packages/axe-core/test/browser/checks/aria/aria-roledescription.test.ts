import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('aria-roledescription', () => {
  var checkContext = createMockCheckContext();
  afterEach(() => {
    checkContext.reset();
  });

  it('returns true for elements with an implicit supported role', () => {
    var vNode = queryFixture(
      '<button aria-roledescription="Awesome Button" id="target">Click</button>'
    );
    var actual = getCheckEvaluate('aria-roledescription').call(
      checkContext,
      null,
      {
        supportedRoles: ['button']
      },
      vNode
    );
    expect(actual).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns true for elements with an explicit supported role', () => {
    var vNode = queryFixture(
      '<div role="radio" aria-roledescription="Awesome Radio" id="target">Click</div>'
    );
    var actual = getCheckEvaluate('aria-roledescription').call(
      checkContext,
      null,
      {
        supportedRoles: ['radio']
      },
      vNode
    );
    expect(actual).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns undefined for elements with an unsupported role', () => {
    var vNode = queryFixture(
      '<div role="main" aria-roledescription="Awesome Main" id="target">The main element</div>'
    );
    var actual = getCheckEvaluate('aria-roledescription').call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(undefined);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false for elements without role', () => {
    var vNode = queryFixture(
      '<div aria-roledescription="Awesome Main" id="target">The main element</div>'
    );
    var actual = getCheckEvaluate('aria-roledescription').call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(false);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false for elements with role=presentation', () => {
    var vNode = queryFixture(
      '<div role="presentation" aria-roledescription="Awesome Main" id="target">The main element</div>'
    );
    var actual = getCheckEvaluate('aria-roledescription').call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(false);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false for elements with role=none', () => {
    var vNode = queryFixture(
      '<div role="none" aria-roledescription="Awesome Main" id="target">The main element</div>'
    );

    var actual = getCheckEvaluate('aria-roledescription').call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(false);
    expect(checkContext._data, null).toBeNull();
  });
});
