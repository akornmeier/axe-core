import {
  getCheckEvaluateESM,
  flatTreeSetup,
  axe
} from '@helpers/check-helpers';
import titleOnlyEvaluate from '@checks/label/title-only-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const titleOnlyEvaluateESM = getCheckEvaluateESM(titleOnlyEvaluate);
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
    const node = document.createElement('input');
    node.type = 'text';
    node.title = 'Duplicate';

    fixture.appendChild(node);

    flatTreeSetup(fixture);

    expect(
      titleOnlyEvaluateESM(node, undefined, axe.utils.getNodeFromTree(node))
    ).toBe(true);
    node.setAttribute('aria-label', 'woop');
    expect(
      titleOnlyEvaluateESM(node, undefined, axe.utils.getNodeFromTree(node))
    ).toBe(false);
  });

  it('should return true if an element only has aria-describedby', () => {
    const node = document.createElement('input');
    node.type = 'text';
    node.setAttribute('aria-describedby', 'dby');
    const dby = document.createElement('div');
    dby.id = 'dby';
    dby.innerHTML = 'woop';

    fixture.appendChild(node);
    fixture.appendChild(dby);

    flatTreeSetup(fixture);

    expect(
      titleOnlyEvaluateESM(node, undefined, axe.utils.getNodeFromTree(node))
    ).toBe(true);
    node.setAttribute('aria-label', 'woop');
    expect(
      titleOnlyEvaluateESM(node, undefined, axe.utils.getNodeFromTree(node))
    ).toBe(false);
  });
});
