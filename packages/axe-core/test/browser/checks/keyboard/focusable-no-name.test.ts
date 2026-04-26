import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import focusableNoNameEvaluate from '@checks/keyboard/focusable-no-name-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const focusableNoNameEvaluateESM = getCheckEvaluateESM(focusableNoNameEvaluate);
describe('focusable-no-name', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    checkContext.reset();
  });

  it('should pass if tabindex < 0', () => {
    const params = checkSetup('<a href="#" tabindex="-1" id="target"></a>');
    expect(focusableNoNameEvaluateESM.apply(checkContext, params as any)).toBe(
      false
    );
  });

  it('should pass element is not natively focusable', () => {
    const params = checkSetup('<span role="link" href="#" id="target"></span>');
    expect(focusableNoNameEvaluateESM.apply(checkContext, params as any)).toBe(
      false
    );
  });

  it('should fail if element is tabbable with no name - native', () => {
    const params = checkSetup('<a href="#" id="target"></a>');
    expect(focusableNoNameEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );
  });

  it('should fail if element is tabbable with no name - ARIA', () => {
    const params = checkSetup(
      '<span tabindex="0" role="link" id="target" href="#"></spam>'
    );
    expect(focusableNoNameEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );
  });

  it('should pass if the element is tabbable but has an accessible name', () => {
    const params = checkSetup('<a href="#" title="Hello" id="target"></a>');
    expect(focusableNoNameEvaluateESM.apply(checkContext, params as any)).toBe(
      false
    );
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should pass if the content is passed in with shadow DOM',
    function () {
      const params = shadowCheckSetup(
        '<div>Content!</div>',
        '<a href="#" id="target"><slot></slot></a>'
      );

      expect(
        focusableNoNameEvaluateESM.apply(checkContext, params as any)
      ).toBe(false);
    }
  );

  describe('Serial Virtual Node', () => {
    it('should pass if tabindex < 0', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          tabindex: '-1',
          href: '#'
        }
      });

      expect(focusableNoNameEvaluateESM(null, {}, serialNode)).toBe(false);
    });

    it('should pass element is not natively focusable', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'span',
        attributes: {
          role: 'link',
          href: '#'
        }
      });

      expect(focusableNoNameEvaluateESM(null, {}, serialNode)).toBe(false);
    });

    it('should fail if element is tabbable with no name - native', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          href: '#'
        }
      });
      serialNode.children = [];

      expect(focusableNoNameEvaluateESM(null, {}, serialNode)).toBe(true);
    });

    it('should return undefined if element is tabbable with no name nor children - native', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          href: '#'
        }
      });

      expect(focusableNoNameEvaluateESM(null, {}, serialNode)).toBeUndefined();
    });

    it('should pass if the element is tabbable but has an accessible name', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'a',
        attributes: {
          href: '#',
          title: 'Hello'
        }
      });
      serialNode.children = [];

      expect(focusableNoNameEvaluateESM(null, {}, serialNode)).toBe(false);
    });
  });
});
