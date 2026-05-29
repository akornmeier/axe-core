import { getCheckEvaluateESM, axe } from '@helpers/check-helpers';
import skipLinkEvaluate from '@checks/navigation/skip-link-evaluate';
import { describe, it, expect, beforeEach } from 'vitest';

const skipLinkEvaluateESM = getCheckEvaluateESM(skipLinkEvaluate);
describe('skip-link', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  it('should return true if the href points to an element with an ID', () => {
    fixture.innerHTML =
      '<a href="#target">Click Here</a><h1 id="target">Introduction</h1>';
    axe._tree = axe.utils.getFlattenedTree(fixture);
    const node = fixture.querySelector('a');
    expect(skipLinkEvaluateESM(node)).toBe(true);
  });

  it('should return true if the href points to an element with an name', () => {
    fixture.innerHTML = '<a href="#target">Click Here</a><a name="target"></a>';
    axe._tree = axe.utils.getFlattenedTree(fixture);
    const node = fixture.querySelector('a');
    expect(skipLinkEvaluateESM(node)).toBe(true);
  });

  it('should return false if the href points to a non-existent element', () => {
    fixture.innerHTML =
      '<a href="#spacecamp">Click Here</a><h1 id="mainheader">Introduction</h1>';
    axe._tree = axe.utils.getFlattenedTree(fixture);
    const node = fixture.querySelector('a');
    expect(skipLinkEvaluateESM(node)).toBe(false);
  });

  it('should return undefined if the target has display:none', () => {
    fixture.innerHTML =
      '<a href="#target">Click Here</a>' +
      '<h1 id="target" style="display:none">Introduction</h1>';
    axe._tree = axe.utils.getFlattenedTree(fixture);
    const node = fixture.querySelector('a');
    expect(skipLinkEvaluateESM(node)).toBeUndefined();
  });

  it('should return undefined if the target has aria-hidden=true', () => {
    fixture.innerHTML =
      '<a href="#target">Click Here</a>' +
      '<h1 id="target" aria-hidden="true">Introduction</h1>';
    axe._tree = axe.utils.getFlattenedTree(fixture);
    const node = fixture.querySelector('a');
    expect(skipLinkEvaluateESM(node)).toBeUndefined();
  });
});
