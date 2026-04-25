import {
  createMockCheckContext,
  checkSetup,
  fixtureSetup,
  shadowSupport,
  checks,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
describe('focusable-content tests', () => {
  var check;
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const shadowSupported = shadowSupport.v1;
  var checkContext = createMockCheckContext();
  beforeAll(() => {
    check = checks['focusable-content'];
  });

  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    checkContext.reset();
  });

  it('returns false when there are no focusable content elements (content element `div` is not focusable)', () => {
    var params = checkSetup(
      '<div id="target">' + '<div> Content </div>' + '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns false when content element is taken out of focusable order (tabindex = -1)', () => {
    var params = checkSetup(
      '<div id="target">' + '<input type="text" tabindex="-1">' + '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns false when element is focusable (only checks if contents are focusable)', () => {
    var params = checkSetup(
      '<div id="target" tabindex="0">' +
        '<p style="height: 200px;"></p>' +
        '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns false when all content elements are not focusable', () => {
    var params = checkSetup(
      '<div id="target">' +
        '<input type="text" tabindex="-1">' +
        '<select tabindex="-1"></select>' +
        '<textarea tabindex="-1"></textarea>' +
        '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns true when one deeply nested content element is focusable', () => {
    var params = checkSetup(
      '<div id="target">' +
        '<div style="height: 200px"> ' +
        '<div style="height: 200px">' +
        '<input type="text">' +
        '</div>' +
        '</div>' +
        '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns true when content element can be focused', () => {
    var params = checkSetup(
      '<div id="target">' + '<input type="text">' + '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns true when any one of the many content elements can be focused', () => {
    var params = checkSetup(
      '<div id="target">' +
        '<input type="text" tabindex="-1">' +
        '<select tabindex="-1"></select>' +
        '<textarea tabindex="-1"></textarea>' +
        '<p style="height: 200px;" tabindex="0"></p>' +
        '</div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  describe('shadowDOM - focusable content', () => {
    beforeAll(() => {
      if (!shadowSupported) {
        this.skip();
      }
    });

    it('returns true when content element can be focused', () => {
      fixtureSetup('<div id="target">' + '</div>');
      var node = fixture.querySelector('#target');
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<input type="text">';
      axe._tree = axe.utils.getFlattenedTree(fixture);
      axe._selectorData = axe.utils.getSelectorData(axe._tree);
      var virtualNode = axe.utils.getNodeFromTree(axe._tree[0], node);
      var actual = check.evaluate.call(checkContext, node, {}, virtualNode);
      expect(actual).toBe(true);
    });

    it('returns false when no focusable content', () => {
      fixtureSetup('<div id="target">' + '</div>');
      var node = fixture.querySelector('#target');
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML =
        '<input type="text" tabindex="-1"> <p>just some text</p>';
      axe._tree = axe.utils.getFlattenedTree(fixture);
      axe._selectorData = axe.utils.getSelectorData(axe._tree);
      var virtualNode = axe.utils.getNodeFromTree(axe._tree[0], node);
      var actual = check.evaluate.call(checkContext, node, {}, virtualNode);
      expect(actual).toBe(false);
    });
  });
});
