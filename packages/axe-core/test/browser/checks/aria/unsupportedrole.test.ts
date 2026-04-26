import {
  createMockCheckContext,
  checkSetup,
  axe
} from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import { describe, it, expect, afterEach } from 'vitest';
const audit = createSyntheticAudit(['unsupportedrole']);

describe('unsupportedrole', () => {
  const checkContext = createMockCheckContext();
  const check = audit.checks['unsupportedrole'];
  afterEach(() => {
    checkContext.reset();
    axe.reset();
  });

  it('should return true if applied to an unsupported role', () => {
    axe.configure({
      standards: {
        ariaRoles: {
          mccheddarton: {
            type: 'widget',
            unsupported: true
          }
        }
      }
    });

    const params = checkSetup(
      '<div id="target" role="mccheddarton">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual('mccheddarton');
  });

  it('should return false if applied to a supported role', () => {
    const alertParams = checkSetup(
      '<div id="target" role="alert">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, alertParams as any)).toBe(false);
    expect(checkContext._data).toBeNull();

    const buttonParams = checkSetup('<button id="target">Contents</button>');
    expect(check.evaluate.apply(checkContext, buttonParams as any)).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if applied to an invalid role', () => {
    const params = checkSetup('<input id="target" role="foo">');
    expect(check.evaluate.apply(checkContext, params as any)).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return true if applied to an unsupported dpub role', () => {
    axe.configure({
      standards: {
        ariaRoles: {
          'doc-abstract': {
            type: 'section',
            unsupported: true
          }
        }
      }
    });

    const params = checkSetup(
      '<div id="target" role="doc-abstract">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual('doc-abstract');
  });

  it('should return true if applied to an unsupported fallback role', () => {
    axe.configure({
      standards: {
        ariaRoles: {
          alert: {
            type: 'widget',
            unsupported: true
          }
        }
      }
    });

    const params = checkSetup(
      '<div id="target" role="unsupported alert">Contents</div>'
    );
    expect(check.evaluate.apply(checkContext, params as any)).toBe(true);
    expect(checkContext._data).toEqual('alert');
  });
});
