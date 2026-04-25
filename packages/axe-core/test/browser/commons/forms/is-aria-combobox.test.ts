import { describe, expect, it } from 'vitest';
import { axe, flatTreeSetup } from '@helpers/check-helpers';

describe('forms.isAriaCombobox', function () {
  const isAriaCombobox = axe.commons.forms.isAriaCombobox;

  it('returns true for an element with role=combobox', function () {
    const node = document.createElement('div');
    node.setAttribute('role', 'combobox');
    flatTreeSetup(node);
    expect(isAriaCombobox(node)).toBe(true);
  });

  it('returns false for elements without role', function () {
    const node = document.createElement('div');
    flatTreeSetup(node);
    expect(isAriaCombobox(node)).toBe(false);
  });

  it('returns false for elements with incorrect role', function () {
    const node = document.createElement('div');
    node.setAttribute('role', 'main');
    flatTreeSetup(node);
    expect(isAriaCombobox(node)).toBe(false);
  });
});
