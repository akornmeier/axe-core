import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import uniqueFrameTitleEvaluate from '@checks/navigation/unique-frame-title-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const uniqueFrameTitleEvaluateESM = getCheckEvaluateESM(
  uniqueFrameTitleEvaluate
);
describe('unique-frame-title', () => {
  const checkContext = createMockCheckContext();
  afterEach(() => {
    checkContext.reset();
  });

  it('should log title to data and return true', () => {
    const vNode = queryFixture('<iframe id="target" title="bananas"></iframe>');
    expect(
      uniqueFrameTitleEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(true);
    expect(checkContext._data).toBe('bananas');
  });

  it('should convert text to lower case', () => {
    const vNode = queryFixture(
      '<iframe id="target" title="\t  app\t \n \rle  "></iframe>'
    );
    uniqueFrameTitleEvaluateESM.call(checkContext, null, {}, vNode);
    expect(checkContext._data).toBe('app le');
  });

  it('should take out space differences', () => {
    const vNode = queryFixture('<iframe id="target" title="APPLE"></iframe>');
    uniqueFrameTitleEvaluateESM.call(checkContext, null, {}, vNode);
    expect(checkContext._data).toBe('apple');
  });
});
