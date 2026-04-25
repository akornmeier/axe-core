import {
  createMockCheckContext,
  getCheckEvaluate,
  flatTreeSetup,
  shadowSupport,
  axe
} from '../../_helpers/check-helpers';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
describe('td-has-header', () => {
  let fixture: HTMLElement;
  beforeEach(() => {
    fixture = document.getElementById('fixture') as HTMLElement;
  });
  var checkContext = createMockCheckContext();

  afterEach(() => {
    fixture.innerHTML = '';
    checkContext.reset();
    axe._tree = null;
  });

  it('should not be fooled by rowspan and colspan', () => {
    fixture.innerHTML =
      '<table>' +
      '<thead>' +
      '    <tr>' +
      '      <td rowspan="2">Species</td>' +
      '      <td colspan="2">Info</td>' +
      '    </tr>' +
      '    <tr>' +
      '      <th>Name</th>' +
      '      <th>Age</th>' +
      '    </tr>' +
      '  </thead>' +
      '  <tbody>' +
      '    <tr>' +
      '      <td>Gorilla</td>' +
      '      <td>Koko</td>' +
      '      <td>44</td>' +
      '    </tr>' +
      '    <tr>' +
      '      <td>Human</td>' +
      '      <td>Matt</td>' +
      '      <td>33</td>' +
      '    </tr>' +
      '  </tbody>' +
      '</table>';
    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    var result = getCheckEvaluate('td-has-header').call(checkContext, node);

    expect(result).toBe(false);
    expect(checkContext._relatedNodes.length).toBe(4);
  });

  it('should return true each non-empty cell has a row header', () => {
    fixture.innerHTML =
      '<table>' + '  <tr> <th>hi</th> <td>hello</td> </tr>' + '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return true each non-empty cell has a column header', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <th>hi</th> <th>hello</th> </tr>' +
      '  <tr> <td>hi</td> <td>hello</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return true each non-empty cell has aria-label', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <td aria-label="one">hi</td> <td aria-label="two">hello</td> </tr>' +
      '  <tr> <td aria-label="one">hi</td> <td aria-label="two">hello</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return true each non-empty cell has aria-labelledby', () => {
    fixture.innerHTML =
      '<div id="one">one</div><div id="two">two</div>' +
      '<table>' +
      '  <tr> <td aria-labelledby="one">hi</td> <td aria-labelledby="two">hello</td> </tr>' +
      '  <tr> <td aria-labelledby="one">hi</td> <td aria-labelledby="two">hello</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return true each non-empty cell has a headers attribute', () => {
    // This will fail under td-headers-attr because the headers must be inside the table
    fixture.innerHTML =
      '<div id="one">one</div><div id="two">two</div>' +
      '<table>' +
      '  <tr> <td headers="one">hi</td> <td headers="two">hello</td> </tr>' +
      '  <tr> <td headers="one">hi</td> <td headers="two">hello</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return true there is at least one non-empty header', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <th>hi</th> <th>hello</th> </tr>' +
      '  <tr> <th></th> <td>hello</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return true if the only data cells are empty', () => {
    fixture.innerHTML =
      '<table>' + '  <tr> <td></td> <td></td> </tr>' + '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return false if a cell has no headers', () => {
    fixture.innerHTML =
      '<table>' + '  <tr> <td>hi</td> <td>hello</td> </tr>' + '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');

    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      false
    );
    expect(checkContext._relatedNodes).toEqual([
      node.rows[0].cells[0],
      node.rows[0].cells[1]
    ]);
  });

  it('should return false if a cell has no headers - complex table', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <td colspan="3">Psuedo-Caption</td> </tr>' +
      '  <tr> <td>hi</td> <td>hello</td> <td>Ok</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');

    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      false
    );
    expect(checkContext._relatedNodes).toEqual([
      node.rows[0].cells[0],
      node.rows[1].cells[0],
      node.rows[1].cells[1],
      node.rows[1].cells[2]
    ]);
  });

  it('should return true if the headers element is empty', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <th>Hello</th> <td headers="">goodbye</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');

    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return true if the headers element refers to non-existing elements', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <th>Hello</th> <td headers="beatles">goodbye</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');

    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });

  it('should return false if all headers are empty', () => {
    fixture.innerHTML =
      '<table>' +
      '  <tr> <th></th> <th></th> </tr>' +
      '  <tr> <td>hi</td> <td>hello</td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = fixture.querySelector('table');
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      false
    );
  });

  (shadowSupport ? it : it.skip)('recognizes shadow tree content', function () {
    fixture.innerHTML = '<div id="shadow"> <b>header</b> </div>';
    var shadow = fixture
      .querySelector('#shadow')
      .attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<table>' +
      '  <tr> <th><slot></slot> </tr>' +
      '  <tr> <td> data </td> </tr>' +
      '</table>';

    flatTreeSetup(fixture);
    var node = axe.utils.querySelectorAll(axe._tree, 'table')[0].actualNode;
    expect(getCheckEvaluate('td-has-header').call(checkContext, node)).toBe(
      true
    );
  });
});
