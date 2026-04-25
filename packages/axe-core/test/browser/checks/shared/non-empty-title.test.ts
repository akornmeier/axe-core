import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('non-empty-title', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkEvaluate = getCheckEvaluate('non-empty-title');
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if a title is present', () => {
    var params = checkSetup('<img id="target" title="woohoo" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if a title is not present', () => {
    var params = checkSetup('<img id="target" />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noAttr');
  });

  it('should return false if a title is present, but empty', () => {
    var params = checkSetup('<img id="target" title=" " />');

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });

  it('should collapse whitespace', () => {
    var params = checkSetup(
      '<img id="target" title=" \t \n \r \t  \t\r\n " />'
    );

    expect(checkEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyAttr');
  });
});
