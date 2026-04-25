import { checkSetup, getCheckEvaluateESM } from '@helpers/check-helpers';
import hasAltEvaluate from '@checks/shared/has-alt-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const hasAltEvaluateESM = getCheckEvaluateESM(hasAltEvaluate);
describe('has-alt', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if an alt is present', () => {
    const checkArgs = checkSetup('<img id="target" alt="woohoo" />');
    expect(hasAltEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return true if an empty alt is present', () => {
    const checkArgs = checkSetup('<img id="target" alt="" />');
    expect(hasAltEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return true if a null alt is present', () => {
    const checkArgs = checkSetup('<img id="target" alt />');
    expect(hasAltEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return false if an alt is not present', () => {
    const checkArgs = checkSetup('<img id="target" />');
    expect(hasAltEvaluateESM.apply(null, checkArgs)).toBe(false);
  });
});
