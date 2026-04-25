import { getCheckEvaluateESM } from '@helpers/check-helpers';
import scopeValueEvaluate from '@checks/tables/scope-value-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const scopeValueEvaluateESM = getCheckEvaluateESM(scopeValueEvaluate, {
  values: ['row', 'col', 'rowgroup', 'colgroup']
});
describe('scope-value', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if scope is "col"', () => {
    fixture.innerHTML = '<table><tr><td scope="col"></td></tr></table>';
    const node = fixture.querySelector('td');

    expect(scopeValueEvaluateESM(node)).toBe(true);
  });

  it('should return true if scope is "row"', () => {
    fixture.innerHTML = '<table><tr><td scope="row"></td></tr></table>';
    const node = fixture.querySelector('td');

    expect(scopeValueEvaluateESM(node)).toBe(true);
  });

  it('should return false otherwise', () => {
    fixture.innerHTML =
      '<table><tr><td scope="hahahahanothx"></td></tr></table>';
    const node = fixture.querySelector('td');

    expect(scopeValueEvaluateESM(node)).toBe(false);
  });

  it('should support options.values', () => {
    fixture.innerHTML =
      '<table><tr><td scope="hahahahanothx"></td></tr></table>';
    const node = fixture.querySelector('td');

    expect(
      scopeValueEvaluateESM(node, {
        values: ['hahahahanothx']
      })
    ).toBe(true);
  });
});
