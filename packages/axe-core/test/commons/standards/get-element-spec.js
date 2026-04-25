describe('standards.getElementSpec', function () {
  const getElementSpec = axe.commons.standards.getElementSpec;
  const queryFixture = axe.testUtils.queryFixture;
  const fixture = document.querySelector('#fixture');

  before(function () {
    axe._load({});
  });

  afterEach(function () {
    fixture.innerHTML = '';
  });

  after(function () {
    axe.reset();
  });

  it('should return a spec for an element without variants', function () {
    axe.configure({
      standards: {
        htmlElms: {
          abbr: {
            contentTypes: ['phrasing', 'flow'],
            allowedRoles: true
          }
        }
      }
    });

    const vNode = queryFixture('<abbr id="target"></abbr>');
    assert.deepEqual(getElementSpec(vNode), {
      contentTypes: ['phrasing', 'flow'],
      allowedRoles: true
    });
  });

  it('should return empty object if passed an invalid element', function () {
    const vNode = queryFixture('<foo-bar id="target"></foo-bar>');
    assert.deepEqual(getElementSpec(vNode), {});
  });

  describe('variants', function () {
    before(function () {
      axe.configure({
        standards: {
          htmlElms: {
            abbr: {
              variant: {
                controls: {
                  matches: '[controls]',
                  customProp: 'controls'
                },
                label: {
                  matches: '[aria-label]',
                  anotherProp: 'label'
                },
                default: {
                  customProp: 'default',
                  anotherProp: 'default'
                }
              },
              allowedRoles: false
            }
          }
        }
      });
    });

    it('should return top level properties', function () {
      const vNode = queryFixture('<abbr id="target" controls></abbr>');
      const spec = getElementSpec(vNode);
      assert.equal(spec.allowedRoles, false);
    });

    it('should return properties from matching variant', function () {
      const vNode = queryFixture('<abbr id="target" controls></abbr>');
      const spec = getElementSpec(vNode);
      assert.equal(spec.customProp, 'controls');
    });

    it('should return all properties from matching variants', function () {
      const vNode = queryFixture(
        '<abbr id="target" controls aria-label="foo"></abbr>'
      );
      const spec = getElementSpec(vNode);
      assert.equal(spec.customProp, 'controls');
      assert.equal(spec.anotherProp, 'label');
    });

    it('should return default props in no variants match', function () {
      const vNode = queryFixture('<abbr id="target"></abbr>');
      const spec = getElementSpec(vNode);
      assert.equal(spec.customProp, 'default');
      assert.equal(spec.anotherProp, 'default');
    });

    it('should return default props that were not part of other matches', function () {
      const vNode = queryFixture('<abbr id="target" controls></abbr>');
      const spec = getElementSpec(vNode);
      assert.equal(spec.customProp, 'controls');
      assert.equal(spec.anotherProp, 'default');
    });
  });
});
