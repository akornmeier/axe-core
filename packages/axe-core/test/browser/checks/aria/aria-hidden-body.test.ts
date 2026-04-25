import {
  createMockCheckContext,
  getCheckEvaluateESM,
  flatTreeSetup
} from '@helpers/check-helpers';
import ariaHiddenBodyEvaluate from '@checks/aria/aria-hidden-body-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const ariaHiddenBodyEvaluateESM = getCheckEvaluateESM(ariaHiddenBodyEvaluate);
describe('aria-hidden', () => {
  const checkContext = createMockCheckContext();
  const body = document.body;
  afterEach(() => {
    checkContext.reset();
    body.removeAttribute('aria-hidden');
  });

  it('should not be present on document.body', () => {
    const tree = flatTreeSetup(body);
    expect(
      ariaHiddenBodyEvaluateESM.call(checkContext, null, {}, tree[0])
    ).toBe(true);
  });

  it('fails appropriately if aria-hidden=true on document.body', () => {
    body.setAttribute('aria-hidden', true);
    const tree = flatTreeSetup(body);
    expect(
      ariaHiddenBodyEvaluateESM.call(checkContext, null, {}, tree[0])
    ).toBe(false);
  });

  it('passes if aria-hidden=false on document.body', () => {
    body.setAttribute('aria-hidden', 'false');
    const tree = flatTreeSetup(body);
    expect(
      ariaHiddenBodyEvaluateESM.call(checkContext, null, {}, tree[0])
    ).toBe(true);
  });
});
