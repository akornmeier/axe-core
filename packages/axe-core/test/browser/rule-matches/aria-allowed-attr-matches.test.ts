import { axe, queryFixture } from '@helpers/check-helpers';
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
describe('aria-allowed-attr-matches', function () {
  let rule;

  beforeEach(function () {
    rule = axe.utils.getRule('aria-allowed-attr');
  });

  it('is a function', function () {
    expect(typeof rule.matches).toBe('function');
  });

  it('should return true on elements that have aria attributes', function () {
    const vNode = queryFixture(
      '<div role="button" id="target" aria-label="Thing 1" aria-mccheddarton="Unsupported thing 2"></div>'
    );

    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('should return false on elements that have no aria attributes', function () {
    const vNode = queryFixture('<div role="button" id="target"></div>');

    expect(rule.matches(null, vNode)).toBe(false);
  });
});
