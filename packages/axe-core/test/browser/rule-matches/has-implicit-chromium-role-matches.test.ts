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
describe('has-implicit-chromium-role-matches', function () {
  let rule;
  let fixture: HTMLElement;
  beforeEach(function () {
    fixture = document.getElementById('fixture') as HTMLElement;
    rule = axe.utils.getRule('presentation-role-conflict');
  });

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('is a function', function () {
    expect(typeof rule.matches).toBe('function');
  });

  it('matches elements with an implicit role', function () {
    const vNode = queryFixture('<main id="target"></main>');
    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('does not match elements with no implicit role', function () {
    const vNode = queryFixture('<div id="target"></div>');
    expect(rule.matches(null, vNode)).toBe(false);
  });

  it('matches elements with an implicit role in chromium', function () {
    const vNode = queryFixture('<svg id="target"></svg>');
    expect(rule.matches(null, vNode)).toBe(true);
  });

  it('does not match elements with no implicit role even if they are focusable and have an explicit role', function () {
    const vNode = queryFixture(
      '<div id="target" role="none" tabindex="1"></div>'
    );
    expect(rule.matches(null, vNode)).toBe(false);
  });
});
