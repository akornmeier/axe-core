import { describe, expect, it } from 'vitest';
import hasUnicode from '../../../../lib/commons/text/has-unicode';
import removeUnicode from '../../../../lib/commons/text/remove-unicode';

describe('hasUnicode', () => {
  describe('hasUnicode, characters of type Non Bi Multilingual Plane', () => {
    it('returns false when given string is alphanumeric', () => {
      const actual = hasUnicode('1 apple', {
        nonBmp: true
      });
      expect(actual).toBe(false);
    });

    it('returns false when given string is number', () => {
      const actual = hasUnicode('100', {
        nonBmp: true
      });
      expect(actual).toBe(false);
    });

    it('returns false when given string is a sentence', () => {
      const actual = hasUnicode('Earth is round', {
        nonBmp: true
      });
      expect(actual).toBe(false);
    });

    it('returns true when given string is a phonetic extension', () => {
      const actual = hasUnicode('ᴁ', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string is a combining diacritical marks supplement', () => {
      const actual = hasUnicode('ᴁ', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string is a currency symbols', () => {
      const actual = hasUnicode('₨ 20000', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string has arrows', () => {
      const actual = hasUnicode('← turn left', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string has geometric shapes', () => {
      const actual = hasUnicode('◓', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string has math operators', () => {
      const actual = hasUnicode('√4 = 2', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string has windings font', () => {
      const actual = hasUnicode('▽', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true for a string with characters in supplementary private use area A', () => {
      const actual = hasUnicode('\uDB80\uDFFE', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string has format unicode', () => {
      // zero-width spacer character U+200B
      const actual = hasUnicode('\u200BHello World', {
        nonBmp: true
      });
      expect(actual).toBe(true);
    });
  });

  describe('hasUnicode, characters of type Emoji', () => {
    it('returns false when given string is alphanumeric', () => {
      const actual = hasUnicode('1 apple a day, keeps the doctor away', {
        emoji: true
      });
      expect(actual).toBe(false);
    });

    it('returns false when given string is number', () => {
      const actual = hasUnicode('100', {
        emoji: true
      });
      expect(actual).toBe(false);
    });

    it('returns false when given string is a sentence', () => {
      const actual = hasUnicode('Earth is round', {
        emoji: true
      });
      expect(actual).toBe(false);
    });

    it('returns true when given string has emoji', () => {
      const actual = hasUnicode('🌎 is round', {
        emoji: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given string has emoji', () => {
      const actual = hasUnicode('plant a 🌱', {
        emoji: true
      });
      expect(actual).toBe(true);
    });
  });

  describe('hasUnicode, characters of type punctuations', () => {
    it('returns false when given string is number', () => {
      const actual = hasUnicode('100', {
        punctuations: true
      });
      expect(actual).toBe(false);
    });

    it('returns false when given string is a sentence', () => {
      const actual = hasUnicode('Earth is round', {
        punctuations: true
      });
      expect(actual).toBe(false);
    });

    it('returns true when given string has punctuations', () => {
      const actual = hasUnicode("What's your name?", {
        punctuations: true
      });
      expect(actual).toBe(true);
    });

    it('returns true for strings with money signs and odd symbols', () => {
      ['£', '¢', '¥', '€', '§', '±'].forEach(function (str) {
        const actual = hasUnicode(str, {
          punctuations: true
        });
        expect(actual).toBe(true);
      });
    });
  });

  describe('hasUnicode, has combination of unicode', () => {
    it('returns false when given string is number', () => {
      const actual = hasUnicode('100', {
        emoji: true,
        nonBmp: true,
        punctuations: true
      });
      expect(actual).toBe(false);
    });

    it('returns true when given string has unicode characters', () => {
      const actual = hasUnicode('The ☀️ is orange, the ◓ is white.', {
        emoji: true,
        nonBmp: true,
        punctuations: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given format unicode characters', () => {
      // zero-width spacer character U+200B
      const actual = hasUnicode('\u200BHello World', {
        emoji: true,
        nonBmp: true,
        punctuations: true
      });
      expect(actual).toBe(true);
    });

    it('returns true when given punctuation characters', () => {
      const actual = hasUnicode('Earth!!!', {
        emoji: true,
        nonBmp: true,
        punctuations: true
      });
      expect(actual).toBe(true);
    });
  });
});

describe('removeUnicode', () => {
  it('returns string by removing non BMP unicode', () => {
    const actual = removeUnicode('₨₨20000₨₨', {
      nonBmp: true
    });
    expect(actual).toBe('20000');
  });

  it('returns string by removing emoji unicode', () => {
    const actual = removeUnicode('☀️Sun 🌎Earth', {
      emoji: true
    });
    expect(actual).toBe('Sun Earth');
  });

  it('returns string after removing punctuations from word', () => {
    const actual = removeUnicode('Earth!!!', {
      punctuations: true
    });
    expect(actual).toBe('Earth');
  });

  it('returns string removing all punctuations', () => {
    const actual = removeUnicode('<!,."\':;!>', {
      punctuations: true
    });
    expect(actual).toBe('');
  });

  it('returns string removing all private use unicode', () => {
    const actual = removeUnicode('', {
      nonBmp: true
    });
    expect(actual).toBe('');
  });

  it('returns string removing all supplementary private use unicode', () => {
    const actual = removeUnicode('󰀀󿰀󿿽󰏽', {
      nonBmp: true
    });
    expect(actual).toBe('');
  });

  it('returns the string with supplementary private use area A characters removed', () => {
    const actual = removeUnicode('\uDB80\uDFFE', {
      nonBmp: true
    });
    expect(actual).toBe('');
  });

  it('returns string removing combination of unicode characters', () => {
    const actual = removeUnicode('The ☀️ is orange, the ◓ is white.', {
      emoji: true,
      nonBmp: true,
      punctuations: true
    });
    expect(actual).toBe('The  is orange the  is white');
  });

  it('returns string removing format unicode', () => {
    // zero-width spacer character U+200B
    const actual = removeUnicode('\u200BHello World', {
      nonBmp: true
    });
    expect(actual).toBe('Hello World');
  });
});
