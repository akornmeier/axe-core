import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  checks,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('hidden-explicit-label', () => {
  var checkContext = createMockCheckContext();
  var check = checks['hidden-explicit-label'];

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true if a hidden non-empty label is present', () => {
    var args = checkSetup(
      '<label for="target" style="display:none">Text</label><input type="text" id="target">',
      {},
      '#target'
    );
    expect(check.evaluate.apply(check, args)).toBe(true);
  });

  it('should return false if a visible non-empty label is present', () => {
    var args = checkSetup(
      '<label for="target">Label</label><input type="text" id="target">'
    );
    expect(check.evaluate.apply(check, args)).toBe(false);
  });

  it('should return true if an invisible empty label is present', () => {
    var args = checkSetup(
      '<label for="target" style="display: none;"></label><input type="text" id="target">'
    );
    expect(check.evaluate.apply(check, args)).toBe(true);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should return true if content is inside of shadow DOM',
    function () {
      var params = shadowCheckSetup(
        '<div></div>',
        '<label for="target" style="display:none">Text</label><input type="text" id="target">'
      );

      expect(check.evaluate.apply(shadowCheckSetup, params as any)).toBe(true);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should return false if part of the pairing is inside of shadow DOM',
    function () {
      var params = shadowCheckSetup(
        '<div><label for="target" style="display:none">Text</label></div>',
        '<input type="text" id="target">'
      );

      expect(check.evaluate.apply(shadowCheckSetup, params as any)).toBe(false);
    }
  );

  it('should fail when the label has aria-hidden=true', () => {
    var html = '';
    html += '<div>';
    html += '  <label for="target" aria-hidden="true">';
    html += '    Hello world';
    html += '  </label>';
    html += '  <input id="target">';
    html += '</div>';
    var args = checkSetup(html, {}, '#target');
    expect(check.evaluate.apply(check, args)).toBe(true);
  });

  describe('if the label is hidden', () => {
    describe('and the element has an accessible name', () => {
      it('should not fail', () => {
        var html = '';

        html += '<div>';
        html += '  <label for="target" style="display:none">';
        html += '    Hello world';
        html += '  </label>';
        html += '  <input id="target" title="Hi">';
        html += '</div>';

        var args = checkSetup(html, {}, '#target');
        expect(check.evaluate.apply(check, args)).toBe(false);
      });
    });
  });

  describe('SerialVirtualNode', () => {
    it('should return false if no id', () => {
      var vNode = new axe.SerialVirtualNode({
        nodeName: 'input',
        attributes: {
          type: 'text'
        }
      });
      expect(getCheckEvaluate('hidden-explicit-label')(null, {}, vNode)).toBe(
        false
      );
    });

    it('should return undefined if it has id', () => {
      var vNode = new axe.SerialVirtualNode({
        nodeName: 'input',
        attributes: {
          type: 'text',
          id: 'foobar'
        }
      });
      expect(
        getCheckEvaluate('hidden-explicit-label')(null, {}, vNode)
      ).toBeUndefined();
    });
  });
});
