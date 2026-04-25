import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '../../_helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('braille-label-equivalent tests', () => {
  const checkContext = createMockCheckContext();
  const checkEvaluate = getCheckEvaluate('braille-label-equivalent');

  afterEach(() => {
    checkContext.reset();
  });

  it('returns true without aria-braillelabel', () => {
    const params = checkSetup('<img id="target" alt="" />');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns true when aria-braillelabel is empty', () => {
    const params = checkSetup(
      '<img id="target" alt="" aria-braillelabel="" />'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns true when aria-braillelabel is whitespace-only', () => {
    const params = checkSetup(
      '<img id="target" alt="" aria-braillelabel=" \r\t\n " />'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  describe('when aria-braillelabel has text', () => {
    it('returns false when the accessible name is empty', () => {
      const params = checkSetup(`
        <img id="target" alt="" aria-braillelabel="foo" />
      `);
      expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    });

    it('returns false when the accessible name has only whitespace', () => {
      const params = checkSetup(`
        <img id="target" alt=" \r\t\n " aria-braillelabel="foo" />
      `);
      expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    });

    it('returns true when the accessible name is not empty', () => {
      const params = checkSetup(`
        <img id="target" alt="foo" aria-braillelabel="foo" />
      `);
      expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
    });
  });
});
