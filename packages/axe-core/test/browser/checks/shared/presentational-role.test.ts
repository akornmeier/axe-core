import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluate
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('presentational-role', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkEvaluate = getCheckEvaluate('presentational-role');
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should detect role="none" on the element', () => {
    const vNode = queryFixture('<div id="target" role="none"></div>');

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(true);
    expect(checkContext._data.role).toEqual('none');
  });

  it('should detect role="presentation" on the element', () => {
    const vNode = queryFixture('<div id="target" role="presentation"></div>');

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(true);
    expect(checkContext._data.role).toEqual('presentation');
  });

  it('should return false when role !== none', () => {
    const vNode = queryFixture('<div id="target" role="cats"></div>');

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(false);
  });

  it('should return false when there is no role attribute', () => {
    const vNode = queryFixture('<div id="target"></div>');

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(false);
  });

  it('should return false when the element is focusable', () => {
    const vNode = queryFixture(
      '<button id="target" role="none">Still a button</button>'
    );

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(false);
    expect(checkContext._data.messageKey).toEqual('focusable');
  });

  it('should return false when the element has global aria attributes', () => {
    const vNode = queryFixture(
      '<img id="target" role="none" aria-live="assertive" />'
    );

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(false);
    expect(checkContext._data.messageKey).toEqual('globalAria');
  });

  it('should return false when the element has global aria attributes and is focusable', () => {
    const vNode = queryFixture(
      '<button id="target" role="none" aria-live="assertive">Still a button</button>'
    );

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(false);
    expect(checkContext._data.messageKey).toEqual('both');
  });

  it('should return false for iframe element with role=none and title', () => {
    const vNode = queryFixture(
      '<iframe id="target" role="none" title="  "></iframe>'
    );

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'iframe',
      nodeName: 'iframe'
    });
  });

  it('should return false for iframe element with role=presentation and title', () => {
    const vNode = queryFixture(
      '<iframe id="target" role="presentation" title=""></iframe>'
    );

    expect(checkEvaluate.call(checkContext, null, null, vNode)).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'iframe',
      nodeName: 'iframe'
    });
  });
});
