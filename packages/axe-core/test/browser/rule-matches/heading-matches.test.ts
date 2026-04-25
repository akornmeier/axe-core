// Pilot migration of `test/rule-matches/heading-matches.js` (3 of 8 cases).
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.2.
// TODO(Sprint 3 task #10): import rule.matches directly from lib/.
import { beforeEach, describe, expect, it } from 'vitest';
import { axe, queryFixture } from '@helpers/check-helpers';

describe('heading-matches', () => {
  let rule: { matches: (node: unknown, vNode: unknown) => boolean };

  beforeEach(() => {
    rule = (
      axe as unknown as { utils: { getRule: (id: string) => any } }
    ).utils.getRule('empty-heading');
  });

  it('is a function', () => {
    expect(typeof rule.matches).toBe('function');
  });

  it('should return true on regular headings without roles', () => {
    for (let i = 1; i <= 6; i++) {
      const vNode = queryFixture(`<h${i} id="target"></h${i}>`);
      expect(rule.matches(null, vNode)).toBe(true);
    }
  });

  it('should return false on headings with their role changed', () => {
    const vNode = queryFixture('<h1 role="banner" id="target"></h1>');
    expect(rule.matches(null, vNode)).toBe(false);
  });
});
