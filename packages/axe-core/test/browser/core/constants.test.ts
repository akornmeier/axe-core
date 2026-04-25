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
describe('axe.constants', function () {
  it('should create an object', function () {
    expect(typeof axe.constants === 'object' && axe.constants !== null).toBe(
      true
    );
  });

  it('should have a results array', function () {
    expect(Array.isArray(axe.constants.results)).toBe(true);
  });

  it('should have PASS', function () {
    expect(axe.constants.PASS).toBe('passed');
  });

  it('should have FAIL', function () {
    expect(axe.constants.FAIL).toBe('failed');
  });

  it('should have NA', function () {
    expect(axe.constants.NA).toBe('inapplicable');
  });

  it('should have CANTTELL', function () {
    expect(axe.constants.CANTTELL).toBe('cantTell');
  });

  it('should have priorities for results', function () {
    expect(axe.constants.NA_PRIO).toBe(0);
  });

  it('should have groups for results', function () {
    expect(axe.constants.FAIL_GROUP).toBe('violations');
  });

  it('should have a gridSize', function () {
    expect(axe.constants.gridSize).toBe(200);
  });

  it('should have a selectorSimilarFilterLimit', function () {
    expect(axe.constants.selectorSimilarFilterLimit).toBe(700);
  });

  it('has a serializableErrorProps array', function () {
    expect(Array.isArray(axe.constants.serializableErrorProps)).toBe(true);
    axe.constants.serializableErrorProps.forEach(prop => {
      expect(typeof prop).toBe('string');
    });
  });
});
