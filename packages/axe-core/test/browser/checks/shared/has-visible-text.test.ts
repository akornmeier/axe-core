import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('has-visible-text', () => {
  const checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
  });

  it('should return false if there is no visible text', () => {
    const params = checkSetup('<p id="target"></p>');
    expect(
      getCheckEvaluate('has-visible-text').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should return false if there is text, but its hidden', () => {
    const params = checkSetup(
      '<p id="target"><span style="display:none">hello!</span></p>'
    );
    expect(
      getCheckEvaluate('has-visible-text').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should return true if there is visible text', () => {
    const params = checkSetup('<p id="target">hello!</p>');
    expect(
      getCheckEvaluate('has-visible-text').apply(checkContext, params as any)
    ).toBe(true);
  });

  describe('SerialVirtualNode', () => {
    it('should return false if element is not named from contents', () => {
      const node = new axe.SerialVirtualNode({
        nodeName: 'article'
      });

      expect(getCheckEvaluate('has-visible-text')(null, {}, node)).toBe(false);
    });

    it('should return incomplete if no other properties are set', () => {
      const node = new axe.SerialVirtualNode({
        nodeName: 'button'
      });

      expect(
        getCheckEvaluate('has-visible-text')(null, {}, node)
      ).toBeUndefined();
    });

    it('should return false if there is no visible text', () => {
      const node = new axe.SerialVirtualNode({
        nodeName: 'button'
      });
      node.children = [];

      expect(getCheckEvaluate('has-visible-text')(null, {}, node)).toBe(false);
    });

    it('should return true if there is visible text', () => {
      const node = new axe.SerialVirtualNode({
        nodeName: 'p'
      });
      const child = new axe.SerialVirtualNode({
        nodeName: '#text',
        nodeType: 3,
        nodeValue: 'hello!'
      });
      node.children = [child];

      expect(getCheckEvaluate('has-visible-text')(null, {}, node)).toBe(true);
    });
  });
});
