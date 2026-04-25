import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluate
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('non-empty-if-present', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  // These defaults are only available in IE and Edge
  var input = document.createElement('input');
  input.type = 'submit';
  var isEdgeOrIe = typeof input.getAttribute('value') === 'string';

  var checkContext = createMockCheckContext();
  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if a value is present', () => {
    var vNode = queryFixture(
      '<input id="target" type="submit" value="woohoo" />'
    );

    expect(
      getCheckEvaluate('non-empty-if-present', { verifyMessage: false }).call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);
    expect(checkContext._data.messageKey).toBe('has-label');
  });

  (isEdgeOrIe ? it.skip : it)(
    'should return true if a value is not present',
    function () {
      var vNode = queryFixture('<input id="target" type="submit" />');

      expect(
        getCheckEvaluate('non-empty-if-present').call(
          checkContext,
          null,
          {},
          vNode
        )
      ).toBe(true);
      expect(checkContext._data).toBeNull();
    }
  );

  it('should return false if an value is present, but empty', () => {
    var vNode = queryFixture('<input id="target" type="submit" value="" />');

    expect(
      getCheckEvaluate('non-empty-if-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);
  });

  it('should return false if the element is not a submit or reset input', () => {
    var vNode = queryFixture('<input id="target" type="text" />');
    expect(
      getCheckEvaluate('non-empty-if-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);

    var vNode = queryFixture('<input id="target" type="button" />');
    expect(
      getCheckEvaluate('non-empty-if-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);

    var vNode = queryFixture('<button id="target" type="submit"></button');
    expect(
      getCheckEvaluate('non-empty-if-present').call(
        checkContext,
        null,
        {},
        vNode
      )
    ).toBe(false);
  });
});
