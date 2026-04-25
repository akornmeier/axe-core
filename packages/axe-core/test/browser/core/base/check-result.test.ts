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
describe('CheckResult', function () {
  var CheckResult = axe._thisWillBeDeletedDoNotUse.base.CheckResult;
  it('should be a function', function () {
    expect(typeof CheckResult).toBe('function');
  });

  it('should have an id', function () {
    var result = new CheckResult({ id: 'monkeys' });
    expect(result.id).toBe('monkeys');
  });

  it('should set `data` to `null`', function () {
    var result = new CheckResult({});
    expect(result.data).toBeNull();
  });

  it('should set `relatedNodes` to `[]`', function () {
    var result = new CheckResult({});
    expect(result.relatedNodes).toEqual([]);
  });

  it('should set `result` to `null`', function () {
    var result = new CheckResult({});
    expect(result.result).toBeNull();
  });
});
