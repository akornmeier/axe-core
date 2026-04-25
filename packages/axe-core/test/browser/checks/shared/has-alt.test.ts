import { checkSetup, getCheckEvaluate } from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('has-alt', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if an alt is present', () => {
    var checkArgs = checkSetup('<img id="target" alt="woohoo" />');
    expect(getCheckEvaluate('has-alt').apply(null, checkArgs)).toBe(true);
  });

  it('should return true if an empty alt is present', () => {
    var checkArgs = checkSetup('<img id="target" alt="" />');
    expect(getCheckEvaluate('has-alt').apply(null, checkArgs)).toBe(true);
  });

  it('should return true if a null alt is present', () => {
    var checkArgs = checkSetup('<img id="target" alt />');
    expect(getCheckEvaluate('has-alt').apply(null, checkArgs)).toBe(true);
  });

  it('should return false if an alt is not present', () => {
    var checkArgs = checkSetup('<img id="target" />');
    expect(getCheckEvaluate('has-alt').apply(null, checkArgs)).toBe(false);
  });
});
