import { checks } from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('caption-faked', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  let captionFaked;
  beforeEach(() => {
    captionFaked = checks['caption-faked'];
  });

  it('returns true if the first row has multiple cells', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <td></td> <td></td> </tr>' +
      '  <tr> <td></td> <td></td> </tr>' +
      '</table>';

    const node = fixture.querySelector('table');
    expect(captionFaked.evaluate(node)).toBe(true);
  });

  it('returns true if the table has only one column', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <td></td> </tr>' +
      '  <tr> <td></td> </tr>' +
      '</table>';

    const node = fixture.querySelector('table');
    expect(captionFaked.evaluate(node)).toBe(true);
  });

  it('returns true if the table has only one <tr>', () => {
    fixture.innerHTML =
      '<table>' +
      // Accessibility: Expect the unexpected
      '  <tr> <td rowspan="2" colspan="2"></td> </tr>' +
      '</table>';

    const node = fixture.querySelector('table');
    expect(captionFaked.evaluate(node)).toBe(true);
  });

  it('returns true if the first column does not span the entire table', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <td></td> </tr>' +
      '  <tr> <td></td> <td></td> </tr>' +
      '</table>';

    const node = fixture.querySelector('table');
    expect(captionFaked.evaluate(node)).toBe(true);
  });

  it('returns false if the first is only a single td', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <td colspan="2"></td> </tr>' +
      '  <tr> <td></td> <td></td> </tr>' +
      '</table>';

    const node = fixture.querySelector('table');
    expect(captionFaked.evaluate(node)).toBe(false);
  });

  it('returns false if the first is only a single th', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <th colspan="2"></th> </tr>' +
      '  <tr> <td></td> <td></td> </tr>' +
      '</table>';

    const node = fixture.querySelector('table');
    expect(captionFaked.evaluate(node)).toBe(false);
  });
});
