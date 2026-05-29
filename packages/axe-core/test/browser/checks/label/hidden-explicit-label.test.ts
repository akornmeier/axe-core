import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import hiddenExplicitLabelEvaluate from '@checks/label/hidden-explicit-label-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const hiddenExplicitLabelEvaluateESM = getCheckEvaluateESM(
  hiddenExplicitLabelEvaluate
);
const audit = createSyntheticAudit(['hidden-explicit-label']);

describe('hidden-explicit-label', () => {
  const checkContext = createMockCheckContext();
  const check = audit.checks['hidden-explicit-label'];

  afterEach(() => {
    checkContext.reset();
  });

  it('should return true if a hidden non-empty label is present', () => {
    const args = checkSetup(
      '<label for="target" style="display:none">Text</label><input type="text" id="target">',
      {},
      '#target'
    );
    expect(check.evaluate.apply(check, args)).toBe(true);
  });

  it('should return false if a visible non-empty label is present', () => {
    const args = checkSetup(
      '<label for="target">Label</label><input type="text" id="target">'
    );
    expect(check.evaluate.apply(check, args)).toBe(false);
  });

  it('should return true if an invisible empty label is present', () => {
    const args = checkSetup(
      '<label for="target" style="display: none;"></label><input type="text" id="target">'
    );
    expect(check.evaluate.apply(check, args)).toBe(true);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should return true if content is inside of shadow DOM',
    function () {
      const params = shadowCheckSetup(
        '<div></div>',
        '<label for="target" style="display:none">Text</label><input type="text" id="target">'
      );

      expect(check.evaluate.apply(shadowCheckSetup, params as any)).toBe(true);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should return false if part of the pairing is inside of shadow DOM',
    function () {
      const params = shadowCheckSetup(
        '<div><label for="target" style="display:none">Text</label></div>',
        '<input type="text" id="target">'
      );

      expect(check.evaluate.apply(shadowCheckSetup, params as any)).toBe(false);
    }
  );

  it('should fail when the label has aria-hidden=true', () => {
    let html = '';
    html += '<div>';
    html += '  <label for="target" aria-hidden="true">';
    html += '    Hello world';
    html += '  </label>';
    html += '  <input id="target">';
    html += '</div>';
    const args = checkSetup(html, {}, '#target');
    expect(check.evaluate.apply(check, args)).toBe(true);
  });

  describe('if the label is hidden', () => {
    describe('and the element has an accessible name', () => {
      it('should not fail', () => {
        let html = '';

        html += '<div>';
        html += '  <label for="target" style="display:none">';
        html += '    Hello world';
        html += '  </label>';
        html += '  <input id="target" title="Hi">';
        html += '</div>';

        const args = checkSetup(html, {}, '#target');
        expect(check.evaluate.apply(check, args)).toBe(false);
      });
    });
  });

  describe('SerialVirtualNode', () => {
    it('should return false if no id', () => {
      const vNode = new axe.SerialVirtualNode({
        nodeName: 'input',
        attributes: {
          type: 'text'
        }
      });
      expect(hiddenExplicitLabelEvaluateESM(null, {}, vNode)).toBe(false);
    });

    it('should return undefined if it has id', () => {
      const vNode = new axe.SerialVirtualNode({
        nodeName: 'input',
        attributes: {
          type: 'text',
          id: 'foobar'
        }
      });
      expect(hiddenExplicitLabelEvaluateESM(null, {}, vNode)).toBeUndefined();
    });
  });
});
