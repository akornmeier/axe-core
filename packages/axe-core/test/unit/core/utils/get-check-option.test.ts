import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import getCheckOption from '../../../../lib/core/utils/get-check-option';

describe('getCheckOption', function () {
  it('should prefer options from rules', function () {
    expect(
      getCheckOption(
        {
          id: 'bananas',
          enabled: 'fail',
          options: 'fail'
        },
        'monkeys',
        {
          rules: {
            monkeys: {
              checks: {
                bananas: {
                  enabled: 'yes',
                  options: 'please'
                }
              }
            }
          },
          checks: {
            bananas: {
              enabled: 'nope',
              options: 'jerk'
            }
          }
        }
      )
    ).toEqual({
      enabled: 'yes',
      options: 'please',
      absolutePaths: undefined
    });
  });
  it('should fallback to global check options if not defined on the rule', function () {
    expect(
      getCheckOption(
        {
          id: 'bananas',
          enabled: 'fail',
          options: 'fail'
        },
        'monkeys',
        {
          rules: {
            monkeys: {
              checks: {
                bananas: {
                  enabled: 'yes'
                }
              }
            }
          },
          checks: {
            bananas: {
              enabled: 'nope',
              options: 'please'
            }
          }
        }
      )
    ).toEqual({
      enabled: 'yes',
      options: 'please',
      absolutePaths: undefined
    });
  });

  it('should prefer fallback to global check options if not defined on the rule', function () {
    expect(
      getCheckOption(
        {
          id: 'bananas',
          enabled: 'fail',
          options: 'fail'
        },
        'monkeys',
        {
          checks: {
            bananas: {
              enabled: 'yes',
              options: 'please'
            }
          }
        }
      )
    ).toEqual({
      enabled: 'yes',
      options: 'please',
      absolutePaths: undefined
    });
  });

  it('should otherwise use the check', function () {
    expect(
      getCheckOption(
        {
          id: 'bananas',
          enabled: 'yes',
          options: 'please'
        },
        'monkeys',
        {}
      )
    ).toEqual({
      enabled: 'yes',
      options: 'please',
      absolutePaths: undefined
    });
  });

  it('passes absolutePaths option along', function () {
    expect(
      getCheckOption(
        {
          id: 'bananas',
          enabled: 'on',
          options: 'many'
        },
        'monkeys',
        {
          absolutePaths: 'yep'
        }
      )
    ).toEqual({
      enabled: 'on',
      options: 'many',
      absolutePaths: 'yep'
    });
  });
});
