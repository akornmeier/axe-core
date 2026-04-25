import {
  createMockCheckContext,
  queryFixture,
  checks
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('abstractrole', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return false if applied to a concrete role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="alert">Contents</div>'
    );
    expect(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return false if applied to a nonsensical role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="foo">Contents</div>'
    );
    expect(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return true if applied to an abstract role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="widget">Contents</div>'
    );
    expect(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['widget']);
  });

  it('should return false if applied to multiple concrete roles', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="alert button">Contents</div>'
    );
    expect(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(false);
    expect(checkContext._data).toBeNull();
  });

  it('should return true if applied to at least one abstract role', () => {
    var virtualNode = queryFixture(
      '<div id="target" role="alert widget structure">Contents</div>'
    );
    expect(
      checks.abstractrole.evaluate.call(
        checkContext,
        virtualNode.actualNode,
        'radio',
        virtualNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(['widget', 'structure']);
  });
});
