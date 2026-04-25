import {
  createMockCheckContext,
  checkSetup,
  checks,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
describe('focusable-modal-open', () => {
  let check;
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();
  beforeAll(() => {
    check = checks['focusable-modal-open'];
  });

  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    axe._selectorData = undefined;
    checkContext.reset();
  });

  it('returns true when no modal is open', () => {
    const params = checkSetup(
      '<div id="target" aria-hidden="true">' +
        '<button>Some button</button>' +
        '</div>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns undefined if a modal is open', () => {
    const params = checkSetup(
      '<div id="target" aria-hidden="true">' +
        '<button>Some button</button>' +
        '</div>' +
        '<div role="dialog">Modal</div>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBeUndefined();
  });

  it('sets the tabbable elements as related nodes', () => {
    const params = checkSetup(
      '<div id="target" aria-hidden="true">' +
        '<button>Some button</button>' +
        '</div>' +
        '<div role="dialog">Modal</div>'
    );
    check.evaluate.apply(checkContext, params as any);
    expect(checkContext._relatedNodes).toHaveLength(1);
    expect(checkContext._relatedNodes).toEqual(
      Array.from(fixture.querySelectorAll('button'))
    );
  });
});
