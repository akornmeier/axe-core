import { queryFixture, getCheckEvaluate } from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('role-none', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkEvaluate = getCheckEvaluate('role-none');

  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should detect role="none" on the element', () => {
    var vNode = queryFixture('<div id="target" role="none"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(true);
  });

  it('should return false when role !== none', () => {
    var vNode = queryFixture('<div id="target" role="cats"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });

  it('should return false when there is no role attribute', () => {
    var vNode = queryFixture('<div id="target"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });
});
