import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from '@helpers/check-helpers';

describe('dom.getElementByReference', function () {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });

  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should return null if the attribute is not found', function () {
    fixture.innerHTML = '<a id="link" href="#target">Hi</a>';
    var node = document.getElementById('link'),
      result = axe.commons.dom.getElementByReference(node, 'usemap');

    expect(result).toBeNull();
  });

  it('should return null if the attribute does not start with "#"', function () {
    fixture.innerHTML = '<a id="link" usemap="target">Hi</a>';
    var node = document.getElementById('link'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBeNull();
  });

  it('should return null if no targets are found', function () {
    fixture.innerHTML = '<a id="link" href="#target">Hi</a>';
    var node = document.getElementById('link'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBeNull();
  });

  it('should return node if target is found (href)', function () {
    fixture.innerHTML =
      '<a id="link" href="#target">Hi</a>' + '<a id="target"></a>';

    var node = document.getElementById('link'),
      expected = document.getElementById('target'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBe(expected);
  });

  it('should return node if target is found (usemap)', function () {
    fixture.innerHTML =
      '<img id="link" usemap="#target">Hi</a>' + '<map id="target"></map>';

    var node = document.getElementById('link'),
      expected = document.getElementById('target'),
      result = axe.commons.dom.getElementByReference(node, 'usemap');

    expect(result).toBe(expected);
  });

  it('should prioritize ID', function () {
    fixture.innerHTML =
      '<a id="link" href="#target">Hi</a>' +
      '<a id="target"></a>' +
      '<a name="target"></a>';

    var node = document.getElementById('link'),
      expected = document.getElementById('target'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBe(expected);
  });

  it('should fallback to name', function () {
    fixture.innerHTML =
      '<a id="link" href="#target">Hi</a>' +
      '<a name="target" id="target0"></a>';

    var node = document.getElementById('link'),
      expected = document.getElementById('target0'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBe(expected);
  });

  it('should return the first matching element with name', function () {
    fixture.innerHTML =
      '<a id="link" href="#target">Hi</a>' +
      '<a name="target" id="target0"></a>' +
      '<a name="target"></a>';

    var node = document.getElementById('link'),
      expected = document.getElementById('target0'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBe(expected);
  });

  it('returns the first matching element using Angular skiplinks', function () {
    fixture.innerHTML =
      '<a id="link" href="/#target">Hi</a>' +
      '<a name="target" id="target0"></a>' +
      '<a name="target"></a>';

    var node = document.getElementById('link'),
      expected = document.getElementById('target0'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBe(expected);
  });

  it('should work with absolute links', function () {
    var currentPage = window.location.origin + window.location.pathname;

    fixture.innerHTML =
      '<a id="link" href="' +
      currentPage +
      '#target">Hi</a>' +
      '<a id="target"></a>' +
      '<a name="target"></a>';

    var node = document.getElementById('link'),
      expected = document.getElementById('target'),
      result = axe.commons.dom.getElementByReference(node, 'href');

    expect(result).toBe(expected);
  });
});
