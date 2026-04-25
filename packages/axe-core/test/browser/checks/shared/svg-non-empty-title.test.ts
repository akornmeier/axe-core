import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('svg-non-empty-title tests', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
  var checkEvaluate = getCheckEvaluate('svg-non-empty-title');

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('returns true if the element has a `title` child', () => {
    var checkArgs = checkSetup(
      '<svg id="target"><title>Time II: Party</title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('returns true if the `title` child has text nested in another element', () => {
    var checkArgs = checkSetup(
      '<svg id="target"><title><g>Time II: Party</g></title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('returns true if the element has a `title` child with `display:none`', () => {
    var checkArgs = checkSetup(
      '<svg id="target"><title style="display: none;">Time II: Party</title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('returns false if the element has no `title` child', () => {
    var checkArgs = checkSetup('<svg id="target"></svg>');
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noTitle');
  });

  it('returns false if the `title` child is empty', () => {
    var checkArgs = checkSetup('<svg id="target"><title></title></svg>');
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyTitle');
  });

  it('returns false if the `title` is a grandchild', () => {
    var checkArgs = checkSetup(
      '<svg id="target"><circle><title>Time II: Party</title></circle></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noTitle');
  });

  it('returns false if the `title` child has only whitespace', () => {
    var checkArgs = checkSetup(
      '<svg id="target"><title> \t\r\n </title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyTitle');
  });

  it('returns false if there are multiple titles, and the first is empty', () => {
    var checkArgs = checkSetup(
      '<svg id="target"><title></title><title>Time II: Party</title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyTitle');
  });

  describe('Serial Virtual Node', () => {
    it('returns true if the element has a `title` child', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'svg'
      });
      var child = new axe.SerialVirtualNode({
        nodeName: 'title'
      });
      var text = new axe.SerialVirtualNode({
        nodeName: '#text',
        nodeType: 3,
        nodeValue: 'Time II: Party'
      });
      child.parent = serialNode;
      child.children = [text];
      serialNode.children = [child];
      var checkArgs = [null, {}, serialNode];

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
    });

    it('returns false if the element has no `title` child', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'svg'
      });
      serialNode.children = [];
      var checkArgs = [null, {}, serialNode];

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
      expect(checkContext._data.messageKey).toBe('noTitle');
    });

    it('returns undefined if the element has empty children', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'svg'
      });
      var checkArgs = [null, {}, serialNode];

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBeUndefined();
    });
  });
});
