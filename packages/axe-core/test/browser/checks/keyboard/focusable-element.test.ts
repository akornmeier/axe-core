import {
  createMockCheckContext,
  checkSetup,
  checks,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
describe('focusable-element tests', () => {
  let check;
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();
  beforeAll(() => {
    check = checks['focusable-element'];
  });

  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    checkContext.reset();
  });

  it('returns true when element is focusable', () => {
    const params = checkSetup('<input id="target" type="radio">');
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns false when element made not focusable by tabindex', () => {
    const params = checkSetup(
      '<input id="target" type="checkbox" tabindex="-1">'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns false when element is not focusable by default', () => {
    const params = checkSetup('<p id="target">I hold some text </p>');
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns true when element made focusable by tabindex', () => {
    const params = checkSetup(
      '<p id="target" tabindex="0">I hold some text </p>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns true when element made focusable by contenteditable', () => {
    const params = checkSetup(
      '<p id="target" contenteditable>I hold some text </p>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns true when element made focusable by contenteditable="true"', () => {
    const params = checkSetup(
      '<p id="target" contenteditable="true">I hold some text </p>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns false when element made focusable by contenteditable="false"', () => {
    const params = checkSetup(
      '<p id="target" contenteditable="false">I hold some text </p>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns true when element made focusable by contenteditable="invalid" and parent is contenteditable', () => {
    const params = checkSetup(
      '<div contenteditable><p id="target" contenteditable="invalid">I hold some text </p></div>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns false when element made focusable by contenteditable="invalid" and parent is not contenteditable', () => {
    const params = checkSetup(
      '<div><p id="target" contenteditable="invalid">I hold some text </p></div>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns false when element made focusable by contenteditable="invalid" and parent is contenteditable="false"', () => {
    const params = checkSetup(
      '<div contenteditable="false"><p id="target" contenteditable="invalid">I hold some text </p></div>'
    );
    const actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });
});
