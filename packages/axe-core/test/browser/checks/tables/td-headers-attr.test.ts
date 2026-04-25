import {
  createMockCheckContext,
  fixtureSetup,
  getCheckEvaluate
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('td-headers-attr', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();
  var check = getCheckEvaluate('td-headers-attr');

  afterEach(() => {
    checkContext.reset();
  });

  it('returns true no headers attribute is present', () => {
    fixtureSetup(
      '<table>' +
        '  <tr> <th>hi</th> <td>hello</td> </tr>' +
        '  <tr> <th>hi</th> <td>hello</td> </tr>' +
        '</table>'
    );

    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);
  });

  it('returns true if a valid header is present', () => {
    fixtureSetup(
      '<table>' +
        '  <tr> <th id="hi">hello</th> </tr>' +
        '  <tr> <td headers="hi">goodbye</td> </tr>' +
        '</table>'
    );

    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);
  });

  it('returns true if multiple valid headers are present', () => {
    fixtureSetup(
      '<table>' +
        '  <tr> <th id="hi1">hello</th> <th id="hi2">hello</th> </tr>' +
        '  <tr> <td headers="hi1 \t\n hi2">goodbye</td> </tr>' +
        '</table>'
    );

    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);
  });

  it('returns true with an empty header', () => {
    fixtureSetup(
      '<table>' +
        '  <tr> <th id="hi1"></th> </tr>' +
        '  <tr> <td headers="hi1">goodbye</td> </tr>' +
        '</table>'
    );

    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);
  });

  it('returns undefined if headers is empty', () => {
    fixtureSetup(
      '<table>' +
        '  <tr> <th id="hi"> </th> </tr>' +
        '  <tr> <td headers="">goodbye</td> </tr>' +
        '</table>'
    );

    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBeUndefined();
  });

  it('returns false if the header is a table cell', () => {
    var node;

    fixtureSetup(
      '<table>' +
        '  <tr> <th> <span id="hi">hello</span> </th> </tr>' +
        '  <tr> <td headers="h1">goodbye</td> </tr>' +
        '</table>'
    );
    node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(false);

    fixtureSetup(
      '<span id="hi">hello</span>' +
        '<table>' +
        '  <tr> <th></th> </tr>' +
        '  <tr> <td headers="h1">goodbye</td> </tr>' +
        '</table>'
    );
    node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(false);
    expect(checkContext._data).toEqual({
      messageKey: 'cell-header-not-in-table'
    });

    fixtureSetup(
      '<table id="hi">' +
        '  <tr> <th>hello</th> </tr>' +
        '  <tr> <td headers="h1">goodbye</td> </tr>' +
        '</table>'
    );
    node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(false);
  });

  it('returns false if table cell referenced as header', () => {
    fixtureSetup(`
      <table>
        <tr> <td id="hi">hello</td> </tr>
        <tr> <td headers="hi">goodbye</td> </tr>
      </table>
    `);

    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(false);
    expect(checkContext._data).toEqual({ messageKey: 'cell-header-not-th' });
  });

  it('returns true if table cell referenced as header with role rowheader or columnheader', () => {
    var node;

    fixtureSetup(`
      <table>
        <tr> <td role="rowheader" id="hi">hello</td> </tr>
        <tr> <td headers="hi">goodbye</td> </tr>
      </table>
    `);

    node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);

    fixtureSetup(`
      <table>
        <tr> <td role="columnheader" id="hi">hello</td> </tr>
        <tr> <td headers="hi">goodbye</td> </tr>
      </table>
    `);

    node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);
  });

  it('relatedNodes contains each cell only once', () => {
    fixtureSetup(`
      <table>
        <tr> <td id="hi1">hello</td> </tr>
        <tr> <td id="hi2">hello</td> </tr>
        <tr> <td id="bye" headers="hi1 hi2">goodbye</td> </tr>
      </table>'
    `);

    var node = fixture.querySelector('table');
    check.call(checkContext, node);
    expect(checkContext._relatedNodes).toEqual([fixture.querySelector('#bye')]);
  });

  it('returns false if the header refers to the same cell', () => {
    fixtureSetup(
      '<table id="hi">' +
        '  <tr> <th>hello</th> </tr>' +
        '  <tr> <td id="bye" headers="bye">goodbye</td> </tr>' +
        '</table>'
    );

    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(false);
    expect(checkContext._data).toEqual({ messageKey: 'header-refs-self' });
  });

  it('returns true if td[headers] is hidden', () => {
    fixtureSetup(
      '<table>' +
        '  <tr> <th>Hello</th> <td headers="h1" hidden>goodbye</td> </tr>' +
        '</table>'
    );
    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);
  });

  it('returns true if td[headers] has aria-hidden=true', () => {
    fixtureSetup(
      '<table>' +
        '  <tr> <th>Hello</th> <td headers="h1" aria-hidden="true">goodbye</td> </tr>' +
        '</table>'
    );
    var node = fixture.querySelector('table');
    expect(check.call(checkContext, node)).toBe(true);
  });
});
