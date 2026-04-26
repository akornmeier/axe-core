import { queryFixture, getCheckEvaluateESM } from '@helpers/check-helpers';
import matchesDefinitionEvaluate from '@checks/generic/matches-definition-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const rolePresentationEvaluateESM = getCheckEvaluateESM(
  matchesDefinitionEvaluate,
  { matcher: { attributes: { role: 'presentation' } } }
);
describe('role-presentation', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = rolePresentationEvaluateESM;

  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should detect role="presentation" on the element', () => {
    const vNode = queryFixture('<div id="target" role="presentation"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(true);
  });

  it('should return false when role !== presentation', () => {
    const vNode = queryFixture('<div id="target" role="cats"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });

  it('should return false when there is no role attribute', () => {
    const vNode = queryFixture('<div id="target"></div>');

    expect(checkEvaluate(null, null, vNode)).toBe(false);
  });
});
