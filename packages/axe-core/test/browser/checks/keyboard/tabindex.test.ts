import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluate,
  flatTreeSetup
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('tabindex', () => {
  var checkContext = createMockCheckContext();
  afterEach(() => {
    checkContext.reset();
  });

  it('should fail if the testutils.jstabindex is >= 0', () => {
    var vNode = queryFixture('<div id="target" tabindex="1"></div>');
    expect(
      getCheckEvaluate('tabindex').call(checkContext, null, {}, vNode)
    ).toBe(false);
  });

  it('should pass if the tabindex is <= 0', () => {
    var vNode = queryFixture('<div id="target" tabindex="0"></div>');
    expect(
      getCheckEvaluate('tabindex').call(checkContext, null, {}, vNode)
    ).toBe(true);
  });

  it('should look at the attribute and not the property', () => {
    var node = document.createElement('div');
    node.setAttribute('tabindex', '1');
    node.tabindex = null;
    var tree = flatTreeSetup(node);
    expect(
      getCheckEvaluate('tabindex').call(checkContext, null, {}, tree[0])
    ).toBe(false);
  });

  it('should pass if tabindex is NaN', () => {
    var vNode = queryFixture('<div id="target" tabindex="foobar"></div>');
    expect(
      getCheckEvaluate('tabindex').call(checkContext, null, {}, vNode)
    ).toBe(true);
  });
});
