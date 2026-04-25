import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluate
} from '../../_helpers/check-helpers';
import { describe, it, expect, afterEach } from 'vitest';
describe('aria-allowed-role', () => {
  var checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
  });

  it('returns true if given element is an ignoredTag in options', () => {
    var vNode = queryFixture(
      '<article id="target" role="presentation"></article>'
    );
    var options = {
      ignoredTags: ['article']
    };
    var actual = getCheckEvaluate('aria-allowed-role').call(
      checkContext,
      null,
      options,
      vNode
    );
    var expected = true;
    expect(actual).toBe(expected);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false with implicit role of row for TR when allowImplicit is set to false via options', () => {
    var vNode = queryFixture(
      '<table role="grid"><tr id="target" role="row"></tr></table>'
    );
    var options = {
      allowImplicit: false
    };
    var outcome = getCheckEvaluate('aria-allowed-role').call(
      checkContext,
      null,
      options,
      vNode
    );

    expect(outcome).toBe(false);
    expect(checkContext._data).toEqual(['row']);
  });

  it('returns undefined (needs review) when element is hidden and has unallowed role', () => {
    var vNode = queryFixture(
      '<button id="target" type="button" aria-hidden="true"' +
        'role="presentation"></button>'
    );
    var actual = getCheckEvaluate('aria-allowed-role').call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) when element is with in hidden parent and has unallowed role', () => {
    var vNode = queryFixture(
      '<div style="display:none">' +
        '<button id="target" class="mm-tabstart" type="button"' +
        'role="presentation"></button>' +
        '</div>'
    );
    var actual = getCheckEvaluate('aria-allowed-role').call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBeUndefined();
  });

  it('returns true when BUTTON has type menu and role as menuitem', () => {
    var vNode = queryFixture(
      '<button id="target" type="menu" role="menuitem"></button>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when img has no alt and role="presentation"', () => {
    var vNode = queryFixture('<img id="target" role="presentation"/>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns true when img has no alt and role="none"', () => {
    var vNode = queryFixture('<img id="target" role="none"/>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns true when img has empty alt and role="presentation"', () => {
    var vNode = queryFixture('<img id="target" alt="" role="presentation"/>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns true when img has empty alt and role="none"', () => {
    var vNode = queryFixture('<img id="target" alt="" role="none"/>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns false when img has alt and role="presentation"', () => {
    var vNode = queryFixture(
      '<img id="target" alt="not empty" role="presentation"/>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['presentation']);
  });

  it('returns false when img has alt and role="none"', () => {
    var vNode = queryFixture('<img id="target" alt="not empty" role="none"/>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['none']);
  });

  it('returns true when img has aria-label and a valid role, role="button"', () => {
    var vNode = queryFixture(
      '<img id="target" aria-label="foo" role="button"/>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false when img has aria-label and a invalid role, role="alert"', () => {
    var vNode = queryFixture(
      '<img id="target" aria-label="foo" role="alert"/>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['alert']);
  });

  it('returns true when img has aria-labelledby and a valid role, role="menuitem"', () => {
    var vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" aria-labelledby="foo" role="menuitem"/>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false when img has aria-labelledby and a invalid role, role="rowgroup"', () => {
    var vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" aria-labelledby="foo" role="rowgroup"/>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['rowgroup']);
  });

  it('returns true when img has title and a valid role, role="link"', () => {
    var vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" title="foo" role="link"/>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false when img has title and a invalid role, role="radiogroup"', () => {
    var vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" title="foo" role="radiogroup"/>'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['radiogroup']);
  });

  it('returns true when input of type image and no role', () => {
    var vNode = queryFixture('<input id="target" type="image"/>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns true when INPUT type is checkbox and has aria-pressed attribute', () => {
    var vNode = queryFixture(
      '<input id="target" type="checkbox" aria-pressed="">'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is text with role combobox', () => {
    var vNode = queryFixture('<input id="target" type="text" role="combobox">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is tel with role combobox', () => {
    var vNode = queryFixture('<input id="target" type="tel" role="combobox">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is url with role combobox', () => {
    var vNode = queryFixture('<input id="target" type="url" role="combobox">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is search with role combobox', () => {
    var vNode = queryFixture(
      '<input id="target" type="search" role="combobox">'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is email with role combobox', () => {
    var vNode = queryFixture(
      '<input id="target" type="email" role="combobox">'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is text with role spinbutton', () => {
    var vNode = queryFixture(
      '<input id="target" type="text" role="spinbutton">'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is number with role spinbutton', () => {
    var vNode = queryFixture(
      '<input id="target" type="number" role="spinbutton">'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is tel with role spinbutton', () => {
    var vNode = queryFixture(
      '<input id="target" type="tel" role="spinbutton">'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true when INPUT type is text with role searchbox', () => {
    var vNode = queryFixture(
      '<input id="target" type="text" role="searchbox">'
    );
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns false when a role is set on an element that does not allow any role', () => {
    var vNode = queryFixture('<dd id="target" role="link">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(false);
    expect(checkContext._data).toEqual(['link']);
  });

  it('returns true when a role is set on an element that can have any role', () => {
    var vNode = queryFixture('<div id="target" role="link"></dd>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true an <a> without a href to have any role', () => {
    var vNode = queryFixture('<a id="target" role="presentation"></a>');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('returns true <a> with a empty href to have any valid role', () => {
    var vNode = queryFixture('<a id="target" role="link" href=""></a>');
    var actual = getCheckEvaluate('aria-allowed-role').call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBe(true);
  });

  it('returns true <img> with a non-empty alt', () => {
    var vNode = queryFixture('<img id="target" role="button" alt="some text">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });

  it('should allow <select> without a multiple and size attribute to have a menu role', () => {
    var vNode = queryFixture('<select id="target" role="menu">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns true custom element <my-navbar> with a role of navigation', () => {
    var vNode = queryFixture('<my-navbar id="target" role="navigation">');
    var actual = getCheckEvaluate('aria-allowed-role').call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false if a dpub role’s type is not the element’s implicit role', () => {
    var vNode = queryFixture('<article id="target" role="doc-biblioref">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(false);
  });

  it('returns true if a dpub role’s type is the element’s implicit role', () => {
    var vNode = queryFixture('<a id="target" href="foo" role="doc-biblioref">');
    expect(
      getCheckEvaluate('aria-allowed-role').call(
        checkContext,
        null,
        null,
        vNode
      )
    ).toBe(true);
  });
});
