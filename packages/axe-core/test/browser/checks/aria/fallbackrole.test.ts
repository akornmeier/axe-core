import { queryFixture } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const audit = createSyntheticAudit(['fallbackrole']);

describe('fallbackrole', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  afterEach(() => {
    fixture.innerHTML = '';
  });

  it('should return true if fallback role is used', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="button foobar">Foo</div>'
    );
    expect(
      audit.checks.fallbackrole.evaluate(
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
  });

  it('should return false if fallback role is not used', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="button">Foo</div>'
    );
    expect(
      audit.checks.fallbackrole.evaluate(
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
  });

  it('should return false if applied to an invalid role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="foobar">Foo</div>'
    );
    expect(
      audit.checks.fallbackrole.evaluate(
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
  });

  it('should return false if applied to an invalid role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="foobar">Foo</div>'
    );
    expect(
      audit.checks.fallbackrole.evaluate(
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(false);
  });

  it('should return undefined/needs review if an element with no implicit role uses both none and presentation', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="none presentation">Foo</div>'
    );
    expect(
      audit.checks.fallbackrole.evaluate(
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBeUndefined();
  });

  it('should return undefined/needs review if an element with no implicit role uses both presentation and none', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="presentation none">Foo</div>'
    );
    expect(
      audit.checks.fallbackrole.evaluate(
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBeUndefined();
  });

  it('should return true if an element with an implicit role uses both presentation and none', () => {
    const virtualNode = queryFixture(
      '<input type="text" id="target" role="presentation none"/>'
    );
    expect(
      audit.checks.fallbackrole.evaluate(
        virtualNode.actualNode,
        null,
        virtualNode
      )
    ).toBe(true);
  });
});
