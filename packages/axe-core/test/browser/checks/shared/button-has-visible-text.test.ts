import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('button-has-visible-text', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if button element is empty', () => {
    var checkArgs = checkSetup('<button></button>', 'button');

    expect(
      getCheckEvaluate('button-has-visible-text').apply(checkContext, checkArgs)
    ).toBe(false);
  });

  it('should return true if a button element has text', () => {
    var checkArgs = checkSetup('<button>Name</button>', 'button');

    expect(
      getCheckEvaluate('button-has-visible-text').apply(checkContext, checkArgs)
    ).toBe(true);
  });

  it('should return true if ARIA button has text', () => {
    var checkArgs = checkSetup(
      '<div role="button">Text</div>',
      '[role=button]'
    );

    expect(
      getCheckEvaluate('button-has-visible-text').apply(checkContext, checkArgs)
    ).toBe(true);
  });

  it('should return false if ARIA button has no text', () => {
    var checkArgs = checkSetup('<div role="button"></div>', '[role=button]');

    expect(
      getCheckEvaluate('button-has-visible-text').apply(checkContext, checkArgs)
    ).toBe(false);
  });

  describe('SerialVirtualNode', () => {
    it('should return incomplete if no children are passed', () => {
      var node = new axe.SerialVirtualNode({
        nodeName: 'button'
      });

      expect(
        getCheckEvaluate('button-has-visible-text')(null, {}, node)
      ).toBeUndefined();
    });

    it('should return false if button element is empty', () => {
      var node = new axe.SerialVirtualNode({
        nodeName: 'button'
      });
      node.children = [];

      expect(getCheckEvaluate('button-has-visible-text')(null, {}, node)).toBe(
        false
      );
    });

    it('should return true if a button element has text', () => {
      var node = new axe.SerialVirtualNode({
        nodeName: 'button'
      });
      var child = new axe.SerialVirtualNode({
        nodeName: '#text',
        nodeType: 3,
        nodeValue: 'Text'
      });
      node.children = [child];

      expect(getCheckEvaluate('button-has-visible-text')(null, {}, node)).toBe(
        true
      );
    });
  });
});
