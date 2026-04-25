import { queryFixture, getCheckEvaluate } from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('role-presentation', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkEvaluate = getCheckEvaluate('role-presentation');

  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should detect role="presentation" on the element', () => {
    var vNode = queryFixture('<div id="target" role="presentation"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(true);
  });

  it('should return false when role !== presentation', () => {
    var vNode = queryFixture('<div id="target" role="cats"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });

  it('should return false when there is no role attribute', () => {
    var vNode = queryFixture('<div id="target"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });
});
