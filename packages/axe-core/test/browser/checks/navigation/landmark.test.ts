import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluateESM,
  shadowSupport
} from '@helpers/check-helpers';
import hasDescendantEvaluate from '@checks/generic/has-descendant-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const landmarkEvaluateESM = getCheckEvaluateESM(hasDescendantEvaluate, {
  selector: 'main, [role=main]'
});
describe('landmark', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = landmarkEvaluateESM;
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true when role=main is found', () => {
    const checkArgs = checkSetup('<div role="main"></div>', '#fixture');
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should return true when <main> is found', () => {
    const checkArgs = checkSetup('<main></main>', '#fixture');
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
  });

  it('should otherwise return false', () => {
    const checkArgs = checkSetup('<div role="contentinfo"></div>', '#fixture');
    expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should not automatically pass if there is a shadow tree',
    function () {
      const node = document.createElement('div');
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<div></div>';
      const checkArgs = checkSetup(node, '#fixture');

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(false);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should find elements inside shadow trees',
    function () {
      const node = document.createElement('div');
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<main></main>';
      const checkArgs = checkSetup(node, '#fixture');

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should find elements slotted in shadow trees',
    function () {
      const node = document.createElement('div');
      node.innerHTML = '<main></main>';
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<slot></slot>';
      const checkArgs = checkSetup(node, '#fixture');

      expect(checkEvaluate.apply(checkContext, checkArgs)).toBe(true);
    }
  );
});
