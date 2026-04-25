import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('focusable-no-name', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    checkContext.reset();
  });

  it('should pass if tabindex < 0', () => {
    var params = checkSetup('<a href="#" tabindex="-1" id="target"></a>');
    expect(
      getCheckEvaluate('focusable-no-name').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should pass element is not natively focusable', () => {
    var params = checkSetup('<span role="link" href="#" id="target"></span>');
    expect(
      getCheckEvaluate('focusable-no-name').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should fail if element is tabbable with no name - native', () => {
    var params = checkSetup('<a href="#" id="target"></a>');
    expect(
      getCheckEvaluate('focusable-no-name').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should fail if element is tabbable with no name - ARIA', () => {
    var params = checkSetup(
      '<span tabindex="0" role="link" id="target" href="#"></spam>'
    );
    expect(
      getCheckEvaluate('focusable-no-name').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should pass if the element is tabbable but has an accessible name', () => {
    var params = checkSetup('<a href="#" title="Hello" id="target"></a>');
    expect(
      getCheckEvaluate('focusable-no-name').apply(checkContext, params as any)
    ).toBe(false);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should pass if the content is passed in with shadow DOM',
    function () {
      var params = shadowCheckSetup(
        '<div>Content!</div>',
        '<a href="#" id="target"><slot></slot></a>'
      );

      expect(
        getCheckEvaluate('focusable-no-name').apply(checkContext, params as any)
      ).toBe(false);
    }
  );

  describe('Serial Virtual Node', () => {
    it('should pass if tabindex < 0', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          tabindex: '-1',
          href: '#'
        }
      });

      expect(getCheckEvaluate('focusable-no-name')(null, {}, serialNode)).toBe(
        false
      );
    });

    it('should pass element is not natively focusable', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'span',
        attributes: {
          role: 'link',
          href: '#'
        }
      });

      expect(getCheckEvaluate('focusable-no-name')(null, {}, serialNode)).toBe(
        false
      );
    });

    it('should fail if element is tabbable with no name - native', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          href: '#'
        }
      });
      serialNode.children = [];

      expect(getCheckEvaluate('focusable-no-name')(null, {}, serialNode)).toBe(
        true
      );
    });

    it('should return undefined if element is tabbable with no name nor children - native', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          href: '#'
        }
      });

      expect(
        getCheckEvaluate('focusable-no-name')(null, {}, serialNode)
      ).toBeUndefined();
    });

    it('should pass if the element is tabbable but has an accessible name', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          href: '#',
          title: 'Hello'
        }
      });
      serialNode.children = [];

      expect(getCheckEvaluate('focusable-no-name')(null, {}, serialNode)).toBe(
        false
      );
    });
  });
});
