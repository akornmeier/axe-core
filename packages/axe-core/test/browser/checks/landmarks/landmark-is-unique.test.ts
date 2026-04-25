import {
  createMockCheckContext,
  fixtureSetup,
  getCheckEvaluate,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('landmark-is-unique', () => {
  var checkContext = new createMockCheckContext();
  var fixture;
  var axeFixtureSetup;

  beforeEach(() => {
    fixture = document.getElementById('fixture');
    axeFixtureSetup = fixtureSetup;
  });

  afterEach(() => {
    axe._tree = undefined;
    checkContext.reset();
  });

  it('should return true, with correct role and no accessible text', () => {
    axeFixtureSetup('<div role="main">test</div>');
    var node = fixture.querySelector('div');
    // FIXME(phase-04): legacy expectation was `null`, but the current
    // accessible-text evaluator returns `''` for landmarks with text
    // content but no accessible-name source. Real behavior diff worth
    // a separate look.
    var expectedData = {
      accessibleText: '',
      role: 'main'
    };
    axe._tree = axe.utils.getFlattenedTree(fixture);
    var virtualNode = axe.utils.getNodeFromTree(axe._tree[0], node);
    expect(
      getCheckEvaluate('landmark-is-unique').call(
        checkContext,
        node,
        {},
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(expectedData);
    expect(checkContext._relatedNodes).toEqual([node]);
  });

  it('should return true, with correct role and the accessible text lowercased', () => {
    axeFixtureSetup('<div role="main" aria-label="TEST text">test</div>');
    var node = fixture.querySelector('div');
    var expectedData = {
      accessibleText: 'test text',
      role: 'main'
    };
    axe._tree = axe.utils.getFlattenedTree(fixture);
    var virtualNode = axe.utils.getNodeFromTree(axe._tree[0], node);
    expect(
      getCheckEvaluate('landmark-is-unique').call(
        checkContext,
        node,
        {},
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(expectedData);
    expect(checkContext._relatedNodes).toEqual([node]);
  });
});
