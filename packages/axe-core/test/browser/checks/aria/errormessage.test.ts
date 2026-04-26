import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluateESM,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import ariaErrormessageEvaluate from '@checks/aria/aria-errormessage-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const ariaErrormessageEvaluateESM = getCheckEvaluateESM(
  ariaErrormessageEvaluate
);
describe('aria-errormessage', () => {
  const shadowSupported = shadowSupport.v1;
  const checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
  });

  it('should return false if aria-errormessage value is invalid', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage="plain" aria-invalid="true">' +
        '<div id="plain"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
  });

  it('should return undefined if aria-errormessage references an element that does not exist', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage="plain" aria-invalid="true">' +
        '<div></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBeUndefined();
  });

  it('should return true if aria-errormessage id is alert', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage="alert" aria-invalid="true">' +
        '<div id="alert" role="alert"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('should return true if aria-errormessage id is aria-live=assertive', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage="live" aria-invalid="true">' +
        '<div id="live" aria-live="assertive"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('should return true if aria-errormessage id is aria-describedby', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage="plain" aria-describedby="plain" aria-invalid="true">' +
        '<div id="plain"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('should return false if aria-errormessage has multiple ids (unsupported)', () => {
    const vNode = queryFixture(
      '<input id="target" aria-invalid="true" aria-describedby="error1 error2" aria-errormessage="error1 error2">' +
        '<div id="error1">Error 1</div>' +
        '<div id="error2">Error 2</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'unsupported',
      values: ['error1', 'error2']
    });
  });

  it('should return false if aria-errormessage has multiple ids even when one is in aria-describedby', () => {
    const vNode = queryFixture(
      '<input id="target" aria-invalid="true" aria-describedby="error1" aria-errormessage="error1 error2">' +
        '<div id="error1">Error 1</div>' +
        '<div id="error2">Error 2</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'unsupported',
      values: ['error1', 'error2']
    });
  });

  it('should return false if aria-errormessage has multiple ids even when none are in aria-describedby', () => {
    const vNode = queryFixture(
      '<input id="target" aria-invalid="true" aria-describedby="other" aria-errormessage="error1 error2">' +
        '<div id="other">Other</div>' +
        '<div id="error1">Error 1</div>' +
        '<div id="error2">Error 2</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'unsupported',
      values: ['error1', 'error2']
    });
  });

  it('sets an unsupported message when aria-errormessage contains multiple ids', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage=" foo  bar \tbaz  " aria-invalid="true">' +
        '<div id="plain"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'unsupported',
      values: ['foo', 'bar', 'baz']
    });
  });

  it('returns true when aria-errormessage is empty, if that is allowed', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-errormessage': {
            allowEmpty: true
          }
        }
      }
    });
    const vNode = queryFixture(
      '<div id="target" aria-errormessage=" " aria-invalid="true"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('should return true when aria-invalid is not set', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage="plain">' + '<div id="plain"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('should return true when aria-invalid=false', () => {
    const vNode = queryFixture(
      '<div id="target" aria-errormessage="plain" aria-invalid="false">' +
        '<div id="plain"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns false when aria-errormessage is empty, if that is not allowed', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-errormessage': {
            allowEmpty: false
          }
        }
      }
    });
    const vNode = queryFixture(
      '<div id="target" aria-errormessage=" " aria-invalid="true"></div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
  });

  it('should return false when hidden attribute is used', () => {
    const vNode = queryFixture(
      '<input type="text" id="target" aria-invalid="true" aria-errormessage="id-message-1">' +
        '<div id="id-message-1" hidden>Error message 1</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'hidden',
      values: ['id-message-1']
    });
  });

  it('should return false when display: "none" is used', () => {
    const vNode = queryFixture(
      '<input type="text" id="target" aria-invalid="true" aria-errormessage="id-message-1">' +
        '<div id="id-message-1" style="display: none">Error message 1</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'hidden',
      values: ['id-message-1']
    });
  });

  it('should return false when visibility: "hidden" is used', () => {
    const vNode = queryFixture(
      '<input type="text" id="target" aria-invalid="true" aria-errormessage="id-message-1">' +
        '<div id="id-message-1" style="visibility: hidden">Error message 1</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'hidden',
      values: ['id-message-1']
    });
  });

  it('should return false when aria-hidden=true is used', () => {
    const vNode = queryFixture(
      '<input type="text" id="target" aria-invalid="true" aria-errormessage="id-message-1">' +
        '<div id="id-message-1" aria-hidden="true">Error message 1</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'hidden',
      values: ['id-message-1']
    });
  });

  it('should return true when aria-hidden=false is used', () => {
    const vNode = queryFixture(
      '<input type="text" id="target" aria-invalid="true" aria-errormessage="id-message-1">' +
        '<div id="id-message-1" aria-live="assertive" aria-hidden="false">Error message 1</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('should return true when no hidden functionality is used', () => {
    const vNode = queryFixture(
      '<input type="text" id="target" aria-invalid="true" aria-errormessage="id-message-1">' +
        '<div id="id-message-1" aria-live="assertive">Error message 1</div>'
    );
    expect(
      ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  (shadowSupported ? it : it.skip)(
    'should return undefined if aria-errormessage value crosses shadow boundary',
    function () {
      const params = shadowCheckSetup(
        '<div id="target" aria-errormessage="live" aria-invalid="true"></div>',
        '<div id="live" aria-live="assertive"></div>'
      );
      expect(
        ariaErrormessageEvaluateESM.apply(checkContext, params as any)
      ).toBeUndefined();
    }
  );

  (shadowSupported ? it : it.skip)(
    'should return false if aria-errormessage and invalid reference are both inside shadow dom',
    function () {
      const params = shadowCheckSetup(
        '<div></div>',
        '<div id="target" aria-errormessage="live" aria-invalid="true"></div>' +
          '<div id="live"></div>'
      );
      expect(
        ariaErrormessageEvaluateESM.apply(checkContext, params as any)
      ).toBe(false);
    }
  );

  (shadowSupported ? it : it.skip)(
    'should return true if aria-errormessage and valid reference are both inside shadow dom',
    function () {
      const params = shadowCheckSetup(
        '<div></div>',
        '<div id="target" aria-errormessage="live" aria-invalid="true"></div>' +
          '<div id="live" aria-live="assertive"></div>'
      );
      expect(
        ariaErrormessageEvaluateESM.apply(checkContext, params as any)
      ).toBe(true);
    }
  );

  describe('SerialVirtualNode', () => {
    it('should return undefined', () => {
      const vNode = new axe.SerialVirtualNode({
        nodeName: 'div',
        attributes: {
          'aria-invalid': 'true',
          'aria-errormessage': 'test'
        }
      });
      expect(
        ariaErrormessageEvaluateESM.call(checkContext, null, null, vNode)
      ).toBeUndefined();
      expect(checkContext._data).toEqual({
        messageKey: 'idrefs',
        values: ['test']
      });
    });
  });
});
