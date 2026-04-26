import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM,
  axe
} from '@helpers/check-helpers';
import svgNonEmptyTitleEvaluate from '@checks/shared/svg-non-empty-title-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const svgNonEmptyTitleEvaluateESM = getCheckEvaluateESM(
  svgNonEmptyTitleEvaluate
);
describe('svg-non-empty-title tests', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();
  const checkEvaluate = svgNonEmptyTitleEvaluateESM;

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('returns true if the element has a `title` child', () => {
    const checkArgs = checkSetup(
      '<svg id="target"><title>Time II: Party</title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('returns true if the `title` child has text nested in another element', () => {
    const checkArgs = checkSetup(
      '<svg id="target"><title><g>Time II: Party</g></title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('returns true if the element has a `title` child with `display:none`', () => {
    const checkArgs = checkSetup(
      '<svg id="target"><title style="display: none;">Time II: Party</title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('returns false if the element has no `title` child', () => {
    const checkArgs = checkSetup('<svg id="target"></svg>');
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noTitle');
  });

  it('returns false if the `title` child is empty', () => {
    const checkArgs = checkSetup('<svg id="target"><title></title></svg>');
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyTitle');
  });

  it('returns false if the `title` is a grandchild', () => {
    const checkArgs = checkSetup(
      '<svg id="target"><circle><title>Time II: Party</title></circle></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('noTitle');
  });

  it('returns false if the `title` child has only whitespace', () => {
    const checkArgs = checkSetup(
      '<svg id="target"><title> \t\r\n </title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyTitle');
  });

  it('returns false if there are multiple titles, and the first is empty', () => {
    const checkArgs = checkSetup(
      '<svg id="target"><title></title><title>Time II: Party</title></svg>'
    );
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    expect(checkContext._data.messageKey).toBe('emptyTitle');
  });

  describe('Serial Virtual Node', () => {
    it('returns true if the element has a `title` child', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'svg'
      });
      const child = new axe.SerialVirtualNode({
        nodeName: 'title'
      });
      const text = new axe.SerialVirtualNode({
        nodeName: '#text',
        nodeType: 3,
        nodeValue: 'Time II: Party'
      });
      child.parent = serialNode;
      child.children = [text];
      serialNode.children = [child];
      const checkArgs = [null, {}, serialNode];

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
    });

    it('returns false if the element has no `title` child', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'svg'
      });
      serialNode.children = [];
      const checkArgs = [null, {}, serialNode];

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
      expect(checkContext._data.messageKey).toBe('noTitle');
    });

    it('returns undefined if the element has empty children', () => {
      const serialNode = new axe.SerialVirtualNode({
        nodeName: 'svg'
      });
      const checkArgs = [null, {}, serialNode];

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBeUndefined();
    });
  });
});
