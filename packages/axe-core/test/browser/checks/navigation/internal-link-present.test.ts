import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluateESM,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import internalLinkPresentEvaluate from '@checks/navigation/internal-link-present-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const internalLinkPresentEvaluateESM = getCheckEvaluateESM(
  internalLinkPresentEvaluate
);
describe('internal-link-present', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const shadowSupported = shadowSupport.v1;
  const checkContext = createMockCheckContext();
  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    checkContext.reset();
  });

  it('should return true when an internal link is found', () => {
    const vNode = queryFixture('<div id="target"><a href="#haha">hi</a></div>');
    expect(
      internalLinkPresentEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(true);
  });

  it('should return false when a hashbang URL was used', () => {
    const vNode = queryFixture('<div id="target"><a href="#!foo">hi</a></div>');
    expect(
      internalLinkPresentEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(false);
  });

  it('should return false when a hash route URL was used', () => {
    const vNode = queryFixture(
      '<div id="target"><a href="#/home">hi</a></div>'
    );
    expect(
      internalLinkPresentEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(false);
  });

  it('should return false when a hashbang + slash route URL was used', () => {
    const vNode = queryFixture(
      '<div id="target"><a href="#!/home">hi</a></div>'
    );
    expect(
      internalLinkPresentEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(false);
  });

  it('should otherwise return false', () => {
    const vNode = queryFixture(
      '<div id="target"><a href="http://www.deque.com/#haha">hi</a></div>'
    );
    expect(
      internalLinkPresentEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(false);
  });

  (shadowSupported ? it : it.skip)(
    'should return true when internal link is found in shadow dom',
    function () {
      const params = shadowCheckSetup(
        '<div id="target"></div>',
        '<a href="#haha">hi</a>'
      );
      const vNode = params[2];
      expect(
        internalLinkPresentEvaluateESM.call(checkContext, null, {}, vNode)
      ).toBe(true);
    }
  );
});
