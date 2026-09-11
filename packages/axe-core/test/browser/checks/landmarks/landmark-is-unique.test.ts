import {
  createMockCheckContext,
  fixtureSetup,
  getCheckEvaluate,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('landmark-is-unique', () => {
  const checkContext = new createMockCheckContext();
  let fixture;
  let axeFixtureSetup;

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
    const node = fixture.querySelector('div');
    const expectedData = {
      accessibleText: null,
      role: 'main'
    };
    axe._tree = axe.utils.getFlattenedTree(fixture);
    const virtualNode = axe.utils.getNodeFromTree(axe._tree[0], node);
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
    const node = fixture.querySelector('div');
    const expectedData = {
      accessibleText: 'test text',
      role: 'main'
    };
    axe._tree = axe.utils.getFlattenedTree(fixture);
    const virtualNode = axe.utils.getNodeFromTree(axe._tree[0], node);
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
