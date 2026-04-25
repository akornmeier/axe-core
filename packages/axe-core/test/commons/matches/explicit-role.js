describe('matches.explicitRole', function () {
  const explicitRole = axe.commons.matches.explicitRole;
  const fixture = document.querySelector('#fixture');
  const queryFixture = axe.testUtils.queryFixture;

  beforeEach(function () {
    fixture.innerHTML = '';
  });

  it('should return true if explicit role matches', function () {
    const virtualNode = queryFixture(
      '<span id="target" role="textbox"></span>'
    );
    assert.isTrue(explicitRole(virtualNode, 'textbox'));
  });

  it('should return true if explicit role matches array', function () {
    const virtualNode = queryFixture(
      '<span id="target" role="textbox"></span>'
    );
    assert.isTrue(explicitRole(virtualNode, ['combobox', 'textbox']));
  });

  it('should return false if explicit role does not match', function () {
    const virtualNode = queryFixture('<span id="target" role="main"></span>');
    assert.isFalse(explicitRole(virtualNode, 'textbox'));
  });

  it('should return false if matching implicit role', function () {
    const virtualNode = queryFixture('<ul><li id="target"></li></ul>');
    assert.isFalse(explicitRole(virtualNode, 'listitem'));
  });

  it('works with SerialVirtualNode', function () {
    const serialNode = new axe.SerialVirtualNode({
      nodeName: 'span',
      attributes: {
        role: 'textbox'
      }
    });
    assert.isTrue(explicitRole(serialNode, 'textbox'));
  });
});
