import { queryFixture, getCheckEvaluateESM } from '@helpers/check-helpers';
import matchesDefinitionEvaluate from '@checks/generic/matches-definition-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const roleNoneEvaluateESM = getCheckEvaluateESM(matchesDefinitionEvaluate, {
  matcher: { attributes: { role: 'none' } }
});
describe('role-none', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = roleNoneEvaluateESM;

  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should detect role="none" on the element', () => {
    const vNode = queryFixture('<div id="target" role="none"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(true);
  });

  it('should return false when role !== none', () => {
    const vNode = queryFixture('<div id="target" role="cats"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });

  it('should return false when there is no role attribute', () => {
    const vNode = queryFixture('<div id="target"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });
});
