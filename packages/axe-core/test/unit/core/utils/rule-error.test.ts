import { assert, describe, expect, it } from 'vitest';
import RuleError from '../../../../lib/core/utils/rule-error';
import serializeError from '../../../../lib/core/utils/serialize-error';

describe('utils.RuleError', () => {
  it('returns a serializable error', () => {
    const error = new Error('test');
    const ruleError = new RuleError({ error });
    assert.ownInclude(ruleError, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  });

  it('returns a instanceof Error', () => {
    const error = new Error('test');
    const ruleError = new RuleError({ error });
    assert.instanceOf(ruleError, Error);
  });

  it('includes the ruleId if provided', () => {
    const error = new Error('test');
    const ruleError = new RuleError({ error, ruleId: 'aria' });
    expect(ruleError.ruleId).toBe('aria');
    expect(ruleError.message).toContain('Skipping aria rule.');
  });

  it('includes the method if provided', () => {
    const error = new Error('test');
    const ruleError = new RuleError({ error, method: '#matches' });
    expect(ruleError.method).toBe('#matches');
  });

  it('includes the errorNode if provided', () => {
    const error = new Error('test');
    const ruleError = new RuleError({ error, errorNode: 'err' });
    expect(ruleError.errorNode).toBe('err');
  });

  it('includes a serialized cause if provided', () => {
    const error = new Error('test');
    error.cause = new Error('cause');
    const ruleError = new RuleError({ error });
    expect(ruleError.cause).toEqual(serializeError(error.cause));
  });
});
