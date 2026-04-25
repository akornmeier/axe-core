import { getCheckEvaluate } from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('doc-has-title', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return false if title is empty', () => {
    const orig = document.title;
    document.title = '';
    expect(getCheckEvaluate('doc-has-title')(fixture)).toBe(false);
    document.title = orig;
  });

  it('should return false if title contains only whitespace', () => {
    const orig = document.title;
    document.title = ' \t\r\n \n   \r \n\t';
    expect(getCheckEvaluate('doc-has-title')(fixture)).toBe(false);
    document.title = orig;
  });

  it('should return true if title is non-empty', () => {
    const orig = document.title;
    document.title = 'Bananas';

    expect(getCheckEvaluate('doc-has-title')(fixture)).toBe(true);
    document.title = orig;
  });
});
