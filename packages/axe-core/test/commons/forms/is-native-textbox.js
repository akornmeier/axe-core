describe('forms.isNativeTextbox', function () {
  'use strict';
  const isNativeTextbox = axe.commons.forms.isNativeTextbox;
  const queryFixture = axe.testUtils.queryFixture;

  it('returns true for a text inputs', function () {
    const textInputs = [
      'date',
      'datetime',
      'datetime-local',
      'email',
      'month',
      'number',
      'range',
      'search',
      'tel',
      'text',
      'time',
      'url',
      'week'
    ];
    textInputs.forEach(function (type) {
      const node = queryFixture('<input id="target" type="' + type + '"/>');
      assert.isTrue(
        isNativeTextbox(node),
        '<input type="' + type + '"> is a native text input'
      );
    });
  });

  it('returns true for a textarea element', function () {
    const node = queryFixture('<textarea id="target"/>');
    assert.isTrue(isNativeTextbox(node));
  });

  it('returns false for non-text inputs', function () {
    const nonTextInputs = [
      'button',
      'checkbox',
      'file',
      'hidden',
      'image',
      'password',
      'radio',
      'reset',
      'submit',
      'color'
    ];
    nonTextInputs.forEach(function (type) {
      const node = queryFixture('<input id="target" type="' + type + '"/>');

      assert.isFalse(
        isNativeTextbox(node),
        '<input type="' + type + '"> is not a native text input'
      );
    });
  });

  it('return false for aria textbox elements', function () {
    const node = queryFixture('<div id="target" role="textbox"></div>');
    assert.isFalse(isNativeTextbox(node));
  });

  it('should ignore type case', function () {
    const node = queryFixture('<input id="target" type="TEXT"/>');
    assert.isTrue(isNativeTextbox(node));
  });
});
