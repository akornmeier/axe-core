import {
  createMockCheckContext,
  queryFixture,
  checks,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('no-implicit-explicit-label', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var check = checks['no-implicit-explicit-label'];
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('returns false when there is no label text or accessible text', () => {
    var vNode = queryFixture(
      '<div id="target" role="searchbox" contenteditable="true"></div>'
    );
    var actual = check.evaluate.call(checkContext, null, {}, vNode);
    expect(actual).toBe(false);
  });

  it('returns undefined when there is no accessible text', () => {
    var vNode = queryFixture(
      '<label for="target">Choose currency:</label><div id="target" role="searchbox" contenteditable="true"></div>'
    );
    var actual = check.evaluate.call(checkContext, null, {}, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined when accessible text does not contain label text', () => {
    var vNode = queryFixture(
      '<label for="target">Choose country:</label><div id="target" aria-label="country" role="combobox">England</div>'
    );
    var actual = check.evaluate.call(checkContext, null, {}, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns false when accessible text contains label text', () => {
    var vNode = queryFixture(
      '<label for="target">Country</label><div id="target" aria-label="Choose country" role="combobox">England</div>'
    );
    var actual = check.evaluate.call(checkContext, null, {}, vNode);
    expect(actual).toBe(false);
  });

  describe('SerialVirtualNode', () => {
    it('should return false if there is no parent', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          role: 'combobox',
          'aria-label': 'woohoo'
        }
      });
      serialNode.parent = null;

      var actual = check.evaluate.call(checkContext, null, {}, serialNode);
      expect(actual).toBe(false);
    });

    it('should return undefined if incomplete tree', () => {
      var serialNode = new axe.SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          role: 'combobox',
          'aria-label': 'woohoo'
        }
      });

      var actual = check.evaluate.call(checkContext, null, {}, serialNode);
      expect(actual).toBeUndefined();
    });
  });
});
