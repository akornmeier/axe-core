import { queryFixture } from '@helpers/check-helpers';
import { createSyntheticAudit } from '@helpers/synthetic-audit';

import { describe, it, expect, beforeAll } from 'vitest';
const audit = createSyntheticAudit(['label-content-name-mismatch']);

describe('label-content-name-mismatch tests', () => {
  const check = audit.checks['label-content-name-mismatch'];
  const options = undefined;

  const fontApiSupport = !!document.fonts;

  // Vitest 4 removed Mocha's `done` callback in hooks; return a promise
  // instead. (Codemod gap noted in Sprint 3 brief §4 trailing work.)
  beforeAll(async () => {
    if (!fontApiSupport) {
      return;
    }
    const materialFont = new FontFace(
      'Material Icons',
      'url(https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2)'
    );
    await materialFont.load();
    document.fonts.add(materialFont);
  });

  it('returns true when visible text and accessible name (`aria-label`) matches (text sanitized)', () => {
    const vNode = queryFixture(
      '<div id="target" role="link" aria-label="next page &nbsp ">next page</div>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text and accessible name (`aria-label`) matches (character insensitive)', () => {
    const vNode = queryFixture(
      '<div id="target" role="link" aria-label="Next Page">next pAge</div>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text and accessible name (`aria-labelledby`) matches (character insensitive & text sanitized)', () => {
    const vNode = queryFixture(
      '<div id="target" aria-labelledby="yourLabel">UNTIL THE VeRy EnD</div>' +
        '<div id="yourLabel">uNtIl the very end  &nbsp</div>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text is contained in the accessible name', () => {
    const vNode = queryFixture(
      '<button id="target" name="link" aria-label="Next Page in the list">Next Page</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns false when visible text doesn’t match accessible name', () => {
    const vNode = queryFixture(
      '<div id="target" role="link" aria-label="OK">Next</div>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns false when not all of visible text is included in accessible name', () => {
    const vNode = queryFixture(
      '<button id="target" name="link" aria-label="the full">The full label</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns false when element has non-matching accessible name (`aria-labelledby`) and text content', () => {
    const vNode = queryFixture(
      '<div role="button" id="target" aria-labelledby="foo">some content</div>' +
        '<div id="foo">123</div>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns true when visible text excluding emoji is part of accessible name', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="I would like a burger">I would like a 🍔 </button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns true when visible text excluding punctuations/ symbols is part of accessible name', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="next page">next page &gt;&gt;</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  (fontApiSupport ? it : it.skip)(
    'returns true when visible text excluding ligature icon is part of accessible name',
    function () {
      const vNode = queryFixture(
        '<button id="target" aria-label="next page">next page <span style="font-family: \'Material Icons\'">delete</span></button>'
      );
      const actual = check.evaluate(vNode.actualNode, options, vNode);
      expect(actual).toBe(true);
    }
  );

  it('returns true when visible text excluding private use unicode is part of accessible name', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="Favorites"> Favorites</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns undefined (needs review) when visible text name is only an emoji', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="comet">☄️</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) when accessible name is an emoji', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="☄️">shooting star</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) for visible text is single characters (punctuation) used as icon', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="help">?</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) for unicode as accessible name and text content', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="&#x1F354">&#x1F354</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) for unicode text content', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="close">&#10060;</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns undefined (needs review) when punctuation is used as text content', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="wink">;)</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBeUndefined();
  });

  it('returns true when normal text content which is punctuated', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="I like football but I prefer cycling more">I like football, but I prefer cycling more.</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });

  it('returns false when normal puntuated text content is not contained in accessible name is punctuated', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="I like football">I like cycling more!!!</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(false);
  });

  it('returns true when text contains <br/>', () => {
    const vNode = queryFixture(
      '<button id="target" aria-label="button label">button<br>label</button>'
    );
    const actual = check.evaluate(vNode.actualNode, options, vNode);
    expect(actual).toBe(true);
  });
});
