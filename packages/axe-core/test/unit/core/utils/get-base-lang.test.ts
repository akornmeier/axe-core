import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import getBaseLang from '../../../../lib/core/utils/get-base-lang';

describe('getBaseLang', function () {
  it('returns base lang as peanut for argument peanut-BUTTER', function () {
    const actual = getBaseLang('peanut-BUTTER');
    expect(actual).toBe('peanut');
  });

  it('returns base lang as fr for argument FR-CA', function () {
    const actual = getBaseLang('FR-CA');
    expect(actual).toBe('fr');
  });

  it('returns base lang which is the prefix string before the first - (hyphen)', function () {
    const actual = getBaseLang('en-GB');
    expect(actual).toBe('en');
  });

  it('returns primary language subtag as base lang for multi hyphenated argument', function () {
    const actual = getBaseLang('SOME-random-lang');
    expect(actual).toBe('some');
  });

  it('returns an empty string when argument is null or undefined', function () {
    const actualNull = getBaseLang(null);
    const actualUndefined = getBaseLang(undefined);
    const actualEmpty = getBaseLang();
    expect(actualNull).toBe('');
    expect(actualUndefined).toBe('');
    expect(actualEmpty).toBe('');
  });
});
