import {
  getCheckEvaluate,
  flatTreeSetup,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('title-only', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
  });

  it('should return true if an element only has a title', () => {
    var node = document.createElement('input');
    node.type = 'text';
    node.title = 'Duplicate';

    fixture.appendChild(node);

    flatTreeSetup(fixture);

    expect(
      getCheckEvaluate('title-only')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
    node.setAttribute('aria-label', 'woop');
    expect(
      getCheckEvaluate('title-only')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return true if an element only has aria-describedby', () => {
    var node = document.createElement('input');
    node.type = 'text';
    node.setAttribute('aria-describedby', 'dby');
    var dby = document.createElement('div');
    dby.id = 'dby';
    dby.innerHTML = 'woop';

    fixture.appendChild(node);
    fixture.appendChild(dby);

    flatTreeSetup(fixture);

    expect(
      getCheckEvaluate('title-only')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
    node.setAttribute('aria-label', 'woop');
    expect(
      getCheckEvaluate('title-only')(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });
});
