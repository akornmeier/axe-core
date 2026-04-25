import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('autocomplete-appropriate', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
  var evaluate = getCheckEvaluate('autocomplete-appropriate');

  beforeEach(() => {
    axe._tree = undefined;
  });

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  function autocompleteCheckParams(term, type, options) {
    return checkSetup(
      '<input autocomplete="' + term + '" type=' + type + ' id="target" />',
      options
    );
  }

  it('returns true for non-select elements', () => {
    ['div', 'button', 'select', 'textarea'].forEach(function (tagName) {
      var elm = document.createElement(tagName);
      elm.setAttribute('autocomplete', 'foo');
      elm.setAttribute('type', 'email');
      var params = checkSetup(elm);

      expect(
        evaluate.apply(checkContext, params as any),
        'failed for ' + tagName
      ).toBe(true);
    });
  });

  it('returns true if the input type is in the map', () => {
    var options = { foo: ['url'] };
    var params = autocompleteCheckParams('foo', 'url', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns false if the input type is not in the map', () => {
    var options = { foo: ['url'] };
    var params = autocompleteCheckParams('foo', 'email', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('returns true if the input type is text and the term is undefined', () => {
    var options = {};
    var params = autocompleteCheckParams('foo', 'text', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns true if the input type is tel and the term is off', () => {
    var options = {};
    var params = autocompleteCheckParams('off', 'tel', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns true if the input type is url and the term is on', () => {
    var options = {};
    var params = autocompleteCheckParams('on', 'url', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns true if the input type is foobar and the term is undefined', () => {
    var options = {};
    var params = autocompleteCheckParams('foo', 'foobar', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns true if the input type is email and the term is username', () => {
    var options = {};
    var params = autocompleteCheckParams('username', 'email', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('returns false if the input type is text and the term maps to an empty array', () => {
    var options = { foo: [] };
    var params = autocompleteCheckParams('foo', 'text', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('returns false if the input type is month and term is bday-month', () => {
    var options = {};
    var params = autocompleteCheckParams('bday-month', 'month', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('returns false if the input type is MONTH (case-insensitive & sanitized) and term is bday-month', () => {
    var options = {};
    var params = autocompleteCheckParams('bday-month', '   MONTH    ', options);
    expect(evaluate.apply(checkContext, params as any)).toBe(false);
  });
});
