describe('axe.utils.getStandards', function () {
  it('returns the standards object', function () {
    const standards = axe.utils.getStandards();
    assert.hasAnyKeys(standards, [
      'ariaAttrs',
      'ariaRoles',
      'htmlElms',
      'cssColors'
    ]);
  });
});
