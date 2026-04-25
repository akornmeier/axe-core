import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import nonEmptyIfPresentEvaluate from '@checks/shared/non-empty-if-present-evaluate';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const nonEmptyIfPresentEvaluateESM = getCheckEvaluateESM(
  nonEmptyIfPresentEvaluate
);
describe('non-empty-if-present', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  // These defaults are only available in IE and Edge
  const input = document.createElement('input');
  input.type = 'submit';
  const isEdgeOrIe = typeof input.getAttribute('value') === 'string';

  const checkContext = createMockCheckContext();
  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if a value is present', () => {
    const vNode = queryFixture(
      '<input id="target" type="submit" value="woohoo" />'
    );

    expect(
      nonEmptyIfPresentEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(false);
    expect(checkContext._data.messageKey).toBe('has-label');
  });

  (isEdgeOrIe ? it.skip : it)(
    'should return true if a value is not present',
    function () {
      const vNode = queryFixture('<input id="target" type="submit" />');

      expect(
        nonEmptyIfPresentEvaluateESM.call(checkContext, null, {}, vNode)
      ).toBe(true);
      expect(checkContext._data).toBeNull();
    }
  );

  it('should return false if an value is present, but empty', () => {
    const vNode = queryFixture('<input id="target" type="submit" value="" />');

    expect(
      nonEmptyIfPresentEvaluateESM.call(checkContext, null, {}, vNode)
    ).toBe(false);
  });

  it('should return false if the element is not a submit or reset input', () => {
    const textInput = queryFixture('<input id="target" type="text" />');
    expect(
      nonEmptyIfPresentEvaluateESM.call(checkContext, null, {}, textInput)
    ).toBe(false);

    const buttonInput = queryFixture('<input id="target" type="button" />');
    expect(
      nonEmptyIfPresentEvaluateESM.call(checkContext, null, {}, buttonInput)
    ).toBe(false);

    const buttonElement = queryFixture(
      '<button id="target" type="submit"></button'
    );
    expect(
      nonEmptyIfPresentEvaluateESM.call(checkContext, null, {}, buttonElement)
    ).toBe(false);
  });
});
