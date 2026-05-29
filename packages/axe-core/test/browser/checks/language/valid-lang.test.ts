import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import validLangEvaluate from '@checks/language/valid-lang-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const validLangEvaluateESM = getCheckEvaluateESM(validLangEvaluate, {
  attributes: ['lang', 'xml:lang']
});
describe('valid-lang', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();
  const validLangEvaluate = validLangEvaluateESM;

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if a lang attribute is present in options', () => {
    const params = checkSetup('<div id="target" lang="woohoo">text</div>', {
      value: ['blah', 'blah', 'woohoo']
    });

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should lowercase options and attribute first', () => {
    const params = checkSetup('<div id="target" lang="wooHOo">text</div>', {
      value: ['blah', 'blah', 'wOohoo']
    });

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return true if a lang attribute is not present in options', () => {
    const params = checkSetup('<div id="target" lang="FOO">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual(['lang="FOO"']);
  });

  it('should return false (and not throw) when given no present in options', () => {
    const params = checkSetup('<div id="target" lang="en">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return true if the language is badly formatted', () => {
    const params = checkSetup('<div id="target" lang="en_US">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual(['lang="en_US"']);
  });

  it('should return false if it matches a substring proceeded by -', () => {
    const params = checkSetup('<div id="target" lang="en-LOL">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should work with xml:lang', () => {
    const params = checkSetup('<div id="target" xml:lang="en-LOL">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should accept options.attributes', () => {
    const params = checkSetup(
      '<div id="target" custom-lang="en_US">text</div>',
      {
        attributes: ['custom-lang']
      }
    );

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual(['custom-lang="en_US"']);
  });

  it('should return true if lang value is just whitespace', () => {
    const params = checkSetup('<div id="target" lang="  ">text</div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return false if a lang attribute element has no content', () => {
    const params = checkSetup('<div id="target" lang="FOO"></div>');

    expect(validLangEvaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data).toEqual(null);
  });
});
