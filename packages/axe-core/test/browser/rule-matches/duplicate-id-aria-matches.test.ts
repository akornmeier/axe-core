import { axe, fixtureSetup } from '@helpers/check-helpers';
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
describe('duplicate-id-aria matches', function () {
  let fixture: HTMLElement;
  let rule;

  beforeEach(function () {
    fixture = document.getElementById('fixture') as HTMLElement;
    rule = axe.utils.getRule('duplicate-id-aria');
  });

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('is a function', function () {
    expect(typeof rule.matches).toBe('function');
  });

  it('returns false if the ID is of an inactive non-referenced element', function () {
    fixtureSetup('<div id="foo"></div>');
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'div[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(false);
  });

  it('returns false if the ID is of an inactive non-referenced element with a duplicate', function () {
    fixtureSetup('<div id="foo"></div><span id="foo"></span>');
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'span[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(false);
  });

  it('returns false if the ID is of an active non-referenced element', function () {
    fixtureSetup('<button id="foo"></button>');
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'button[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(false);
  });

  it('returns false if the ID is a duplicate of an active non-referenced element', function () {
    fixtureSetup('<div id="foo"></div>' + '<button id="foo"></button>');
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'div[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(false);
  });

  it('returns true if the ID is of an inactive ARIA referenced element', function () {
    fixtureSetup('<div id="foo"></div>' + '<div aria-labelledby="foo"></div>');
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'div[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(true);
  });

  it('returns true if the ID is a duplicate of an inactive ARIA referenced element', function () {
    fixtureSetup(
      '<div id="foo"></div>' +
        '<div aria-labelledby="foo"></div>' +
        '<span id="foo"></span>'
    );
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'span[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(true);
  });

  it('returns true if the ID is of an active ARIA referenced element', function () {
    fixtureSetup(
      '<button id="foo"></button>' + '<div aria-labelledby="foo"></div>'
    );
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'button[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(true);
  });

  it('returns true if the ID is a duplicate of of an active ARIA referenced element', function () {
    fixtureSetup(
      '<button id="foo"></button>' +
        '<div aria-labelledby="foo"></div>' +
        '<span id="foo"></span>'
    );
    const vNode = axe.utils.querySelectorAll(axe._tree[0], 'span[id=foo]')[0];
    expect(rule.matches(vNode.actualNode, vNode)).toBe(true);
  });
});
