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
describe('RuleResult', function () {
  var RuleResult = axe._thisWillBeDeletedDoNotUse.base.RuleResult;

  it('should be a function', function () {
    expect(typeof RuleResult).toBe('function');
  });

  it('should have an empty array for nodes', function () {
    expect(new RuleResult({ id: 'monkeys' }).nodes).toEqual([]);
  });

  it('should grab id from passed in rule', function () {
    var result = new RuleResult({ id: 'monkeys' });
    expect(result.id).toBe('monkeys');
  });
});
