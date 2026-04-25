import {
  createMockCheckContext,
  getCheckEvaluate,
  shadowSupport,
  checks
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('duplicate-id', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
  });

  it('should return true if there is only one element with an ID', () => {
    fixture.innerHTML = '<div id="target"></div>';
    const node = fixture.querySelector('#target');
    expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
      true
    );
    expect(checkContext._data).toBe(node.id);
    expect(checkContext._relatedNodes).toEqual([]);
  });

  it('should return false if there are multiple elements with an ID', () => {
    fixture.innerHTML = '<div id="target"></div><div id="target"></div>';
    const node = fixture.querySelector('#target');
    expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
      false
    );
    expect(checkContext._data).toBe(node.id);
    expect(checkContext._relatedNodes).toEqual([node.nextSibling]);
  });

  it('should return remove duplicates', () => {
    expect(
      checks['duplicate-id'].after([
        { data: 'a' },
        { data: 'b' },
        { data: 'b' }
      ])
    ).toEqual([{ data: 'a' }, { data: 'b' }]);
  });

  it('should ignore empty ids', () => {
    fixture.innerHTML =
      '<div data-testelm="1" id=""></div><div data-testelm="2"  id=""></div>';
    const node = fixture.querySelector('[data-testelm="1"]');

    expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
      true
    );
  });

  it('should allow overwrote ids', () => {
    fixture.innerHTML =
      '<form data-testelm="1" id="target"><label>mylabel' +
      '<input name="id">' +
      '</label></form>';
    const node = fixture.querySelector('[data-testelm="1"]');

    expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
      true
    );
  });

  (shadowSupport.v1 ? it : it.skip)(
    'should find duplicate IDs in the same shadow DOM',
    function () {
      const div = document.createElement('div');
      div.id = 'target';
      const shadow = div.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span id="target"></span><p id="target">text</p>';
      const node = shadow.querySelector('span');
      fixture.appendChild(div);

      expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
        false
      );
      expect(checkContext._relatedNodes).toHaveLength(1);
      expect(checkContext._relatedNodes).toEqual([shadow.querySelector('p')]);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should ignore duplicate IDs if they are in different document roots',
    function () {
      const node = document.createElement('div');
      node.id = 'target';
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span id="target"></span>';
      fixture.appendChild(node);

      expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
        true
      );
      expect(checkContext._relatedNodes).toHaveLength(0);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should ignore same IDs outside shadow trees',
    function () {
      const div = document.createElement('div');
      div.id = 'target';
      const shadow = div.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span id="target"></span>';
      const node = shadow.querySelector('#target');
      fixture.appendChild(div);

      expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
        true
      );
      expect(checkContext._relatedNodes).toHaveLength(0);
    }
  );

  (shadowSupport.v1 ? it : it.skip)(
    'should compare slotted content with the light DOM',
    function () {
      const node = document.createElement('div');
      node.id = 'target';
      node.innerHTML = '<p id="target">text</p>';
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span id="target"><slot></slot></span>';
      fixture.appendChild(node);

      expect(getCheckEvaluate('duplicate-id').call(checkContext, node)).toBe(
        false
      );
      expect(checkContext._relatedNodes).toHaveLength(1);
      expect(checkContext._relatedNodes).toEqual([node.querySelector('p')]);
    }
  );
});
