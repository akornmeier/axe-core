import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import tokenList from '../../../../lib/core/utils/token-list';

describe('tokenList', function () {
  it('should split by space', function () {
    expect(tokenList('bananas monkeys 42')).toEqual([
      'bananas',
      'monkeys',
      '42'
    ]);
  });

  it('should trim first', function () {
    expect(tokenList(' \r   bananas monkeys 42	\n  ')).toEqual([
      'bananas',
      'monkeys',
      '42'
    ]);
  });

  it('should collapse whitespace', function () {
    expect(tokenList(' \r   bananas \r \n	monkeys		42	\n  ')).toEqual([
      'bananas',
      'monkeys',
      '42'
    ]);
  });

  it('should return empty string array for null value', function () {
    expect(tokenList(null)).toEqual(['']);
  });
});
