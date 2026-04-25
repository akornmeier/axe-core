import {
  createMockCheckContext,
  checkSetup,
  checks,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('unsupportedattr', () => {
  var checkContext = createMockCheckContext();
  var check = checks['aria-unsupported-attr'];

  afterEach(() => {
    checkContext.reset();
    axe.reset();
  });

  it('should return true if applied to an unsupported attribute', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-mccheddarton': {
            unsupported: true
          }
        }
      }
    });

    var params = checkSetup(
      '<div id="target" aria-mccheddarton="true">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true with multiple unsupported and supported attributes', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-mccheddarton': {
            unsupported: true
          },
          'aria-bagleypants': {
            unsupported: true
          }
        }
      }
    });
    var params = checkSetup(
      '<div id="target" aria-mccheddarton="true" aria-bagleypants="false" aria-label="Nope">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual([
      'aria-mccheddarton',
      'aria-bagleypants'
    ]);
  });

  it('should return false if applied to a supported attribute', () => {
    var params = checkSetup(
      '<div id="target" aria-label="This is fine">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return false if all ARIA attributes are supported', () => {
    var params = checkSetup(
      '<div id="target" aria-label="This is fine" aria-haspopup="true">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return false if applied to an element that matches the unsupported "exceptions" list', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-mccheddarton': {
            unsupported: {
              exceptions: ['button']
            }
          }
        }
      }
    });
    var params = checkSetup(
      '<button id="target" aria-mccheddarton="true">Contents</button>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return false if applied to an element that matches the unsupported "exceptions" list using complex conditions', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-mccheddarton': {
            unsupported: {
              exceptions: [
                {
                  nodeName: 'input',
                  properties: {
                    type: 'checkbox'
                  }
                }
              ]
            }
          }
        }
      }
    });
    var params = checkSetup(
      '<input type="checkbox" id="target" aria-mccheddarton="true">'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(false);
  });

  it('should return true if applied to an element that does not match the unsupported "exceptions" list', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-mccheddarton': {
            unsupported: {
              exceptions: ['button']
            }
          }
        }
      }
    });
    var params = checkSetup(
      '<div id="target" aria-mccheddarton="true">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
  });

  it('should return true if applied to an element that does not match the unsupported "exceptions" list using complex conditions', () => {
    axe.configure({
      standards: {
        ariaAttrs: {
          'aria-mccheddarton': {
            unsupported: {
              exceptions: [
                {
                  nodeName: 'input',
                  properties: {
                    type: 'checkbox'
                  }
                }
              ]
            }
          }
        }
      }
    });
    var params = checkSetup(
      '<input type="radio" id="target" aria-mccheddarton="true">'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
  });
});
