import { getCheckEvaluateESM } from '@helpers/check-helpers';
import html5ScopeEvaluate from '@checks/tables/html5-scope-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const html5ScopeEvaluateESM = getCheckEvaluateESM(html5ScopeEvaluate);
describe('html5-scope', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true on THs', () => {
    fixture.innerHTML = '<table><tr><th scope="col"></th></tr></table>';
    const node = fixture.querySelector('th');

    expect(html5ScopeEvaluateESM(node)).toBe(true);
  });

  it('should return false on TDs', () => {
    fixture.innerHTML = '<table><tr><td scope="col"></td></tr></table>';
    const node = fixture.querySelector('td');

    expect(html5ScopeEvaluateESM(node)).toBe(false);
  });

  it('should return true on non-HTML5 documents', () => {
    const origPublicId = document.publicId;
    fixture.innerHTML = '<table><tr><th scope="col"></th></tr></table>';
    const node = fixture.querySelector('th');

    expect(html5ScopeEvaluateESM(node)).toBe(true);
    document.publicId = origPublicId;
  });
});
