// `aria-busy-evaluate.ts` is a pure-DOM check with no commons or core/utils
// imports, so we use the ESM-direct path (D1 in `_helpers/check-helpers.ts`).
import { afterEach, describe, expect, it } from 'vitest';
import ariaBusyEvaluate from '@checks/aria/aria-busy-evaluate';
import {
  checkSetup,
  createMockCheckContext,
  getCheckEvaluateESM
} from '@helpers/check-helpers';

describe('aria-busy', () => {
  const checkContext = createMockCheckContext();
  const checkEvaluate = getCheckEvaluateESM(ariaBusyEvaluate);

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
