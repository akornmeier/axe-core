import {
  createMockCheckContext,
  queryFixture,
  getCheckEvaluateESM
} from '@helpers/check-helpers';
import ariaAllowedRoleEvaluate from '@checks/aria/aria-allowed-role-evaluate';
import { describe, it, expect, afterEach } from 'vitest';

const ariaAllowedRoleEvaluateESM = getCheckEvaluateESM(
  ariaAllowedRoleEvaluate,
  { allowImplicit: true, ignoredTags: [] }
);
describe('aria-allowed-role', () => {
  const checkContext = createMockCheckContext();

  afterEach(() => {
    checkContext.reset();
  });

  it('returns true if given element is an ignoredTag in options', () => {
    const vNode = queryFixture(
      '<article id="target" role="presentation"></article>'
    );
    const options = {
      ignoredTags: ['article']
    };
    const actual = ariaAllowedRoleEvaluateESM.call(
      checkContext,
      null,
      options,
      vNode
    );
    const expected = true;
    expect(actual).toBe(expected);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false with implicit role of row for TR when allowImplicit is set to false via options', () => {
    const vNode = queryFixture(
      '<table role="grid"><tr id="target" role="row"></tr></table>'
    );
    const options = {
      allowImplicit: false
    };
    const outcome = ariaAllowedRoleEvaluateESM.call(
      checkContext,
      null,
      options,
      vNode
    );

    expect(outcome).toBe(false);
    expect(checkContext._data).toEqual(['row']);
  });

  it('returns undefined (needs review) when element is hidden and has unallowed role', () => {
    const vNode = queryFixture(
      '<button id="target" type="button" aria-hidden="true"' +
        'role="presentation"></button>'
    );
    const actual = ariaAllowedRoleEvaluateESM.call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) when element is with in hidden parent and has unallowed role', () => {
    const vNode = queryFixture(
      '<div style="display:none">' +
        '<button id="target" class="mm-tabstart" type="button"' +
        'role="presentation"></button>' +
        '</div>'
    );
    const actual = ariaAllowedRoleEvaluateESM.call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBeUndefined();
  });

  it('returns true when BUTTON has type menu and role as menuitem', () => {
    const vNode = queryFixture(
      '<button id="target" type="menu" role="menuitem"></button>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when img has no alt and role="presentation"', () => {
    const vNode = queryFixture('<img id="target" role="presentation"/>');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns true when img has no alt and role="none"', () => {
    const vNode = queryFixture('<img id="target" role="none"/>');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns true when img has empty alt and role="presentation"', () => {
    const vNode = queryFixture('<img id="target" alt="" role="presentation"/>');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns true when img has empty alt and role="none"', () => {
    const vNode = queryFixture('<img id="target" alt="" role="none"/>');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data).toEqual(null);
  });

  it('returns false when img has alt and role="presentation"', () => {
    const vNode = queryFixture(
      '<img id="target" alt="not empty" role="presentation"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual(['presentation']);
  });

  it('returns false when img has alt and role="none"', () => {
    const vNode = queryFixture(
      '<img id="target" alt="not empty" role="none"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual(['none']);
  });

  it('returns true when img has aria-label and a valid role, role="button"', () => {
    const vNode = queryFixture(
      '<img id="target" aria-label="foo" role="button"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false when img has aria-label and a invalid role, role="alert"', () => {
    const vNode = queryFixture(
      '<img id="target" aria-label="foo" role="alert"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual(['alert']);
  });

  it('returns true when img has aria-labelledby and a valid role, role="menuitem"', () => {
    const vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" aria-labelledby="foo" role="menuitem"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false when img has aria-labelledby and a invalid role, role="rowgroup"', () => {
    const vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" aria-labelledby="foo" role="rowgroup"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual(['rowgroup']);
  });

  it('returns true when img has title and a valid role, role="link"', () => {
    const vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" title="foo" role="link"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false when img has title and a invalid role, role="radiogroup"', () => {
    const vNode = queryFixture(
      '<div id="foo">hello world</div>' +
        '<img id="target" title="foo" role="radiogroup"/>'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual(['radiogroup']);
  });

  it('returns true when input of type image and no role', () => {
    const vNode = queryFixture('<input id="target" type="image"/>');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns true when INPUT type is checkbox and has aria-pressed attribute', () => {
    const vNode = queryFixture(
      '<input id="target" type="checkbox" aria-pressed="">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is text with role combobox', () => {
    const vNode = queryFixture(
      '<input id="target" type="text" role="combobox">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is tel with role combobox', () => {
    const vNode = queryFixture(
      '<input id="target" type="tel" role="combobox">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is url with role combobox', () => {
    const vNode = queryFixture(
      '<input id="target" type="url" role="combobox">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is search with role combobox', () => {
    const vNode = queryFixture(
      '<input id="target" type="search" role="combobox">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is email with role combobox', () => {
    const vNode = queryFixture(
      '<input id="target" type="email" role="combobox">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is text with role spinbutton', () => {
    const vNode = queryFixture(
      '<input id="target" type="text" role="spinbutton">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is number with role spinbutton', () => {
    const vNode = queryFixture(
      '<input id="target" type="number" role="spinbutton">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is tel with role spinbutton', () => {
    const vNode = queryFixture(
      '<input id="target" type="tel" role="spinbutton">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true when INPUT type is text with role searchbox', () => {
    const vNode = queryFixture(
      '<input id="target" type="text" role="searchbox">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns false when a role is set on an element that does not allow any role', () => {
    const vNode = queryFixture('<dd id="target" role="link">');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
    expect(checkContext._data).toEqual(['link']);
  });

  it('returns true when a role is set on an element that can have any role', () => {
    const vNode = queryFixture('<div id="target" role="link"></dd>');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true an <a> without a href to have any role', () => {
    const vNode = queryFixture('<a id="target" role="presentation"></a>');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('returns true <a> with a empty href to have any valid role', () => {
    const vNode = queryFixture('<a id="target" role="link" href=""></a>');
    const actual = ariaAllowedRoleEvaluateESM.call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBe(true);
  });

  it('returns true <img> with a non-empty alt', () => {
    const vNode = queryFixture(
      '<img id="target" role="button" alt="some text">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });

  it('should allow <select> without a multiple and size attribute to have a menu role', () => {
    const vNode = queryFixture('<select id="target" role="menu">');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns true custom element <my-navbar> with a role of navigation', () => {
    const vNode = queryFixture('<my-navbar id="target" role="navigation">');
    const actual = ariaAllowedRoleEvaluateESM.call(
      checkContext,
      null,
      null,
      vNode
    );
    expect(actual).toBe(true);
    expect(checkContext._data, null).toBeNull();
  });

  it('returns false if a dpub role’s type is not the element’s implicit role', () => {
    const vNode = queryFixture('<article id="target" role="doc-biblioref">');
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(false);
  });

  it('returns true if a dpub role’s type is the element’s implicit role', () => {
    const vNode = queryFixture(
      '<a id="target" href="foo" role="doc-biblioref">'
    );
    expect(
      ariaAllowedRoleEvaluateESM.call(checkContext, null, null, vNode)
    ).toBe(true);
  });
});
