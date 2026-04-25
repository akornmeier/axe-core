import { beforeEach, describe, expect, it } from 'vitest';
import { axe, queryFixture } from '@helpers/check-helpers';

describe('aria-allowed-role-matches', function () {
  let rule;

  beforeEach(function () {
    rule = axe.utils.getRule('aria-allowed-role');
  });

  it('return false (no matches) for a <link> with a href to have any invalid role', function () {
    const vNode = queryFixture(
      '<link id="target" href="/example.com" role="invalid-role"></link>'
    );
    expect(rule.matches(null, vNode)).toBe(false);
  });

  it('return true for input with redundant role', function () {
    const vNode = queryFixture(
      '<input id="target" type="text" role="textbox"/>'
    );
    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('return true for element with valid role', function () {
    const vNode = queryFixture('<ol id="target" role="listbox"/>');
    expect(rule.matches(null, vNode)).toBe(true);
  });
});
