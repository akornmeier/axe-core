import { checkSetup, getCheckEvaluateESM } from '@helpers/check-helpers';
import ariaLabelEvaluate from '@checks/shared/aria-label-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const ariaLabelEvaluateESM = getCheckEvaluateESM(ariaLabelEvaluate);
describe('aria-label', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if an aria-label is present', () => {
    const checkArgs = checkSetup('<div id="target" aria-label="woohoo"></div>');
    expect(ariaLabelEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return false if an aria-label is not present', () => {
    const checkArgs = checkSetup('<div id="target"></div>');
    expect(ariaLabelEvaluateESM.apply(null, checkArgs)).toBe(false);
  });

  it('should return false if an aria-label is present, but empty', () => {
    const checkArgs = checkSetup('<div id="target" aria-label=" "></div>');
    expect(ariaLabelEvaluateESM.apply(null, checkArgs)).toBe(false);
  });

  it('should collapse whitespace', () => {
    const checkArgs = checkSetup(
      '<div id="target" aria-label=" \t \n \r \t  \t\r\n "></div>'
    );
    expect(ariaLabelEvaluateESM.apply(null, checkArgs)).toBe(false);
  });
});
