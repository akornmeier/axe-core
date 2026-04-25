import { getCheckEvaluate } from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    var node = fixture.querySelector('td');

    expect(getCheckEvaluate('scope-value')(node)).toBe(true);
  });

  it('should return true if scope is "row"', () => {
    fixture.innerHTML = '<table><tr><td scope="row"></td></tr></table>';
    var node = fixture.querySelector('td');

    expect(getCheckEvaluate('scope-value')(node)).toBe(true);
  });

  it('should return false otherwise', () => {
    fixture.innerHTML =
      '<table><tr><td scope="hahahahanothx"></td></tr></table>';
    var node = fixture.querySelector('td');

    expect(getCheckEvaluate('scope-value')(node)).toBe(false);
  });

  it('should support options.values', () => {
    fixture.innerHTML =
      '<table><tr><td scope="hahahahanothx"></td></tr></table>';
    var node = fixture.querySelector('td');

    expect(
      getCheckEvaluate('scope-value')(node, {
        values: ['hahahahanothx']
      })
    ).toBe(true);
  });
});
