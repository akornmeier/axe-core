import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import ariaRoledescriptionEvaluate from '@checks/aria/aria-roledescription-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const ariaRoledescriptionEvaluateESM = getCheckEvaluateESM(
  ariaRoledescriptionEvaluate,
  {
    supportedRoles: [
      'button',
      'img',
      'checkbox',
      'radio',
      'combobox',
      'menuitemcheckbox',
      'menuitemradio'
    ]
  }
);
describe('aria-roledescription', () => {
  const checkContext = createMockCheckContext();
  afterEach(() => {
    checkContext.reset();
  });

  it('returns true for elements with an implicit supported role', () => {
    const vNode = queryFixture(
      '<button aria-roledescription="Awesome Button" id="target">Click</button>'
    );
    const actual = ariaRoledescriptionEvaluateESM.call(
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
    const vNode = queryFixture(
      '<div role="radio" aria-roledescription="Awesome Radio" id="target">Click</div>'
    );
    const actual = ariaRoledescriptionEvaluateESM.call(
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
    const vNode = queryFixture(
      '<div role="main" aria-roledescription="Awesome Main" id="target">The main element</div>'
    );
    const actual = ariaRoledescriptionEvaluateESM.call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(undefined);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false for elements without role', () => {
    const vNode = queryFixture(
      '<div aria-roledescription="Awesome Main" id="target">The main element</div>'
    );
    const actual = ariaRoledescriptionEvaluateESM.call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(false);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false for elements with role=presentation', () => {
    const vNode = queryFixture(
      '<div role="presentation" aria-roledescription="Awesome Main" id="target">The main element</div>'
    );
    const actual = ariaRoledescriptionEvaluateESM.call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(false);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false for elements with role=none', () => {
    const vNode = queryFixture(
      '<div role="none" aria-roledescription="Awesome Main" id="target">The main element</div>'
    );

    const actual = ariaRoledescriptionEvaluateESM.call(
      checkContext,
      null,
      {},
      vNode
    );
    expect(actual).toBe(false);
    expect(checkContext._data, null).toBeNull();
  });
});
