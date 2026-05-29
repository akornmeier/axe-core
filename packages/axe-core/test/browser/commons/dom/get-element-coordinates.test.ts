import { axe } from '@helpers/check-helpers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
//@todo better coverage
describe('dom.getElementCoordinates', function () {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(function () {
    fixture.innerHTML = '';
  });

  it('should calculate bounding box based on element position', function () {
    var el, coords;

    fixture.innerHTML =
      '<div id="div" style="position: absolute; top: -1px; left: -1px;">' +
      '<span id="coords0" style="position:absolute; top: -999px; left: -999px; width: 1000px; height: 1000px;">' +
      'Absolute</span>' +
      '</div>';

    el = document.getElementById('coords0');
    coords = axe.commons.dom.getElementCoordinates(el);
    expect(Math.abs(coords.left - -1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.top - -1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.width - 1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.height - 1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.right - 0)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.bottom - 0)).toBeLessThanOrEqual(0.5);

    el = document.getElementById('div');
    coords = axe.commons.dom.getElementCoordinates(el);
    expect(Math.round(coords.left)).toBe(-1);
    expect(Math.round(coords.top)).toBe(-1);
  });

  it('should take into account scroll offsets', function () {
    var el,
      coords,
      offset = axe.commons.dom.getScrollOffset(window.document);

    fixture.innerHTML =
      '<div id="div" style="position: absolute; top: -1px; left: -1px;">' +
      '<span id="coords0" style="position:absolute; top: -999px; left: -999px; width: 1000px; height: 1000px;">' +
      'Absolute</span>' +
      '</div>';

    el = document.getElementById('coords0');
    coords = axe.commons.dom.getElementCoordinates(el);
    expect(Math.abs(coords.left - -1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.top - -1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.width - 1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.height - 1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.right - 0)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.bottom - 0)).toBeLessThanOrEqual(0.5);

    window.scrollTo(0, 150);
    coords = axe.commons.dom.getElementCoordinates(el);
    expect(Math.abs(coords.left - -1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.top - -1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.width - 1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.height - 1000)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.right - 0)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(coords.bottom - 0)).toBeLessThanOrEqual(0.5);

    window.scrollTo(offset.left, offset.top);
  });
});
