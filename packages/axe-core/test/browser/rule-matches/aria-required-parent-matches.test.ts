import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe, queryFixture } from '@helpers/check-helpers';

describe('aria-required-parent-matches', function () {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });

  let rule;

  beforeEach(function () {
    rule = axe.utils.getRule('aria-required-parent');
  });

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should return true for a role that requires parent', function () {
    const vNode = queryFixture('<div id="target" role="listitem"></div>');
    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('should return false for a role that does not require parent', function () {
    const vNode = queryFixture('<div id="target" role="alert"></div>');
    expect(rule.matches(null, vNode)).toBe(false);
  });
});
