import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('header-present', () => {
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

  it('should return true if h1-h6 is found', () => {
    var params = checkSetup('<h1 id="target">Hi</h1>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(true);

    params = checkSetup('<h2 id="target">Hi</h2>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(true);

    params = checkSetup('<h3 id="target">Hi</h3>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(true);

    params = checkSetup('<h4 id="target">Hi</h4>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(true);

    params = checkSetup('<h5 id="target">Hi</h5>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(true);

    params = checkSetup('<h6 id="target">Hi</h6>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should return true if role=heading is found', () => {
    var params = checkSetup('<div role="heading" id="target">Hi</div>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should otherwise return false', () => {
    var params = checkSetup('<p id="target">Some stuff and stuff</p>');
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(false);
  });

  it('should return false if heading has a different role', () => {
    var params = checkSetup(
      '<h1 role="none" id="target">Some stuff and stuff</h1>'
    );
    expect(
      getCheckEvaluate('header-present').apply(checkContext, params as any)
    ).toBe(false);
  });

  (shadowSupported ? it : it.skip)(
    'should return true if heading is in shadow dom',
    function () {
      var params = shadowCheckSetup('<div id="target"><div>', '<h1></h1>');
      expect(
        getCheckEvaluate('header-present').apply(checkContext, params as any)
      ).toBe(true);
    }
  );
});
