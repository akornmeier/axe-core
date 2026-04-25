import { describe, expect, it } from 'vitest';
import isHumanInterpretable from '../../../../lib/commons/text/is-human-interpretable';

describe('isHumanInterpretable', function () {
  it('returns 0 when given string is empty', function () {
    const actual = isHumanInterpretable('');
    expect(actual).toBe(0);
  });

  it('returns 0 when given string is a single alpha character', function () {
    const singleCharacterExamples = ['i', 'x', 'X', '×', ''];
    singleCharacterExamples.forEach(function (characterExample) {
      const actual = isHumanInterpretable(characterExample);
      expect(actual).toBe(0);
    });
  });

  it('returns 0 when given string is in the symbolic text characters set (blocklist)', function () {
    const blocklistedSymbols = ['aA', 'Aa', 'abc', 'ABC'];
    blocklistedSymbols.forEach(function (symbolicText) {
      const actual = isHumanInterpretable(symbolicText);
      expect(actual).toBe(0);
    });
  });

  it('returns 0 when given string is only punctuations', function () {
    const actual = isHumanInterpretable('?!!!,.');
    expect(actual).toBe(0);
  });

  it('returns 1 when given string that has a number', function () {
    const actual = isHumanInterpretable('7');
    expect(actual).toBe(1);
  });

  it('returns 1 when given string has emoji as a part of the sentence', function () {
    const actual = isHumanInterpretable('I like 🏀');
    expect(actual).toBe(1);
  });

  it('returns 1 when given string has non BMP character (eg: windings font) as part of the sentence', function () {
    const actual = isHumanInterpretable('I ✂ my hair');
    expect(actual).toBe(1);
  });

  it('returns 1 when given string has both non BMP character, and emoji as part of the sentence', function () {
    const actual = isHumanInterpretable('I ✂ my hair, and I like 🏀');
    expect(actual).toBe(1);
  });

  it('returns 0 when given string has only emoji', function () {
    const actual = isHumanInterpretable('🏀🍔🍉🎅');
    expect(actual).toBe(0);
  });

  it('returns 0 when given string has only non BNP characters', function () {
    const actual = isHumanInterpretable('⌛👓');
    expect(actual).toBe(0);
  });

  it('returns 0 when given string has combination of only non BNP characters and emojis', function () {
    const actual = isHumanInterpretable('⌛👓🏀🍔🍉🎅');
    expect(actual).toBe(0);
  });

  it('returns 1 when given string is a punctuated sentence', function () {
    const actual = isHumanInterpretable(
      "I like football, but I prefer basketball; although I can't play either very well."
    );
    expect(actual).toBe(1);
  });

  it('returns 1 for a sentence without emoji or punctuations', function () {
    const actual = isHumanInterpretable('Earth is round');
    expect(actual).toBe(1);
  });
});
