import {
  createMockCheckContext,
  checkSetup,
  getCheckEvaluate,
  flatTreeSetup,
  shadowSupport,
  axe
} from '@helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('aria-required-parent', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  const shadowSupported = shadowSupport.v1;
  var checkContext = createMockCheckContext();
  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = undefined;
  });

  it('should detect missing required parent', () => {
    var params = checkSetup(
      '<div><p role="listitem" id="target">Nothing here.</p></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['list']);
  });

  (shadowSupported ? it : it.skip)(
    'should detect missing required parent across shadow boundary',
    function () {
      fixture.innerHTML = '<div id="target"></div>';

      var shadowRoot = document
        .querySelector('#target')
        .attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = '<p role="listitem" id="target">Nothing here.</p>';

      flatTreeSetup(fixture);
      var shadowContent = shadowRoot.querySelector('#target');
      var virtualTarget = axe.utils.getNodeFromTree(shadowContent);

      var params = [shadowContent, undefined, virtualTarget];
      expect(
        getCheckEvaluate('aria-required-parent').apply(
          checkContext,
          params as any
        )
      ).toBe(false);
      expect(checkContext._data).toEqual(['list']);
    }
  );

  it('should pass when required parent is present in an ancestral aria-owns context', () => {
    var snippet =
      '<div role="list"><div aria-owns="parent"></div></div>' +
      '<div id="parent"><p role="listitem" id="target">Nothing here.</p></div>';
    var params = checkSetup(snippet);
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should fail when wrong role is present in an aria-owns context', () => {
    var params = checkSetup(
      '<div role="menu"><div aria-owns="target"></div></div>' +
        '<div><p role="listitem" id="target">Nothing here.</p></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['list']);
  });

  it('should pass when required parent is present in an aria-owns context', () => {
    var params = checkSetup(
      '<div role="list" aria-owns="target"></div><div><p role="listitem" id="target">Nothing here.</p></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should pass when at least one required parent of multiple is present', () => {
    var params = checkSetup(
      '<div role="grid"><p role="row" id="target">Nothing here.</p></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should pass when required parent is present', () => {
    var params = checkSetup(
      '<div role="list"><p role="listitem" id="target">Nothing here.</p></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should fail when there is an intermediate role between the child and parent', () => {
    var params = checkSetup(
      '<div role="list"><div role="tabpanel"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(false);
  });

  it('should pass when intermediate node is role=presentation', () => {
    var params = checkSetup(
      '<div role="list"><div role="presentation"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should pass when intermediate node is role=group and required parent is present', () => {
    var params = checkSetup(
      '<ul role="menu"><li role="group"><button role="menuitem" id="target">Nothing here.</button></li></ul>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should fail when intermediate node is role=group but required parent is missing', () => {
    var params = checkSetup(
      '<ul role="none"><li role="group"><button role="menuitem" id="target">Nothing here.</button></li></ul>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['menu', 'menubar']);
  });

  it('should fail when intermediate node is role=group but this not an allowed context', () => {
    var params = checkSetup(
      '<div role="menu"><div role="group"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(false);
  });

  describe('group with ownGroupRoles', () => {
    it('should pass when the role and grand parent role is in ownGroupRoles', () => {
      var params = checkSetup(
        '<div role="tree">' +
          '<div role="treeitem">' +
          '<div role="group">' +
          '<div role="treeitem" id="target">' +
          '</div></div></div></div>',
        {
          ownGroupRoles: ['treeitem']
        }
      );

      expect(
        getCheckEvaluate('aria-required-parent').apply(
          checkContext,
          params as any
        )
      ).toBe(true);
    });

    it('should fail when the role and grand parent role is in ownGroupRoles', () => {
      var params = checkSetup(
        '<div role="menu">' +
          '<div role="menuitem">' +
          '<div role="group">' +
          '<div role="menuitem" id="target">' +
          '</div></div></div></div>',
        {
          ownGroupRoles: ['listitem']
        }
      );

      expect(
        getCheckEvaluate('aria-required-parent').apply(
          checkContext,
          params as any
        )
      ).toBe(false);
    });

    it('should fail when the role is not in a group', () => {
      var params = checkSetup(
        '<div role="list">' +
          '<div role="listitem">' +
          '<div role="none">' +
          '<div role="listitem" id="target">' +
          '</div></div></div></div>',
        {
          ownGroupRoles: ['listitem']
        }
      );

      expect(
        getCheckEvaluate('aria-required-parent').apply(
          checkContext,
          params as any
        )
      ).toBe(false);
    });
  });

  it('should pass when intermediate node is role=none', () => {
    var params = checkSetup(
      '<div role="list"><div role="none"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should pass when intermediate node is not owned by parent', () => {
    var params = checkSetup(
      '<div role="list" aria-owns="target"><div role="navigation"><p role="listitem" id="target">Nothing here.</p></div></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  it('should pass for multiple group and presentational roles', () => {
    var params = checkSetup(
      '<div role="tree"><div role="none"><div role="group"><div role="none"><div role="group"><div role="treeitem" id="target">Nothing here.</div></div></div></div></div></div>'
    );
    expect(
      getCheckEvaluate('aria-required-parent').apply(
        checkContext,
        params as any
      )
    ).toBe(true);
  });

  (shadowSupported ? it : it.skip)(
    'should pass when required parent is present across shadow boundary',
    function () {
      fixture.innerHTML = '<div role="list" id="parent"></div>';

      var shadowRoot = document
        .querySelector('#parent')
        .attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = '<p role="listitem" id="target">Nothing here.</p>';

      flatTreeSetup(fixture);
      var shadowContent = shadowRoot.querySelector('#target');
      var virtualTarget = axe.utils.getNodeFromTree(shadowContent);

      var params = [shadowContent, undefined, virtualTarget];
      expect(
        getCheckEvaluate('aria-required-parent').apply(
          checkContext,
          params as any
        )
      ).toBe(true);
    }
  );

  (shadowSupported ? it : it.skip)(
    'should fail when aria-owns context crosses shadow boundary',
    function () {
      fixture.innerHTML =
        '<div id="parent"><div role="list" aria-owns="target"></div></div>';

      var shadowRoot = document
        .querySelector('#parent')
        .attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = '<p role="listitem" id="target">Nothing here.</p>';

      flatTreeSetup(fixture);
      var shadowContent = shadowRoot.querySelector('#target');
      var virtualTarget = axe.utils.getNodeFromTree(shadowContent);

      var params = [shadowContent, undefined, virtualTarget];
      expect(
        getCheckEvaluate('aria-required-parent').apply(
          checkContext,
          params as any
        )
      ).toBe(false);
    }
  );
});
