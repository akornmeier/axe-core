import {
  createMockCheckContext,
  getCheckEvaluate,
  flatTreeSetup
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('valid-scrollable-semantics', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext._data = null;
  });

  it('should return false for role=banner', () => {
    var node = document.createElement('div');
    node.setAttribute('role', '"banner');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(false);
  });

  it('should return false for role=search', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'search');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(false);
  });

  it('should return true for role=form', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'form');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=navigation', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'navigation');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=complementary', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'complementary');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=contentinfo', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'contentinfo');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=main', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'main');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=region', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'region');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=alertdialog', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'alertdialog');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=article', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'article');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=dialog', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'dialog');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for nav elements', () => {
    var node = document.createElement('nav');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for section elements', () => {
    var node = document.createElement('section');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for article elements', () => {
    var node = document.createElement('article');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for aside elements', () => {
    var node = document.createElement('aside');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=tabpanel', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'tabpanel');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  it('should return true for role=tooltip', () => {
    var node = document.createElement('div');
    node.setAttribute('role', 'tooltip');
    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      getCheckEvaluate('valid-scrollable-semantics').call(checkContext, node)
    ).toBe(true);
  });

  describe('options', () => {
    it('should allow options.roles to return true for role', () => {
      var node = document.createElement('div');
      node.setAttribute('role', 'banner');
      fixture.appendChild(node);
      flatTreeSetup(fixture);
      expect(
        getCheckEvaluate('valid-scrollable-semantics').call(
          checkContext,
          node,
          { roles: ['banner'] }
        )
      ).toBe(true);
    });
  });
});
