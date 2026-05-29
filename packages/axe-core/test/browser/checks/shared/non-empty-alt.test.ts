import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import attrNonSpaceContentEvaluate from '@checks/generic/attr-non-space-content-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const nonEmptyAltEvaluateESM = getCheckEvaluateESM(
  attrNonSpaceContentEvaluate,
  { attribute: 'alt' }
);
describe('non-empty-alt', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = nonEmptyAltEvaluateESM;
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if an alt is present', () => {
    const params = checkSetup('<img id="target" alt="woohoo" />');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if an alt is not present', () => {
    const params = checkSetup('<img id="target" />');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noAttr');
  });

  it('should return false if an alt is present, but empty', () => {
    const params = checkSetup('<img id="target" alt=" " />');
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });

  it('should collapse whitespace', () => {
    const params = checkSetup(
      '<img id="target" alt=" \t \n \r \t  \t\r\n " />'
    );
    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });
});
