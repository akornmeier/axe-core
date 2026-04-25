import {
  createMockCheckContext,
  checkSetup,
  checks,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
describe('focusable-modal-open', () => {
  var check;
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
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
    var params = checkSetup(
      '<div id="target" aria-hidden="true">' +
        '<button>Some button</button>' +
        '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns undefined if a modal is open', () => {
    var params = checkSetup(
      '<div id="target" aria-hidden="true">' +
        '<button>Some button</button>' +
        '</div>' +
        '<div role="dialog">Modal</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBeUndefined();
  });

  it('sets the tabbable elements as related nodes', () => {
    var params = checkSetup(
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
