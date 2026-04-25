describe('dom.isVisualContent', function () {
  'use strict';

  const fixture = document.getElementById('fixture');
  const queryFixture = axe.testUtils.queryFixture;
  const isVisualContent = axe.commons.dom.isVisualContent;

  afterEach(function () {
    fixture.innerHTML = '';
  });

  describe('isVisualContent', function () {
    it('should return true for img', function () {
      const virtualNode = queryFixture('<img src="" id="target">');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for iframe', function () {
      const virtualNode = queryFixture('<iframe src="" id="target"></iframe>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for object', function () {
      const virtualNode = queryFixture('<object data="" id="target"></object>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for video', function () {
      const virtualNode = queryFixture('<video src="" id="target"></video>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for audio', function () {
      const virtualNode = queryFixture('<audio src="" id="target"></audio>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for canvas', function () {
      const virtualNode = queryFixture('<canvas id="target"></canvas>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for svg', function () {
      const virtualNode = queryFixture('<svg id="target"></svg>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for math', function () {
      const virtualNode = queryFixture('<math id="target"></math>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for button', function () {
      const virtualNode = queryFixture('<button id="target"></button>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for select', function () {
      const virtualNode = queryFixture('<select id="target"></select>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for textarea', function () {
      const virtualNode = queryFixture('<textarea id="target"></textarea>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for keygen', function () {
      const virtualNode = queryFixture('<keygen id="target"></keygen');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for progress', function () {
      const virtualNode = queryFixture('<progress id="target"></progress>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for meter', function () {
      const virtualNode = queryFixture('<meter id="target"></meter>');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for non-hidden input', function () {
      const virtualNode = queryFixture('<input type="text" id="target">');
      assert.isTrue(isVisualContent(virtualNode));
    });

    it('should return true for elements with a visual aria role', function () {
      const virtualNode = queryFixture(
        '<div id="target">' +
          '<span role="img"></span>' +
          '<span role="checkbox"></span>' +
          '<span role="radio"></span>' +
          '<span role="meter"></span>' +
          '<span role="progressbar"></span>' +
          '<span role="scrollbar"></span>' +
          '<span role="slider"></span>' +
          '<span role="spinbutton"></span>' +
          '<span role="textbox"></span>' +
          '</div>'
      );

      for (let i = 0; i < virtualNode.children.length; i++) {
        assert.isTrue(
          isVisualContent(virtualNode.children[i]),
          'for role ' + virtualNode.children[i].attr('role')
        );
      }
    });

    it('should return false for hidden input', function () {
      const virtualNode = queryFixture('<input type="hidden" id="target">');
      assert.isFalse(isVisualContent(virtualNode));
    });

    it('should return false for p', function () {
      const virtualNode = queryFixture('<p id="target">Paragraph!</p>');
      assert.isFalse(isVisualContent(virtualNode));
    });
  });
});
