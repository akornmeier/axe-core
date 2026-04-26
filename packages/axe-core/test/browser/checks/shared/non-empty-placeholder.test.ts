import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import attrNonSpaceContentEvaluate from '@checks/generic/attr-non-space-content-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const nonEmptyPlaceholderEvaluateESM = getCheckEvaluateESM(
  attrNonSpaceContentEvaluate,
  { attribute: 'placeholder' }
);
describe('non-empty-placeholder', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = nonEmptyPlaceholderEvaluateESM;
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if a placeholder is present', () => {
    const params = checkSetup('<input id="target" placeholder="woohoo" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if a placeholder is not present', () => {
    const params = checkSetup('<input id="target" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noAttr');
  });

  it('should return false if a placeholder is present, but empty', () => {
    const params = checkSetup('<input id="target" placeholder=" " />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });

  it('should collapse whitespace', () => {
    const params = checkSetup(
      '<input id="target" placeholder=" \t \n \r \t  \t\r\n " />'
    );

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });
});
