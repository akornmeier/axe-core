import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  flatTreeSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
/* global it.skip */
describe('hidden content', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = undefined;
  });

  it('should return undefined with display:none and children', () => {
    const params = checkSetup(
      '<div id="target" style="display: none;"><p>Some paragraph text.</p></div>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBeUndefined();
  });

  it('should return undefined with visibility:hidden and children', () => {
    const params = checkSetup(
      '<div id="target" style="visibility: hidden;"><p>Some paragraph text.</p></div>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBeUndefined();
  });

  it('should return true with visibility:hidden and parent with visibility:hidden', () => {
    const params = checkSetup(
      '<div style="visibility: hidden;"><p id="target" style="visibility: hidden;">Some paragraph text.</p></div>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should return true with aria-hidden and no content', () => {
    const params = checkSetup(
      '<span id="target" class="icon" aria-hidden="true"></span>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should skip whitelisted elements', () => {
    const node = document.querySelector('head');
    flatTreeSetup(document.documentElement);
    const virtualNode = axe.utils.getNodeFromTree(node);
    expect(
      getCheckEvaluate('hidden-content')(node, undefined, virtualNode)
    ).toBe(true);
  });

  (shadowSupport ? it : it.skip)(
    'works on elements in a shadow DOM',
    function () {
      fixture.innerHTML =
        '<div id="shadow"> <div id="content">text</div> </div>';
      const shadowRoot = document
        .getElementById('shadow')
        .attachShadow({ mode: 'open' });
      shadowRoot.innerHTML =
        '<div id="target" style="display:none">' + '<slot></slot>' + '</div>';
      flatTreeSetup(fixture);

      const shadow = document.querySelector('#shadow');
      const virtualShadow = axe.utils.getNodeFromTree(shadow);
      expect(
        getCheckEvaluate('hidden-content')(shadow, undefined, virtualShadow)
      ).toBe(true);

      const target = shadowRoot.querySelector('#target');
      const virtualTarget = axe.utils.getNodeFromTree(target);
      expect(
        getCheckEvaluate('hidden-content')(target, undefined, virtualTarget)
      ).toBeUndefined();

      const content = document.querySelector('#content');
      const virtualContent = axe.utils.getNodeFromTree(content);
      expect(
        getCheckEvaluate('hidden-content')(content, undefined, virtualContent)
      ).toBe(true);
    }
  );
});
