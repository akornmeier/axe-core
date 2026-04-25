import { describe, expect, it } from 'vitest';
import isValidLang, {
  validLangs
} from '../../../../lib/core/utils/valid-langs';

describe('axe.utils.isValidLang', function () {
  describe('isValidLang', function () {
    it('should return true for valid 3-character lang', function () {
      expect(isValidLang('bbb')).toBe(true);
    });

    it('should return true for valid 2-character lang', function () {
      expect(isValidLang('aa')).toBe(true);
    });

    it('should return false for invalid lang', function () {
      expect(isValidLang('xyz')).toBe(false);
    });

    it('should return false for invalid 2-character lang', function () {
      expect(isValidLang('bb')).toBe(false);
    });

    it('should return false for invalid 1-character lang code', function () {
      expect(isValidLang('a')).toBe(false);
    });

    it('should return false for invalid 4-character lang code', function () {
      expect(isValidLang('abcd')).toBe(false);
    });

    it('should return false for empty string', function () {
      expect(isValidLang('')).toBe(false);
    });

    it('should return false for invalid lang code', function () {
      expect(isValidLang('123')).toBe(false);
    });
  });

  describe('validLangs', function () {
    it('should return an array of langs', function () {
      expect(Array.isArray(validLangs())).toBe(true);
    });

    it('should include valid langs', function () {
      const langs = validLangs();
      expect(langs.indexOf('aaa') !== -1).toBe(true);
      expect(langs.indexOf('aa') !== -1).toBe(true);
      expect(langs.indexOf('en') !== -1).toBe(true);
      expect(langs.indexOf('zzj') !== -1).toBe(true);
    });
  });
});
