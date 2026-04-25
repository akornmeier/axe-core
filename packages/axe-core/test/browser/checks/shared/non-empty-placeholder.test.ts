import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('non-empty-placeholder', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkEvaluate = getCheckEvaluate('non-empty-placeholder');
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if a placeholder is present', () => {
    var params = checkSetup('<input id="target" placeholder="woohoo" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if a placeholder is not present', () => {
    var params = checkSetup('<input id="target" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noAttr');
  });

  it('should return false if a placeholder is present, but empty', () => {
    var params = checkSetup('<input id="target" placeholder=" " />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });

  it('should collapse whitespace', () => {
    var params = checkSetup(
      '<input id="target" placeholder=" \t \n \r \t  \t\r\n " />'
    );

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });
});
