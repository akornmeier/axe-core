import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('unique-frame-title', () => {
  var checkContext = createMockCheckContext();
  afterEach(() => {
    checkContext.reset();
  });

  it('should log title to data and return true', () => {
    var vNode = queryFixture('<iframe id="target" title="bananas"></iframe>');
    expect(
      getCheckEvaluate('unique-frame-title').call(checkContext, null, {}, vNode)
    ).toBe(true);
    expect(checkContext._data).toBe('bananas');
  });

  it('should convert text to lower case', () => {
    var vNode = queryFixture(
      '<iframe id="target" title="\t  app\t \n \rle  "></iframe>'
    );
    getCheckEvaluate('unique-frame-title').call(checkContext, null, {}, vNode);
    expect(checkContext._data).toBe('app le');
  });

  it('should take out space differences', () => {
    var vNode = queryFixture('<iframe id="target" title="APPLE"></iframe>');
    getCheckEvaluate('unique-frame-title').call(checkContext, null, {}, vNode);
    expect(checkContext._data).toBe('apple');
  });
});
