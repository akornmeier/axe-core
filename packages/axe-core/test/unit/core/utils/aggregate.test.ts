import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import aggregate from '../../../../lib/core/utils/aggregate';

describe('aggregate', function () {
  const map = ['youngling', 'padawan', 'knight', 'master', 'grand master'];

  const values = ['knight', 'master', 'padawan'];

  it('takes a map, values array and initial value', function () {
    assert.isFunction(aggregate);
    expect(aggregate).toHaveLength(3);

    assert.doesNotThrow(function () {
      aggregate(map, values, 'youngling');
    });
  });

  it('does not change the values array', function () {
    const copy = [].concat(values);
    aggregate(map, values, 'youngling');
    expect(values).toEqual(copy);
  });

  it('picks the value with the highest index in the map, from the list of values', function () {
    const result = aggregate(map, ['knight', 'master', 'youngling']);
    expect(result).toBe('master');
  });

  it('considers the initial value in addition to the other values', function () {
    const result = aggregate(
      map,
      ['knight', 'master', 'youngling'],
      'grand master'
    );
    expect(result).toBe('grand master');
  });

  it('ignores values not on the map', function () {
    const result = aggregate(map, ['bounty hunter', 'sith lord'], 'youngling');
    expect(result).toBe('youngling');
  });

  it('returns undefined if no value was found', function () {
    expect(aggregate(map, ['smugler', 'droid'])).toBeUndefined();
  });
});
