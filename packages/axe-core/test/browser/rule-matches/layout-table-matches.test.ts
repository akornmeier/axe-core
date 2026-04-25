import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe, flatTreeSetup } from '@helpers/check-helpers';

describe('layout-table-matches', function () {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });

  let rule;

  beforeEach(function () {
    axe.configure({
      rules: [
        {
          id: 'layout-rule',
          matches: 'layout-table-matches'
        }
      ]
    });

    rule = axe.utils.getRule('layout-rule');
  });

  afterEach(function () {
    fixture.innerHTML = '';
    axe.reset();
  });

  it('should return false for data table', function () {
    fixture.innerHTML = '<table><caption>Hello></caption></table>';
    flatTreeSetup(fixture);
    const node = fixture.firstChild;

    expect(rule.matches(node)).toBe(false);
  });

  it('should return false if the table is focusable', function () {
    fixture.innerHTML = '<table tabindex="0"></table>';
    flatTreeSetup(fixture);
    const node = fixture.firstChild;

    expect(rule.matches(node)).toBe(false);
  });

  it('should return true if table has role=presentation', function () {
    fixture.innerHTML = '<table role="presentation"></table>';
    flatTreeSetup(fixture);
    const node = fixture.firstChild;

    expect(rule.matches(node)).toBe(true);
  });

  it('should return true if table has role=none', function () {
    fixture.innerHTML = '<table role="none"></table>';
    flatTreeSetup(fixture);
    const node = fixture.firstChild;

    expect(rule.matches(node)).toBe(true);
  });
});
