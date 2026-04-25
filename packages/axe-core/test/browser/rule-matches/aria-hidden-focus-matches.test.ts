// Pilot migration of `test/rule-matches/aria-hidden-focus-matches.js`
// (2 of 5 cases — pass + nested-fail).
//
// Refs specs/PRD-03-test-infrastructure-modernization.md §2.3.2.
// TODO(Sprint 3 task #10): import rule.matches directly from lib/.
import { beforeEach, describe, expect, it } from 'vitest';
import { axe, queryFixture } from '../_helpers/check-helpers';

describe('aria-hidden-focus-matches', () => {
  let rule: { matches: (node: unknown) => boolean };

  beforeEach(() => {
    rule = (
      axe as unknown as { utils: { getRule: (id: string) => any } }
    ).utils.getRule('aria-hidden-focus');
  });

  it('returns true when there is no parent with aria-hidden', () => {
    const vNode = queryFixture('<div id="target"></div>');
    expect(
      rule.matches((vNode as { actualNode: HTMLElement }).actualNode)
    ).toBe(true);
  });

  it('returns false when nested inside aria-hidden ancestors', () => {
    const vNode = queryFixture(
      '<div aria-hidden="true">' +
        '<div aria-hidden="true">' +
        '<button id="target">btn</button>' +
        '</div>' +
        '</div>'
    );
    expect(
      rule.matches((vNode as { actualNode: HTMLElement }).actualNode)
    ).toBe(false);
  });
});
