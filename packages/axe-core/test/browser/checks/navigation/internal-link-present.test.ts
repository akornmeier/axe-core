import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('internal-link-present', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const shadowSupported = shadowSupport.v1;
  var checkContext = createMockCheckContext();
  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    checkContext.reset();
  });

  it('should return true when an internal link is found', () => {
    var vNode = queryFixture('<div id="target"><a href="#haha">hi</a></div>');
    expect(
      getCheckEvaluate('internal-link-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(true);
  });

  it('should return false when a hashbang URL was used', () => {
    var vNode = queryFixture('<div id="target"><a href="#!foo">hi</a></div>');
    expect(
      getCheckEvaluate('internal-link-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);
  });

  it('should return false when a hash route URL was used', () => {
    var vNode = queryFixture('<div id="target"><a href="#/home">hi</a></div>');
    expect(
      getCheckEvaluate('internal-link-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);
  });

  it('should return false when a hashbang + slash route URL was used', () => {
    var vNode = queryFixture('<div id="target"><a href="#!/home">hi</a></div>');
    expect(
      getCheckEvaluate('internal-link-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);
  });

  it('should otherwise return false', () => {
    var vNode = queryFixture(
      '<div id="target"><a href="http://www.deque.com/#haha">hi</a></div>'
    );
    expect(
      getCheckEvaluate('internal-link-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);
  });

  (shadowSupported ? it : it.skip)(
    'should return true when internal link is found in shadow dom',
    function () {
      var params = shadowCheckSetup(
        '<div id="target"></div>',
        '<a href="#haha">hi</a>'
      );
      var vNode = params[2];
      expect(
        getCheckEvaluate('internal-link-present').call(
          checkContext,
          null,
          {},
          vNode
        )
      ).toBe(true);
    }
  );
});
