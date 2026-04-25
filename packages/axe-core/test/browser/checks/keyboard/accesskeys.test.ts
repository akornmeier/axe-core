// Pilot migration of `test/checks/keyboard/accesskeys.js` (the 4 evaluator
// cases — the legacy file's `describe('after')` block exercises the
// `checks.accesskeys.after` reducer which lives behind a private global,
// not on `axe.*`. The reducer is covered separately in Sprint 2.).
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.2.
// TODO(Sprint 3 task #10): import the evaluator directly from lib/.
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkSetup,
  createMockCheckContext,
  getCheckEvaluate
} from '../../_helpers/check-helpers';

describe('accesskeys', () => {
  const checkContext = createMockCheckContext();
  const checkEvaluate = getCheckEvaluate('accesskeys');

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true and record accesskey', () => {
    const params = checkSetup('<div id="target" accesskey="A"></div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toBe('A');
    expect(checkContext._relatedNodes).toHaveLength(1);
    expect(checkContext._relatedNodes[0]).toBe(params[0]);
  });

  it('ignores hidden nodes', () => {
    const params = checkSetup(
      '<div id="target" accesskey="A" style="display: none"></div>'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toBeNull();
  });
});
