import { describe, expect, it } from 'vitest';
import { axe, flatTreeSetup } from '@helpers/check-helpers';

describe('forms.isAriaTextbox', function () {
  var isAriaTextbox = axe.commons.forms.isAriaTextbox;

  it('returns true for an element with role=textbox', function () {
    var node = document.createElement('div');
    node.setAttribute('role', 'textbox');
    flatTreeSetup(node);
    expect(isAriaTextbox(node)).toBe(true);
  });

  it('returns false for elements without role', function () {
    var node = document.createElement('div');
    flatTreeSetup(node);
    expect(isAriaTextbox(node)).toBe(false);
  });

  it('returns false for elements with incorrect role', function () {
    var node = document.createElement('div');
    node.setAttribute('role', 'main');
    flatTreeSetup(node);
    expect(isAriaTextbox(node)).toBe(false);
  });

  it('returns false for native textbox inputs', function () {
    var node = document.createElement('input');
    node.setAttribute('type', 'text');
    flatTreeSetup(node);
    expect(isAriaTextbox(node)).toBe(false);
  });
});
