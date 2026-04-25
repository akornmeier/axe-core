import { describe, expect, it } from 'vitest';
import { axe, flatTreeSetup } from '@helpers/check-helpers';

describe('forms.isAriaRange', function () {
  var isAriaRange = axe.commons.forms.isAriaRange;

  it('returns true for an element with range roles', function () {
    var rangeRoles = ['progressbar', 'scrollbar', 'slider', 'spinbutton'];
    rangeRoles.forEach(function (role) {
      var node = document.createElement('div');
      node.setAttribute('role', role);
      node.setAttribute('aria-valuenow', '0');
      flatTreeSetup(node);
      expect(
        isAriaRange(node),
        'role="' + role + '" is not an aria range role'
      ).toBe(true);
    });
  });

  it('returns false for elements without role', function () {
    var node = document.createElement('div');
    flatTreeSetup(node);
    expect(isAriaRange(node)).toBe(false);
  });

  it('returns false for elements with incorrect role', function () {
    var node = document.createElement('div');
    node.setAttribute('role', 'main');
    flatTreeSetup(node);
    expect(isAriaRange(node)).toBe(false);
  });

  it('returns false for native range elements', function () {
    var nativeRangeElements = [
      {
        nodeName: 'progress'
      },
      {
        nodeName: 'input',
        type: 'range'
      },
      {
        nodeName: 'input',
        type: 'number'
      }
    ];
    nativeRangeElements.forEach(function (elm) {
      var node = document.createElement(elm.nodeName);
      if (elm.type) {
        node.setAttribute('type', elm.type);
      }
      flatTreeSetup(node);
      expect(
        isAriaRange(node),
        node.outterHTML + ' is not an aria range element'
      ).toBe(false);
    });
  });
});
