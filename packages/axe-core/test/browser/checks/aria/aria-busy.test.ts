// Pilot migration of `test/checks/aria/aria-busy.js` (all 3 cases).
//
// Simple DOM-only check, no computed-style dependency. Picked as a
// counterweight to color-contrast — it exercises the same evaluator-
// invocation path and therefore proves the migration pattern works for
// small checks without having to debug rendering.
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.2.
// TODO(Sprint 3 task #10): import the evaluator directly from lib/.
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkSetup,
  createMockCheckContext,
  getCheckEvaluate
} from '../../_helpers/check-helpers';

describe('aria-busy', () => {
  const checkContext = createMockCheckContext();
  const checkEvaluate = getCheckEvaluate('aria-busy');

  afterEach(() => {
    checkContext.reset();
  });

  it('should return false if no aria-busy tag on element', () => {
    const params = checkSetup('<div id="target" role="list"></div>');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return false if aria-busy is set to false', () => {
    const params = checkSetup(
      '<div id="target" role="list" aria-busy="false"></div>'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return true if aria-busy is set to true', () => {
    const params = checkSetup(
      '<div id="target" role="list" aria-busy="true"></div>'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });
});
