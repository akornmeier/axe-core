import { describe, expect, it } from 'vitest';
import { axe, fixtureSetup, shadowSupport } from '@helpers/check-helpers';

describe('dom.findElmsInContext', function () {
  var findElmsInContext = axe.commons.dom.findElmsInContext;

  it('returns an array or elements in the same context', function () {
    var rootNode = fixtureSetup(
      '<b name="foo">1</b>' +
        '<b name="foo">2</b>' +
        '<b name="bar">3</b>' +
        '<i name="foo">4</i>'
    );

    expect(
      findElmsInContext({
        elm: 'b',
        attr: 'name',
        value: 'foo',
        context: rootNode.actualNode
      })
    ).toEqual(Array.from(document.querySelectorAll('b[name=foo]')));
  });

  (shadowSupport.v1 ? it : xit)(
    'ignores elements inside shadow tree',
    function () {
      var node = document.createElement('div');
      node.innerHTML = '<b name="foo">1</b>';
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<b name="foo">2</b> <slot></slot>';
      var rootNode = fixtureSetup(node);

      var result = findElmsInContext({
        elm: 'b',
        attr: 'name',
        value: 'foo',
        context: rootNode.actualNode
      });
      expect(result).toHaveLength(1);
      expect(result[0].innerText).toBe('1');
    }
  );

  (shadowSupport.v1 ? it : xit)(
    'can search elements limited to the shadow tree',
    function () {
      var node = document.createElement('div');
      node.innerHTML = '<b name="foo">1</b>';
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<b name="foo">2</b><slot></slot>';
      fixtureSetup(node);

      var result = findElmsInContext({
        elm: 'b',
        attr: 'name',
        value: 'foo',
        context: shadow
      });

      expect(result).toHaveLength(1);
      expect(result[0].innerText).toBe('2');
    }
  );
});
