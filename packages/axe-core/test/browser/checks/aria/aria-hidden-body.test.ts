import {
  createMockCheckContext,
  getCheckEvaluate,
  flatTreeSetup
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('aria-hidden', () => {
  var checkContext = createMockCheckContext();
  var body = document.body;
  afterEach(() => {
    checkContext.reset();
    body.removeAttribute('aria-hidden');
  });

  it('should not be present on document.body', () => {
    var tree = flatTreeSetup(body);
    expect(
      getCheckEvaluate('aria-hidden-body').call(checkContext, null, {}, tree[0])
    ).toBe(true);
  });

  it('fails appropriately if aria-hidden=true on document.body', () => {
    body.setAttribute('aria-hidden', true);
    var tree = flatTreeSetup(body);
    expect(
      getCheckEvaluate('aria-hidden-body').call(checkContext, null, {}, tree[0])
    ).toBe(false);
  });

  it('passes if aria-hidden=false on document.body', () => {
    body.setAttribute('aria-hidden', 'false');
    var tree = flatTreeSetup(body);
    expect(
      getCheckEvaluate('aria-hidden-body').call(checkContext, null, {}, tree[0])
    ).toBe(true);
  });
});
