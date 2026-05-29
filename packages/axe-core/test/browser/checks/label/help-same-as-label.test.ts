import {
  getCheckEvaluateESM,
  flatTreeSetup,
  axe
} from '@helpers/check-helpers';
import helpSameAsLabelEvaluate from '@checks/label/help-same-as-label-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const helpSameAsLabelEvaluateESM = getCheckEvaluateESM(helpSameAsLabelEvaluate);
describe('help-same-as-label', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
  });

  it('should return true if an element has a label and a title with the same text', () => {
    const node = document.createElement('input');
    node.type = 'text';
    node.title = 'Duplicate';
    node.setAttribute('aria-label', 'Duplicate');

    fixture.appendChild(node);
    flatTreeSetup(fixture);
    expect(
      helpSameAsLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
  });

  it('should return true if an element has a label and aria-describedby with the same text', () => {
    const node = document.createElement('input');
    node.type = 'text';
    node.setAttribute('aria-label', 'Duplicate');
    node.setAttribute('aria-describedby', 'dby');
    const dby = document.createElement('div');
    dby.id = 'dby';
    dby.innerHTML = 'Duplicate';

    fixture.appendChild(node);
    fixture.appendChild(dby);

    flatTreeSetup(fixture);
    expect(
      helpSameAsLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(true);
  });

  it('should return false if input only has a title', () => {
    const node = document.createElement('input');
    node.type = 'text';
    node.title = 'Duplicate';

    fixture.appendChild(node);

    flatTreeSetup(fixture);
    expect(
      helpSameAsLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });

  it('should return true if an input only has aria-describedby', () => {
    const node = document.createElement('input');
    node.type = 'text';
    node.setAttribute('aria-describedby', 'dby');
    const dby = document.createElement('div');
    dby.id = 'dby';
    dby.innerHTML = 'Duplicate';

    fixture.appendChild(node);
    fixture.appendChild(dby);

    flatTreeSetup(fixture);
    expect(
      helpSameAsLabelEvaluateESM(
        node,
        undefined,
        axe.utils.getNodeFromTree(node)
      )
    ).toBe(false);
  });
});
