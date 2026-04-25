import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe, queryFixture } from '@helpers/check-helpers';

describe('aria-required-children-matches', function () {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });

  let rule;

  beforeEach(function () {
    rule = axe.utils.getRule('aria-required-children');
  });

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should return true for a role that requires children', function () {
    const vNode = queryFixture('<div id="target" role="list"></div>');
    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('should return false for a role that does not require children', function () {
    const vNode = queryFixture('<div id="target" role="alert"></div>');
    expect(rule.matches(null, vNode)).toBe(false);
  });
});
