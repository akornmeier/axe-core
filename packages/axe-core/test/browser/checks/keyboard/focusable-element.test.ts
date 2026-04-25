import {
  createMockCheckContext,
  checkSetup,
  checks,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
describe('focusable-element tests', () => {
  var check;
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
  beforeAll(() => {
    check = checks['focusable-element'];
  });

  afterEach(() => {
    fixture.innerHTML = '';
    axe._tree = undefined;
    checkContext.reset();
  });

  it('returns true when element is focusable', () => {
    var params = checkSetup('<input id="target" type="radio">');
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns false when element made not focusable by tabindex', () => {
    var params = checkSetup(
      '<input id="target" type="checkbox" tabindex="-1">'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns false when element is not focusable by default', () => {
    var params = checkSetup('<p id="target">I hold some text </p>');
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns true when element made focusable by tabindex', () => {
    var params = checkSetup(
      '<p id="target" tabindex="0">I hold some text </p>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns true when element made focusable by contenteditable', () => {
    var params = checkSetup(
      '<p id="target" contenteditable>I hold some text </p>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns true when element made focusable by contenteditable="true"', () => {
    var params = checkSetup(
      '<p id="target" contenteditable="true">I hold some text </p>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns false when element made focusable by contenteditable="false"', () => {
    var params = checkSetup(
      '<p id="target" contenteditable="false">I hold some text </p>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns true when element made focusable by contenteditable="invalid" and parent is contenteditable', () => {
    var params = checkSetup(
      '<div contenteditable><p id="target" contenteditable="invalid">I hold some text </p></div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(true);
  });

  it('returns false when element made focusable by contenteditable="invalid" and parent is not contenteditable', () => {
    var params = checkSetup(
      '<div><p id="target" contenteditable="invalid">I hold some text </p></div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });

  it('returns false when element made focusable by contenteditable="invalid" and parent is contenteditable="false"', () => {
    var params = checkSetup(
      '<div contenteditable="false"><p id="target" contenteditable="invalid">I hold some text </p></div>'
    );
    var actual = check.evaluate.apply(checkContext, params as any);
    expect(actual).toBe(false);
  });
});
