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
  var map = ['youngling', 'padawan', 'knight', 'master', 'grand master'];

  var values = ['knight', 'master', 'padawan'];

  it('takes a map, values array and initial value', function () {
    assert.isFunction(aggregate);
    expect(aggregate).toHaveLength(3);

    assert.doesNotThrow(function () {
      aggregate(map, values, 'youngling');
    });
  });

  it('does not change the values array', function () {
    var copy = [].concat(values);
    aggregate(map, values, 'youngling');
    expect(values).toEqual(copy);
  });

  it('picks the value with the highest index in the map, from the list of values', function () {
    var result = aggregate(map, ['knight', 'master', 'youngling']);
    expect(result).toBe('master');
  });

  it('considers the initial value in addition to the other values', function () {
    var result = aggregate(
      map,
      ['knight', 'master', 'youngling'],
      'grand master'
    );
    expect(result).toBe('grand master');
  });

  it('ignores values not on the map', function () {
    var result = aggregate(map, ['bounty hunter', 'sith lord'], 'youngling');
    expect(result).toBe('youngling');
  });

  it('returns undefined if no value was found', function () {
    expect(aggregate(map, ['smugler', 'droid'])).toBeUndefined();
  });
});
