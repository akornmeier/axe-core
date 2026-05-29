import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import attrNonSpaceContentEvaluate from '@checks/generic/attr-non-space-content-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const nonEmptyValueEvaluateESM = getCheckEvaluateESM(
  attrNonSpaceContentEvaluate,
  { attribute: 'value' }
);
describe('non-empty-value', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = nonEmptyValueEvaluateESM;
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if an value is present', () => {
    const params = checkSetup('<input id="target" value="woohoo" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if an value is not present', () => {
    const params = checkSetup('<input id="target" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noAttr');
  });

  it('should return false if an value is present, but empty', () => {
    const params = checkSetup('<input id="target" value=" " />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });

  it('should collapse whitespace', () => {
    const params = checkSetup(
      '<input id="target" value=" \t \n \r \t  \t\r\n " />'
    );

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });
});
