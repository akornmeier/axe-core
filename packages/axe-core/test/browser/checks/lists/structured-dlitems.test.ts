import {
  checkSetup,
  getCheckEvaluateESM,
  shadowSupport
} from '@helpers/check-helpers';
import structuredDlitemsEvaluate from '@checks/lists/structured-dlitems-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const structuredDlitemsEvaluateESM = getCheckEvaluateESM(
  structuredDlitemsEvaluate
);
describe('structured-dlitems', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return false if the list has no contents', () => {
    const checkArgs = checkSetup('<dl id="target"></dl>');
    expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(false);
  });

  it('should return true if the list has only a dd', () => {
    const checkArgs = checkSetup('<dl id="target"><dd>A list</dd></dl>');
    expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return true if the list has only a dt', () => {
    const checkArgs = checkSetup('<dl id="target"><dt>A list</dt></dl>');

    expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return true if the list has dt and dd in the incorrect order', () => {
    const checkArgs = checkSetup(
      '<dl id="target"><dd>A list</dd><dt>An item</dt></dl>'
    );

    expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return true if the list has dt and dd in the correct order as non-child descendants', () => {
    const checkArgs = checkSetup(
      '<dl id="target"><dd><dl><dt>An item</dt><dd>A list</dd></dl></dd></dl>'
    );

    expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(true);
  });

  it('should return false if the list has dt and dd in the correct order', () => {
    const checkArgs = checkSetup(
      '<dl id="target"><dt>An item</dt><dd>A list</dd></dl>'
    );

    expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(false);
  });

  it('should return false if the list has a correctly-ordered dt and dd with other content', () => {
    const checkArgs = checkSetup(
      '<dl id="target"><dt>Stuff</dt><dt>Item one</dt><dd>Description</dd><p>Not a list</p></dl>'
    );

    expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(false);
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should return false in a shadow DOM pass',
    function () {
      const node = document.createElement('div');
      node.innerHTML = '<dt>Grayhound bus</dt><dd>at dawn</dd>';
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<dl><slot></slot></dl>';

      const checkArgs = checkSetup(node, 'dl');
      expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(false);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should return true in a shadow DOM fail',
    function () {
      const node = document.createElement('div');
      node.innerHTML = '<dd>Galileo</dd><dt>Figaro</dt>';
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<dl><slot></slot></dl>';

      const checkArgs = checkSetup(node, 'dl');
      expect(structuredDlitemsEvaluateESM.apply(null, checkArgs)).toBe(true);
    }
  );
});
