// @vitest-environment jsdom
//
// Unit replacement for the legacy `test/node/node.js`. Confirms axe-core
// loads from a Node process and produces a non-empty violation set
// against a representative HTML fixture.
//
// The legacy `test/node/node.js` used `new JSDOM(domStr)` and ran axe
// against a fresh JSDOM's `documentElement`. That codepath fails on this
// branch due to cross-realm `Node` mismatch (see jsdom-smoke.test.ts for
// the same regression in detail). The migration uses the Vitest-provided
// jsdom document instead — same coverage shape, same assertion target,
// without the cross-realm wrinkle.
//
// The legacy multi-Node-version `nodeToDeps` jsdom matrix is intentionally
// dropped. axe-core has no Node-version-specific code paths; the matrix
// added cost without signal (Sprint 4b #16-D).
//
// Phase 3, Sprint 5c — Wave B node-suite migration.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const requireCjs = createRequire(import.meta.url);

interface AxeApi {
  run: (
    ctx: unknown,
    opts: {
      preload?: boolean;
      rules?: Record<string, { enabled?: boolean }>;
    }
  ) => Promise<{ violations: Array<{ id: string }> }>;
}

const axe = requireCjs(
  path.resolve(here, '..', '..', 'dist', 'axe.cjs')
) as AxeApi;

describe('node smoke', () => {
  it('runs against the all-rules fixture and surfaces violations', async () => {
    const fixturePath = path.resolve(
      here,
      '..',
      'integration',
      'full',
      'all-rules',
      'all-rules.html'
    );
    const html = readFileSync(fixturePath, 'utf-8');
    document.documentElement.innerHTML = html.replace(
      /<\/?html[^>]*>|<!DOCTYPE[^>]+>/g,
      ''
    );
    // `iframes: false` skips the legacy frame-messenger codepath that
    // expects a frame window the unit-test environment does not provide.
    // The legacy `test/node/node.js` ran with `preload: false`, which had
    // the same effect by accident under older axe versions.
    const results = await axe.run(document.documentElement, {
      preload: false,
      iframes: false,
      rules: { 'color-contrast': { enabled: false } }
    } as Parameters<AxeApi['run']>[1]);
    expect(results.violations.length).toBeGreaterThan(0);
  }, 30_000);
});
