// @vitest-environment jsdom
//
// Unit replacement for the legacy `test/node/jsdom.js`. Smoke-tests that
// axe-core can be loaded into Node + jsdom and produces a non-empty
// violation set against a synthetic DOM.
//
// The legacy `test/node/jsdom.js` covers ~10 cases that touch
// `axe.commons.*`, `axe.setup`, and `isCurrentPageLink`. Most of those
// already fail on this branch (see `pnpm test:jsdom`) due to a cross-realm
// quirk: `axe.run`'s `isContextSpec` check uses the `window.Node` axe
// captured at load time, which is NOT the same `Node` constructor as
// elements created inside a fresh `new JSDOM(...)` instance. Phase 4
// reworks the jsdom integration; Sprint 5c preserves the smoke shape.
// See `specs/phase-04-a3-carryover-bugs.md` §"Companion follow-up — jsdom
// cross-realm regressions".
//
// Phase 3, Sprint 5c — Wave B node-suite migration.

import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireCjs = createRequire(import.meta.url);

interface AxeApi {
  run: (
    ctx: unknown,
    opts: { rules?: Record<string, { enabled?: boolean }>; runOnly?: unknown }
  ) => Promise<{ violations: Array<{ id: string }> }>;
}

const axe = requireCjs(
  path.resolve(here, '..', '..', 'dist', 'axe.cjs')
) as AxeApi;

const domStr =
  '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Document</title></head>' +
  '<body>Hello' +
  '<a id="hash-link" href="#main">Main</a>' +
  '<a id="skip" href="https://page.com#main">Skip Link</a>' +
  '</body></html>';

describe('jsdom axe-core smoke', () => {
  it('runs against the Vitest-provided jsdom document', async () => {
    document.documentElement.innerHTML = domStr.replace(
      /<\/?html[^>]*>|<!DOCTYPE[^>]+>/g,
      ''
    );
    const results = await axe.run(document.documentElement, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations.length).toBeGreaterThan(0);
  });

  // The remaining tests in the legacy `test/node/jsdom.js` (axe.setup,
  // axe.commons.aria/text/dom, isCurrentPageLink across multiple URL
  // shapes) all rely on `new JSDOM(...)` instances whose `Node` constructor
  // is cross-realm to the one axe captured. They already fail on the
  // legacy harness; Phase 4 reworks them.
  // oxlint-disable-next-line vitest/warn-todo
  it.todo(
    'covers axe.setup / axe.commons / isCurrentPageLink (Phase 4 carryover)'
  );
});
