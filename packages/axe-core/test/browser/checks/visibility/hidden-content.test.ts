import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  flatTreeSetup,
  shadowSupport,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
/* global it.skip */
describe('hidden content', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = undefined;
  });

  it('should return undefined with display:none and children', () => {
    var params = checkSetup(
      '<div id="target" style="display: none;"><p>Some paragraph text.</p></div>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBeUndefined();
  });

  it('should return undefined with visibility:hidden and children', () => {
    var params = checkSetup(
      '<div id="target" style="visibility: hidden;"><p>Some paragraph text.</p></div>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBeUndefined();
  });

  it('should return true with visibility:hidden and parent with visibility:hidden', () => {
    var params = checkSetup(
      '<div style="visibility: hidden;"><p id="target" style="visibility: hidden;">Some paragraph text.</p></div>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should return true with aria-hidden and no content', () => {
    var params = checkSetup(
      '<span id="target" class="icon" aria-hidden="true"></span>'
    );
    expect(
      getCheckEvaluate('hidden-content').apply(checkContext, params as any)
    ).toBe(true);
  });

  it('should skip whitelisted elements', () => {
    var node = document.querySelector('head');
    flatTreeSetup(document.documentElement);
    var virtualNode = axe.utils.getNodeFromTree(node);
    expect(
      getCheckEvaluate('hidden-content')(node, undefined, virtualNode)
    ).toBe(true);
  });

  (shadowSupport ? it : it.skip)(
    'works on elements in a shadow DOM',
    function () {
      fixture.innerHTML =
        '<div id="shadow"> <div id="content">text</div> </div>';
      var shadowRoot = document
        .getElementById('shadow')
        .attachShadow({ mode: 'open' });
      shadowRoot.innerHTML =
        '<div id="target" style="display:none">' + '<slot></slot>' + '</div>';
      flatTreeSetup(fixture);

      var shadow = document.querySelector('#shadow');
      var virtualShadow = axe.utils.getNodeFromTree(shadow);
      expect(
        getCheckEvaluate('hidden-content')(shadow, undefined, virtualShadow)
      ).toBe(true);

      var target = shadowRoot.querySelector('#target');
      var virtualTarget = axe.utils.getNodeFromTree(target);
      expect(
        getCheckEvaluate('hidden-content')(target, undefined, virtualTarget)
      ).toBeUndefined();

      var content = document.querySelector('#content');
      var virtualContent = axe.utils.getNodeFromTree(content);
      expect(
        getCheckEvaluate('hidden-content')(content, undefined, virtualContent)
      ).toBe(true);
    }
  );
});
