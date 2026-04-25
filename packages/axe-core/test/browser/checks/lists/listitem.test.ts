import {
  createMockCheckContext,
  checkSetup,
  fixtureSetup,
  getCheckEvaluate,
  shadowSupport,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('listitem', () => {
  var checkContext = createMockCheckContext();
  var checkEvaluate = getCheckEvaluate('listitem');

  afterEach(() => {
    checkContext.reset();
  });

  it('should pass if the listitem has a parent <ol>', () => {
    var params = checkSetup('<ol><li id="target">My list item</li></ol>');
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(true);
  });

  it('should pass if the listitem has a parent <ul>', () => {
    var params = checkSetup('<ul><li id="target">My list item</li></ul>');
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(true);
  });

  it('should pass if the listitem has a parent role=list', () => {
    var params = checkSetup(
      '<div role="list"><li id="target">My list item</li></div>'
    );
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(true);
  });

  it('should pass if the listitem has a parent role=none', () => {
    var params = checkSetup(
      '<ul role="none"><li id="target">My list item</li></ul>'
    );
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(true);
  });

  it('should pass if the listitem has a parent role=presentation', () => {
    var params = checkSetup(
      '<ul role="presentation"><li id="target">My list item</li></ul>'
    );
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(true);
  });

  it('should fail if the listitem has an incorrect parent', () => {
    var params = checkSetup('<div><li id="target">My list item</li></div>');
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(false);
  });

  it('should fail if the listitem has a parent <ol> with changed role', () => {
    var params = checkSetup(
      '<ol role="menubar"><li id="target">My list item</li></ol>'
    );
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(false);
    expect(checkContext._data.messageKey).toBe('roleNotValid');
  });

  it('should pass if the listitem has a parent <ol> with an invalid role', () => {
    var params = checkSetup(
      '<ol role="invalid-role"><li id="target">My list item</li></ol>'
    );
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(true);
  });

  it('should pass if the listitem has a parent <ol> with an abstract role', () => {
    var params = checkSetup(
      '<ol role="section"><li id="target">My list item</li></ol>'
    );
    var result = checkEvaluate.apply(checkContext, params as any);
    expect(result).toBe(true);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should return true in a shadow DOM pass',
    function () {
      var node = document.createElement('div');
      node.innerHTML = '<li id="target">My list item </li>';
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<ul><slot></slot></ul>';
      fixtureSetup(node);
      var target = node.querySelector('#target');
      var virtualTarget = axe.utils.getNodeFromTree(target);
      var result = checkEvaluate.apply(checkContext, [
        target,
        {},
        virtualTarget
      ] as any);
      expect(result).toBe(true);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should return false in a shadow DOM fail',
    function () {
      var node = document.createElement('div');
      node.innerHTML = '<li id="target">My list item </li>';
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<div><slot></slot></div>';
      fixtureSetup(node);
      var target = node.querySelector('#target');
      var virtualTarget = axe.utils.getNodeFromTree(target);
      var result = checkEvaluate.apply(checkContext, [
        target,
        {},
        virtualTarget
      ] as any);
      expect(result).toBe(false);
    }
  );
});
