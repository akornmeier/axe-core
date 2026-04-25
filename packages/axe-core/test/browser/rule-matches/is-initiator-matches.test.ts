import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from '@helpers/check-helpers';

describe('is-initiator-matches', function () {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });

  let rule;

  beforeEach(function () {
    rule = axe.utils.getRule('html-has-lang');
  });

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should return true if the context is the initiator', function () {
    expect(rule.matches(null, null, { initiator: true })).toBe(true);
  });

  it('should return false if the context is not the initiator', function () {
    expect(rule.matches(null, null, { initiator: false })).toBe(false);
  });
});
