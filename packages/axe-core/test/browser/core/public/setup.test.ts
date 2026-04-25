import { axe } from '@helpers/check-helpers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
// FIXME(phase-3-sprint-4b): codemod blocker — uses axe._tree (internal state)
describe('axe.setup', function () {
  afterEach(function () {
    axe.teardown();
  });

  it('should setup the tree', function () {
    axe._tree = undefined;
    axe.setup();
    expect(axe._tree != null).toBe(true);
  });

  it('should default the tree to use html element', function () {
    axe.setup();
    expect(axe._tree[0].actualNode).toBe(document.documentElement);
  });

  it('should use the passed in node as the root of the tree', function () {
    axe.setup(document.body);
    expect(axe._tree[0].actualNode).toBe(document.body);
  });

  it('should return the root node', function () {
    const vNode = axe.setup(document.body);
    expect(vNode.actualNode).toBe(document.body);
  });

  it('should setup selector data', function () {
    axe._selectorData = undefined;
    axe.setup();
    expect(axe._selectorData != null).toBe(true);
  });

  it('takes documentElement when passed the document', () => {
    axe.setup(document);
    expect(axe._tree[0].actualNode).toBe(document.documentElement);
  });

  it('should throw if called twice in a row', function () {
    function fn() {
      axe.setup();
      axe.setup();
    }

    expect(fn).toThrow();
  });
});
