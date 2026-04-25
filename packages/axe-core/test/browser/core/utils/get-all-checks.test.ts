import { axe } from '@helpers/check-helpers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
describe('axe.utils.getAllChecks', function () {
  it('should be a function', function () {
    expect(typeof axe.utils.getAllChecks).toBe('function');
  });

  it('should concatenate all 3 check collections', function () {
    var r = {
      any: ['any:foo', 'any:bar'],
      all: ['all:foo', 'all:bar'],
      none: ['none:foo', 'none:bar']
    };
    expect(axe.utils.getAllChecks(r)).toEqual([
      'any:foo',
      'any:bar',
      'all:foo',
      'all:bar',
      'none:foo',
      'none:bar'
    ]);
  });

  it('should safely ignore missing collections - all', function () {
    var r = {
      any: ['any:foo', 'any:bar'],
      none: ['none:foo', 'none:bar']
    };
    expect(axe.utils.getAllChecks(r)).toEqual([
      'any:foo',
      'any:bar',
      'none:foo',
      'none:bar'
    ]);
  });

  it('should safely ignore missing collections - any', function () {
    var r = {
      all: ['all:foo', 'all:bar'],
      none: ['none:foo', 'none:bar']
    };
    expect(axe.utils.getAllChecks(r)).toEqual([
      'all:foo',
      'all:bar',
      'none:foo',
      'none:bar'
    ]);
  });

  it('should safely ignore missing collections - none', function () {
    var r = {
      any: ['any:foo', 'any:bar'],
      all: ['all:foo', 'all:bar']
    };
    expect(axe.utils.getAllChecks(r)).toEqual([
      'any:foo',
      'any:bar',
      'all:foo',
      'all:bar'
    ]);
  });
});
