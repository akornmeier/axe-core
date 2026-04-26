import { axe, fixtureSetup, queryFixture } from '@helpers/check-helpers';
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
describe('aria-has-attr-matches', function () {
  let rule;

  beforeEach(function () {
    rule = axe.utils.getRule('aria-valid-attr-value');
  });

  it('is a function', function () {
    expect(typeof rule.matches).toBe('function');
  });

  it('should return false if an element has no attributes', function () {
    const vNode = fixtureSetup('<div></div>');
    expect(rule.matches(null, vNode)).toBe(false);
  });

  it('should return false if an element has no ARIA attributes', function () {
    const vNode = queryFixture('<div id="target"></div>');
    expect(rule.matches(null, vNode)).toBe(false);
  });
  it('should return true if an element has ARIA attributes', function () {
    const vNode = queryFixture('<div id="target" aria-bats="monkeys"></div>');
    expect(rule.matches(null, vNode)).toBe(true);
  });
});
