import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('has-lang', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
  var hasLangEvaluate = getCheckEvaluate('has-lang');

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if a lang attribute is present', () => {
    var params = checkSetup('<div id="target" lang="woohoo"></div>');

    expect(hasLangEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if only `xml:lang` attribute is present', () => {
    var params = checkSetup('<div id="target" xml:lang="cats"></div>');

    expect(hasLangEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noXHTML');
  });

  it('should return true if both `lang` and `xml:lang` attribute is present', () => {
    var params = checkSetup(
      '<div id="target" lang="cats" xml:lang="cats"></div>'
    );

    expect(hasLangEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if xml:lang and lang attributes are not present', () => {
    var params = checkSetup('<div id="target"></div>');

    expect(hasLangEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noLang');
  });

  it('should return false if lang is left empty', () => {
    var params = checkSetup('<div id="target" lang=""></div>');

    expect(hasLangEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noLang');
  });

  it('should support options.attributes', () => {
    var params = checkSetup('<div id="target" foo="cats"></div>', {
      attributes: ['foo']
    });

    expect(hasLangEvaluate.apply(checkContext, params as any)).toBe(true);
  });
});
