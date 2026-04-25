import {
  createMockCheckContext,
  queryFixture,
  checks
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('invalidrole', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if applied to an empty role', () => {
    var virtualNode = queryFixture('<div id="target" role="">Contents</div>');
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['']);
  });

  it('should return true if applied to a nonsensical role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="foo">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['foo']);
  });

  it('should return false if applied to a concrete role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="alert">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if applied to an abstract role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="widget">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if applied to multiple valid roles', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="alert button">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if atleast one role is valid', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="alert button foo bar">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
  });

  it('should return true if all roles are invalid', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="foo bar">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['foo', 'bar']);
  });

  it('should return true if applied to an uppercase nonsensical role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="FOO">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['FOO']);
  });

  it('should return false if applied to an uppercase valid role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="BUTTON">Contents</div>'
    );
    expect(
      checks.invalidrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
  });
});
