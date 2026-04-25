import { queryFixture, checks } from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('fallbackrole', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if fallback role is used', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="button foobar">Foo</div>'
    );
    expect(
      checks.fallbackrole.evaluate(virtualNode.actualNode, null, virtualNode)
    ).toBe(true);
  });

  it('should return false if fallback role is not used', () => {
    var virtualNode = queryFixture('<div id="target" role="button">Foo</div>');
    expect(
      checks.fallbackrole.evaluate(virtualNode.actualNode, null, virtualNode)
    ).toBe(false);
  });

  it('should return false if applied to an invalid role', () => {
    var virtualNode = queryFixture('<div id="target" role="foobar">Foo</div>');
    expect(
      checks.fallbackrole.evaluate(virtualNode.actualNode, null, virtualNode)
    ).toBe(false);
  });

  it('should return false if applied to an invalid role', () => {
    var virtualNode = queryFixture('<div id="target" role="foobar">Foo</div>');
    expect(
      checks.fallbackrole.evaluate(virtualNode.actualNode, null, virtualNode)
    ).toBe(false);
  });

  it('should return undefined/needs review if an element with no implicit role uses both none and presentation', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="none presentation">Foo</div>'
    );
    expect(
      checks.fallbackrole.evaluate(virtualNode.actualNode, null, virtualNode)
    ).toBeUndefined();
  });

  it('should return undefined/needs review if an element with no implicit role uses both presentation and none', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="presentation none">Foo</div>'
    );
    expect(
      checks.fallbackrole.evaluate(virtualNode.actualNode, null, virtualNode)
    ).toBeUndefined();
  });

  it('should return true if an element with an implicit role uses both presentation and none', () => {
    var virtualNode = queryFixture(
      '<input type="text" id="target" role="presentation none"/>'
    );
    expect(
      checks.fallbackrole.evaluate(virtualNode.actualNode, null, virtualNode)
    ).toBe(true);
  });
});
