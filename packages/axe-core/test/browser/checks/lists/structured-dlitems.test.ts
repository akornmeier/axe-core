import {
  checkSetup,
  getCheckEvaluate,
  shadowSupport
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('structured-dlitems', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return false if the list has no contents', () => {
    var checkArgs = checkSetup('<dl id="target"></dl>');
    expect(getCheckEvaluate('structured-dlitems').apply(null, checkArgs)).toBe(
      false
    );
  });

  it('should return true if the list has only a dd', () => {
    var checkArgs = checkSetup('<dl id="target"><dd>A list</dd></dl>');
    expect(getCheckEvaluate('structured-dlitems').apply(null, checkArgs)).toBe(
      true
    );
  });

  it('should return true if the list has only a dt', () => {
    var checkArgs = checkSetup('<dl id="target"><dt>A list</dt></dl>');

    expect(getCheckEvaluate('structured-dlitems').apply(null, checkArgs)).toBe(
      true
    );
  });

  it('should return true if the list has dt and dd in the incorrect order', () => {
    var checkArgs = checkSetup(
      '<dl id="target"><dd>A list</dd><dt>An item</dt></dl>'
    );

    expect(getCheckEvaluate('structured-dlitems').apply(null, checkArgs)).toBe(
      true
    );
  });

  it('should return true if the list has dt and dd in the correct order as non-child descendants', () => {
    var checkArgs = checkSetup(
      '<dl id="target"><dd><dl><dt>An item</dt><dd>A list</dd></dl></dd></dl>'
    );

    expect(getCheckEvaluate('structured-dlitems').apply(null, checkArgs)).toBe(
      true
    );
  });

  it('should return false if the list has dt and dd in the correct order', () => {
    var checkArgs = checkSetup(
      '<dl id="target"><dt>An item</dt><dd>A list</dd></dl>'
    );

    expect(getCheckEvaluate('structured-dlitems').apply(null, checkArgs)).toBe(
      false
    );
  });

  it('should return false if the list has a correctly-ordered dt and dd with other content', () => {
    var checkArgs = checkSetup(
      '<dl id="target"><dt>Stuff</dt><dt>Item one</dt><dd>Description</dd><p>Not a list</p></dl>'
    );

    expect(getCheckEvaluate('structured-dlitems').apply(null, checkArgs)).toBe(
      false
    );
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should return false in a shadow DOM pass',
    function () {
      var node = document.createElement('div');
      node.innerHTML = '<dt>Grayhound bus</dt><dd>at dawn</dd>';
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<dl><slot></slot></dl>';

      var checkArgs = checkSetup(node, 'dl');
      expect(
        getCheckEvaluate('structured-dlitems').apply(null, checkArgs)
      ).toBe(false);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should return true in a shadow DOM fail',
    function () {
      var node = document.createElement('div');
      node.innerHTML = '<dd>Galileo</dd><dt>Figaro</dt>';
      var shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<dl><slot></slot></dl>';

      var checkArgs = checkSetup(node, 'dl');
      expect(
        getCheckEvaluate('structured-dlitems').apply(null, checkArgs)
      ).toBe(true);
    }
  );
});
