import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluateESM,
  flatTreeSetup
} from '@helpers/check-helpers';
import tabindexEvaluate from '@checks/keyboard/tabindex-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const tabindexEvaluateESM = getCheckEvaluateESM(tabindexEvaluate);
describe('tabindex', () => {
  const checkContext = createMockCheckContext();
  afterEach(() => {
    checkContext.reset();
  });

  it('should fail if the testutils.jstabindex is >= 0', () => {
    const vNode = queryFixture('<div id="target" tabindex="1"></div>');
    expect(tabindexEvaluateESM.call(checkContext, null, {}, vNode)).toBe(false);
  });

  it('should pass if the tabindex is <= 0', () => {
    const vNode = queryFixture('<div id="target" tabindex="0"></div>');
    expect(tabindexEvaluateESM.call(checkContext, null, {}, vNode)).toBe(true);
  });

  it('should look at the attribute and not the property', () => {
    const node = document.createElement('div');
    node.setAttribute('tabindex', '1');
    node.tabindex = null;
    const tree = flatTreeSetup(node);
    expect(tabindexEvaluateESM.call(checkContext, null, {}, tree[0])).toBe(
      false
    );
  });

  it('should pass if tabindex is NaN', () => {
    const vNode = queryFixture('<div id="target" tabindex="foobar"></div>');
    expect(tabindexEvaluateESM.call(checkContext, null, {}, vNode)).toBe(true);
  });
});
