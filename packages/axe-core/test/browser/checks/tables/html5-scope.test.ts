import { getCheckEvaluate } from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

    expect(getCheckEvaluate('html5-scope')(node)).toBe(true);
  });

  it('should return false on TDs', () => {
    fixture.innerHTML = '<table><tr><td scope="col"></td></tr></table>';
    const node = fixture.querySelector('td');

    expect(getCheckEvaluate('html5-scope')(node)).toBe(false);
  });

  it('should return true on non-HTML5 documents', () => {
    const origPublicId = document.publicId;
    fixture.innerHTML = '<table><tr><th scope="col"></th></tr></table>';
    const node = fixture.querySelector('th');

    expect(getCheckEvaluate('html5-scope')(node)).toBe(true);
    document.publicId = origPublicId;
  });
});
