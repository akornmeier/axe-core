import {
  createMockCheckContext,
  queryFixture,
  fixtureSetup,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('aria-valid-attr-value', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();
  const shadowSupported = shadowSupport.v1;
  const validAttrValueCheck = getCheckEvaluate('aria-valid-attr-value');

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should not check the validity of attribute names', () => {
    const vNode = queryFixture(
      '<div id="target" aria-cats="true" aria-selected="true"></div>'
    );

    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      true
    );
    expect(checkContext._data).toBeNull();
  });

  it('should return true if all values are valid', () => {
    const vNode = queryFixture(
      '<div id="target" aria-selected="true" aria-checked="true" aria-relevant="additions removals"></div>'
    );

    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      true
    );
    expect(checkContext._data).toBeNull();
  });

  it('should return true if idref(s) values are valid', () => {
    const vNode = queryFixture(
      '<div id="target" aria-owns="test_tgt1 test_tgt2" aria-activedescendant="test_tgt1"></div>' +
        '<div id="test_tgt1"></div>' +
        '<div id="test_tgt2"></div>'
    );

    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      true
    );
    expect(checkContext._data).toBeNull();
  });

  it('should return false if any values are invalid', () => {
    const vNode = queryFixture(
      '<div id="target" aria-live="polite" aria-selected="0"></div>'
    );

    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      false
    );
    expect(checkContext._data).toEqual(['aria-selected="0"']);
  });

  it('should allow empty strings rather than idref', () => {
    const tree = fixtureSetup(
      '<button aria-controls="">Button</button>' +
        '<div aria-activedescendant=""></div>'
    );
    const passing1 = tree.children[0];
    const passing2 = tree.children[1];
    expect(validAttrValueCheck.call(checkContext, null, null, passing1)).toBe(
      true
    );
    expect(validAttrValueCheck.call(checkContext, null, null, passing2)).toBe(
      true
    );
  });

  it('should allow empty strings rather than idrefs', () => {
    const tree = fixtureSetup(
      '<button aria-labelledby="">Button</button>' + '<div aria-owns=""></div>'
    );
    const passing1 = tree.children[0];
    const passing2 = tree.children[1];
    expect(validAttrValueCheck.call(checkContext, null, null, passing1)).toBe(
      true
    );
    expect(validAttrValueCheck.call(checkContext, null, null, passing2)).toBe(
      true
    );
  });

  it('should pass on aria-controls and aria-expanded=false when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-controls="test" aria-expanded="false">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      true
    );
  });

  it('should pass on aria-controls and aria-selected=false when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-controls="test" aria-selected="false">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      true
    );
  });

  it('should fail on aria-controls and aria-expanded=true when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-controls="test" aria-expanded="true">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      false
    );
  });

  it('should fail on aria-controls and aria-selected=true when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-controls="test" aria-selected="true">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      false
    );
  });

  it('should fail on aria-controls when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-controls="test">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      false
    );
  });

  it('should return undefined on aria-controls with aria-haspopup as we cannot determine if it is in the DOM later', () => {
    const vNode = queryFixture(
      '<button id="target" aria-controls="test" aria-haspopup="true">Button</button>'
    );
    expect(
      validAttrValueCheck.call(checkContext, null, null, vNode)
    ).toBeUndefined();
    expect(checkContext._data).toEqual({
      messageKey: 'controlsWithinPopup',
      needsReview: 'aria-controls="test"'
    });
  });

  it('should pass on aria-owns and aria-expanded=false when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-owns="test" aria-expanded="false">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      true
    );
  });

  it('should fail on aria-owns and aria-expanded=true when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-owns="test" aria-expanded="true">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      false
    );
  });

  it('should fail on aria-owns when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-owns="test">Button</button>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      false
    );
  });

  it('should fail on aria-level when the value is less than 1', () => {
    const vNode = queryFixture(
      '<div id="target" role="heading" aria-level="0">Heading</div>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      false
    );
  });

  it('should return undefined on aria-describedby when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-describedby="test">Button</button>'
    );
    expect(
      validAttrValueCheck.call(checkContext, null, null, vNode)
    ).toBeUndefined();
    expect(checkContext._data).toEqual({
      messageKey: 'noId',
      needsReview: 'aria-describedby="test"'
    });
  });

  (shadowSupported ? it : it.skip)(
    'should return undefined on aria-describedby when the element is in a different shadow tree',
    function () {
      const params = shadowCheckSetup(
        '<div></div>',
        '<button id="target" aria-describedby="test">Button</button>'
      );
      expect(
        validAttrValueCheck.apply(checkContext, params as any)
      ).toBeUndefined();
      expect(checkContext._data).toEqual({
        messageKey: 'noIdShadow',
        needsReview: 'aria-describedby="test"'
      });
    }
  );

  it('should return undefined on aria-labelledby when the element is not in the DOM', () => {
    const vNode = queryFixture(
      '<button id="target" aria-labelledby="test">Button</button>'
    );
    expect(
      validAttrValueCheck.call(checkContext, null, null, vNode)
    ).toBeUndefined();
    expect(checkContext._data).toEqual({
      messageKey: 'noId',
      needsReview: 'aria-labelledby="test"'
    });
  });

  (shadowSupported ? it : it.skip)(
    'should return undefined on aria-labelledby when the element is in a different shadow tree',
    function () {
      const params = shadowCheckSetup(
        '<div></div>',
        '<button id="target" aria-labelledby="test">Button</button>'
      );
      expect(
        validAttrValueCheck.apply(checkContext, params as any)
      ).toBeUndefined();
      expect(checkContext._data).toEqual({
        messageKey: 'noIdShadow',
        needsReview: 'aria-labelledby="test"'
      });
    }
  );

  it('should return undefined on aria-current with invalid value', () => {
    const vNode = queryFixture(
      '<button id="target" aria-current="test">Button</button>'
    );
    expect(
      validAttrValueCheck.call(checkContext, null, null, vNode)
    ).toBeUndefined();
  });

  it('should return true on valid aria-labelledby value within img elm', () => {
    const vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" role="button" aria-labelledby="foo"/>'
    );
    expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
      true
    );
  });

  it('should return undefined on invalid aria-labelledby value within img elm', () => {
    const vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" role="button" aria-labelledby="hazaar"/>'
    );
    expect(
      validAttrValueCheck.call(checkContext, null, null, vNode)
    ).toBeUndefined();
  });

  describe('null values', () => {
    afterEach(() => {
      axe.reset();
    });

    it('returns undefined when a boolean attribute is null', () => {
      const vNode = queryFixture(
        '<div id="target" role="checkbox" aria-checked></div>'
      );
      expect(
        validAttrValueCheck.call(checkContext, null, null, vNode)
      ).toBeUndefined();
      expect(checkContext._data).toEqual({
        messageKey: 'empty',
        needsReview: 'aria-checked'
      });
    });

    it('returns undefined when a boolean attribute is empty', () => {
      const vNode = queryFixture(
        '<div id="target" role="checkbox" aria-checked=""></div>'
      );
      expect(
        validAttrValueCheck.call(checkContext, null, null, vNode)
      ).toBeUndefined();
      expect(checkContext._data).toEqual({
        messageKey: 'empty',
        needsReview: 'aria-checked'
      });
    });

    it('returns false for empty string values that are not allowed to be empty', () => {
      axe.configure({
        standards: {
          ariaAttrs: {
            'aria-valuetext': {
              allowEmpty: false
            }
          }
        }
      });
      const vNode = queryFixture(
        '<div id="target" aria-valuetext="" role="range"></div>'
      );
      expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
        false
      );
    });

    it('returns false if there are other issues', () => {
      const vNode = queryFixture(
        '<div id="target" role="checkbox" aria-checked aria-invalid="none"></div>'
      );
      expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
        false
      );
      expect(checkContext._data).toEqual(['aria-invalid="none"']);
    });
  });

  describe('options', () => {
    it('should exclude supplied attributes', () => {
      const vNode = queryFixture(
        '<div id="target" aria-live="nope" aria-describedby="no exist k thx"></div>'
      );
      expect(
        validAttrValueCheck.call(
          checkContext,
          null,
          ['aria-live', 'aria-describedby'],
          vNode
        )
      ).toBe(true);
    });
  });

  describe('SerialVirtualNode', () => {
    it('should return undefined for idref attribute', () => {
      const vNode = new axe.SerialVirtualNode({
        nodeName: 'button',
        attributes: {
          'aria-owns': 'test'
        }
      });

      expect(
        validAttrValueCheck.call(checkContext, null, null, vNode)
      ).toBeUndefined();
      expect(checkContext._data).toEqual({
        messageKey: 'idrefs',
        needsReview: 'aria-owns="test"'
      });
    });

    it('should return true for empty idref attribute', () => {
      const vNode = new axe.SerialVirtualNode({
        nodeName: 'button',
        attributes: {
          'aria-owns': ''
        }
      });
      expect(validAttrValueCheck.call(checkContext, null, null, vNode)).toBe(
        true
      );
    });
  });
});
