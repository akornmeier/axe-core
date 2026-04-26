import { createMockCheckContext, queryFixture } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const audit = createSyntheticAudit(['invalidrole']);

describe('invalidrole', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if applied to an empty role', () => {
    const virtualNode = queryFixture('<div id="target" role="">Contents</div>');
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['']);
  });

  it('should return true if applied to a nonsensical role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="foo">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['foo']);
  });

  it('should return false if applied to a concrete role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="alert">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if applied to an abstract role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="widget">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if applied to multiple valid roles', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="alert button">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if atleast one role is valid', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="alert button foo bar">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
  });

  it('should return true if all roles are invalid', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="foo bar">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['foo', 'bar']);
  });

  it('should return true if applied to an uppercase nonsensical role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="FOO">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['FOO']);
  });

  it('should return false if applied to an uppercase valid role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="BUTTON">Contents</div>'
    );
    expect(
      audit.checks['invalidrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
  });
});
