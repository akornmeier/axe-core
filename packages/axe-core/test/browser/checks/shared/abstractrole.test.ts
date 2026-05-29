import { createMockCheckContext, queryFixture } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const audit = createSyntheticAudit(['abstractrole']);

describe('abstractrole', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if applied to a concrete role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="alert">Contents</div>'
    );
    expect(
      audit.checks['abstractrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if applied to a nonsensical role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="foo">Contents</div>'
    );
    expect(
      audit.checks['abstractrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return true if applied to an abstract role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="widget">Contents</div>'
    );
    expect(
      audit.checks['abstractrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['widget']);
  });

  it('should return false if applied to multiple concrete roles', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="alert button">Contents</div>'
    );
    expect(
      audit.checks['abstractrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return true if applied to at least one abstract role', () => {
    const virtualNode = queryFixture(
      '<div id="target" role="alert widget structure">Contents</div>'
    );
    expect(
      audit.checks['abstractrole'].evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['widget', 'structure']);
  });
});
