describe('forms.isAriaTextbox', function () {
  'use strict';
  const isAriaTextbox = axe.commons.forms.isAriaTextbox;
  const flatTreeSetup = axe.testUtils.flatTreeSetup;

  it('returns true for an element with role=textbox', function () {
    const node = document.createElement('div');
    node.setAttribute('role', 'textbox');
    flatTreeSetup(node);
    assert.isTrue(isAriaTextbox(node));
  });

  it('returns false for elements without role', function () {
    const node = document.createElement('div');
    flatTreeSetup(node);
    assert.isFalse(isAriaTextbox(node));
  });

  it('returns false for elements with incorrect role', function () {
    const node = document.createElement('div');
    node.setAttribute('role', 'main');
    flatTreeSetup(node);
    assert.isFalse(isAriaTextbox(node));
  });

  it('returns false for native textbox inputs', function () {
    const node = document.createElement('input');
    node.setAttribute('type', 'text');
    flatTreeSetup(node);
    assert.isFalse(isAriaTextbox(node));
  });
});
