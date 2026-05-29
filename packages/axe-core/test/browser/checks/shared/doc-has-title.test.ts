import { getCheckEvaluateESM } from '@helpers/check-helpers';
import docHasTitleEvaluate from '@checks/shared/doc-has-title-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const docHasTitleEvaluateESM = getCheckEvaluateESM(docHasTitleEvaluate);
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
    expect(docHasTitleEvaluateESM(fixture)).toBe(false);
    document.title = orig;
  });

  it('should return false if title contains only whitespace', () => {
    const orig = document.title;
    document.title = ' \t\r\n \n   \r \n\t';
    expect(docHasTitleEvaluateESM(fixture)).toBe(false);
    document.title = orig;
  });

  it('should return true if title is non-empty', () => {
    const orig = document.title;
    document.title = 'Bananas';

    expect(docHasTitleEvaluateESM(fixture)).toBe(true);
    document.title = orig;
  });
});
