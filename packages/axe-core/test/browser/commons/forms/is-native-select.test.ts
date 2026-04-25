import { describe, expect, it } from 'vitest';
import { axe, queryFixture } from '@helpers/check-helpers';

describe('forms.isNativeSelect', function () {
  var isNativeSelect = axe.commons.forms.isNativeSelect;

  it('returns true for a select element', function () {
    var node = queryFixture('<select id="target"></select>');
    expect(isNativeSelect(node)).toBe(true);
  });

  it('returns false for non-select elements', function () {
    var nonSelectElements = ['a', 'h1', 'div', 'span', 'main'];
    nonSelectElements.forEach(function (nodeName) {
      var node = queryFixture(
        '<' + nodeName + ' id="target"></' + nodeName + '>'
      );
      expect(
        isNativeSelect(node),
        '<' + nodeName + '> is not a native select element'
      ).toBe(false);
    });
  });
});
