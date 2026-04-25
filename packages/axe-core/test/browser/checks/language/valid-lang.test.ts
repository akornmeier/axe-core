import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('valid-lang', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
  var validLangEvaluate = getCheckEvaluate('valid-lang');

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if a lang attribute is present in options', () => {
    var params = checkSetup('<div id="target" lang="woohoo">text</div>', {
      value: ['blah', 'blah', 'woohoo']
    });

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should lowercase options and attribute first', () => {
    var params = checkSetup('<div id="target" lang="wooHOo">text</div>', {
      value: ['blah', 'blah', 'wOohoo']
    });

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return true if a lang attribute is not present in options', () => {
    var params = checkSetup('<div id="target" lang="FOO">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual(['lang="FOO"']);
  });

  it('should return false (and not throw) when given no present in options', () => {
    var params = checkSetup('<div id="target" lang="en">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return true if the language is badly formatted', () => {
    var params = checkSetup('<div id="target" lang="en_US">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual(['lang="en_US"']);
  });

  it('should return false if it matches a substring proceeded by -', () => {
    var params = checkSetup('<div id="target" lang="en-LOL">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should work with xml:lang', () => {
    var params = checkSetup('<div id="target" xml:lang="en-LOL">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should accept options.attributes', () => {
    var params = checkSetup('<div id="target" custom-lang="en_US">text</div>', {
      attributes: ['custom-lang']
    });

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual(['custom-lang="en_US"']);
  });

  it('should return true if lang value is just whitespace', () => {
    var params = checkSetup('<div id="target" lang="  ">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if a lang attribute element has no content', () => {
    var params = checkSetup('<div id="target" lang="FOO"></div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data).toEqual(null);
  });
});
