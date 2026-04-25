import { checkSetup, getCheckEvaluate } from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('aria-label', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if an aria-label is present', () => {
    var checkArgs = checkSetup('<div id="target" aria-label="woohoo"></div>');
    expect(getCheckEvaluate('aria-label').apply(null, checkArgs)).toBe(true);
  });

  it('should return false if an aria-label is not present', () => {
    var checkArgs = checkSetup('<div id="target"></div>');
    expect(getCheckEvaluate('aria-label').apply(null, checkArgs)).toBe(false);
  });

  it('should return false if an aria-label is present, but empty', () => {
    var checkArgs = checkSetup('<div id="target" aria-label=" "></div>');
    expect(getCheckEvaluate('aria-label').apply(null, checkArgs)).toBe(false);
  });

  it('should collapse whitespace', () => {
    var checkArgs = checkSetup(
      '<div id="target" aria-label=" \t \n \r \t  \t\r\n "></div>'
    );
    expect(getCheckEvaluate('aria-label').apply(null, checkArgs)).toBe(false);
  });
});
