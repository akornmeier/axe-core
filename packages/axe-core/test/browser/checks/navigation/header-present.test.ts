import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM,
  shadowCheckSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import hasDescendantEvaluate from '@checks/generic/has-descendant-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const headerPresentEvaluateESM = getCheckEvaluateESM(hasDescendantEvaluate, {
  selector: ':is(h1, h2, h3, h4, h5, h6):not([role]), [role=heading]'
});
describe('header-present', () => {
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

  it('should return true if h1-h6 is found', () => {
    let params = checkSetup('<h1 id="target">Hi</h1>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );

    params = checkSetup('<h2 id="target">Hi</h2>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );

    params = checkSetup('<h3 id="target">Hi</h3>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );

    params = checkSetup('<h4 id="target">Hi</h4>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );

    params = checkSetup('<h5 id="target">Hi</h5>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );

    params = checkSetup('<h6 id="target">Hi</h6>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );
  });

  it('should return true if role=heading is found', () => {
    const params = checkSetup('<div role="heading" id="target">Hi</div>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      true
    );
  });

  it('should otherwise return false', () => {
    const params = checkSetup('<p id="target">Some stuff and stuff</p>');
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      false
    );
  });

  it('should return false if heading has a different role', () => {
    const params = checkSetup(
      '<h1 role="none" id="target">Some stuff and stuff</h1>'
    );
    expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
      false
    );
  });

  (shadowSupported ? it : it.skip)(
    'should return true if heading is in shadow dom',
    function () {
      const params = shadowCheckSetup('<div id="target"><div>', '<h1></h1>');
      expect(headerPresentEvaluateESM.apply(checkContext, params as any)).toBe(
        true
      );
    }
  );
});
