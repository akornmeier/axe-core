import { queryFixture, checks } from '@helpers/check-helpers';
import { describe, it, expect, beforeAll } from 'vitest';
describe('label-content-name-mismatch tests', () => {
  var check = checks['label-content-name-mismatch'];
  var options = undefined;

  var fontApiSupport = !!document.fonts;

  // Vitest 4 removed Mocha's `done` callback in hooks; return a promise
  // instead. (Codemod gap noted in Sprint 3 brief §4 trailing work.)
  beforeAll(async () => {
    if (!fontApiSupport) return;
    const materialFont = new FontFace(
      'Material Icons',
      'url(https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2)'
    );
    await materialFont.load();
    document.fonts.add(materialFont);
  });

  it('returns true when visible text and accessible name (`aria-label`) matches (text sanitized)', () => {
    var vNode = queryFixture(
      '<div id="target" role="link" aria-label="next page &nbsp ">next page</div>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text and accessible name (`aria-label`) matches (character insensitive)', () => {
    var vNode = queryFixture(
      '<div id="target" role="link" aria-label="Next Page">next pAge</div>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text and accessible name (`aria-labelledby`) matches (character insensitive & text sanitized)', () => {
    var vNode = queryFixture(
      '<div id="target" aria-labelledby="yourLabel">UNTIL THE VeRy EnD</div>' +
        '<div id="yourLabel">uNtIl the very end  &nbsp</div>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text is contained in the accessible name', () => {
    var vNode = queryFixture(
      '<button id="target" name="link" aria-label="Next Page in the list">Next Page</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns false when visible text doesn’t match accessible name', () => {
    var vNode = queryFixture(
      '<div id="target" role="link" aria-label="OK">Next</div>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns false when not all of visible text is included in accessible name', () => {
    var vNode = queryFixture(
      '<button id="target" name="link" aria-label="the full">The full label</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns false when element has non-matching accessible name (`aria-labelledby`) and text content', () => {
    var vNode = queryFixture(
      '<div role="button" id="target" aria-labelledby="foo">some content</div>' +
        '<div id="foo">123</div>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns true when visible text excluding emoji is part of accessible name', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="I would like a burger">I would like a 🍔 </button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text excluding punctuations/ symbols is part of accessible name', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="next page">next page &gt;&gt;</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  (fontApiSupport ? it : it.skip)(
    'returns true when visible text excluding ligature icon is part of accessible name',
    function () {
      var vNode = queryFixture(
        '<button id="target" aria-label="next page">next page <span style="font-family: \'Material Icons\'">delete</span></button>'
      );
      var actual = check.evaluate(vNode.actualNode, options, vNode);
      expect(actual).toBe(true);
    }
  );

  it('returns true when visible text excluding private use unicode is part of accessible name', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="Favorites"> Favorites</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns undefined (needs review) when visible text name is only an emoji', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="comet">☄️</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) when accessible name is an emoji', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="☄️">shooting star</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) for visible text is single characters (punctuation) used as icon', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="help">?</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) for unicode as accessible name and text content', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="&#x1F354">&#x1F354</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) for unicode text content', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="close">&#10060;</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) when punctuation is used as text content', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="wink">;)</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns true when normal text content which is punctuated', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="I like football but I prefer cycling more">I like football, but I prefer cycling more.</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns false when normal puntuated text content is not contained in accessible name is punctuated', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="I like football">I like cycling more!!!</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns true when text contains <br/>', () => {
    var vNode = queryFixture(
      '<button id="target" aria-label="button label">button<br>label</button>'
    );
    var actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });
});
