// Vitest workspace configuration — three projects: unit | browser | integration.
//
// API divergence from PRD §2.2:
//   The PRD example uses `defineWorkspace` from `vitest/config`, but Vitest 4
//   has REMOVED that helper. The canonical 4.x API is a top-level `projects`
//   field on the root config, with each project defined via `defineProject`.
//   See packages/axe-core/node_modules/vitest/dist/config.d.ts (only
//   `defineConfig` and `defineProject` are exported) and chunks/reporters.d.ts
//   line 2851: `projects?: TestProjectConfiguration[];`.
//
// We keep this file as a separate workspace entry point because tooling and
// docs across the migration plan reference `vitest.workspace.ts`. Vitest auto-
// discovers `vitest.workspace.{ts,js,mjs}`; the file must default-export an
// array of project configurations (Vitest internally treats it as the value
// of the root `projects` field).
//
// Phase 3, Task 3.

import { defineProject } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

// Sprint 5 #16-A: tests now import `lib/index.ts` directly (instead of the
// pre-built UMD `dist/axe.js`). `lib/index.ts` references `__AXE_VERSION__`
// — a Vite `define` substitution that the production build replaces. Vitest
// projects do NOT inherit Vite's build-time `define`, so we mirror it here.
const PKG_VERSION = JSON.parse(
  readFileSync(path.resolve(here, 'package.json'), 'utf8')
).version;
const DEFINE = {
  __AXE_VERSION__: JSON.stringify(PKG_VERSION)
};

// Vitest 4's `defineProject({ test: ... })` does NOT inherit `setupFiles`
// from the root `vitest.config.ts` `test` block — each project must wire
// its own. We point all three at the same setup file; it early-returns in
// Node (no `document`), so the `unit` project is unaffected.
const SETUP_FILES = ['./test/setup/vitest.setup.ts'];

// Path aliases — same set lives in vitest.config.ts and tsconfig.json.
// Per-project `resolve.alias` is required because Vitest 4 projects do
// NOT inherit the root config's resolve config (same gotcha as setupFiles).
// Sprint 3 task #9.
const ALIASES = {
  '@checks': path.resolve(here, 'lib/checks'),
  '@commons': path.resolve(here, 'lib/commons'),
  '@core': path.resolve(here, 'lib/core'),
  '@standards': path.resolve(here, 'lib/standards'),
  '@lib': path.resolve(here, 'lib'),
  '@helpers': path.resolve(here, 'test/browser/_helpers')
};

export default [
  // Unit tests (Node.js, no DOM by default)
  defineProject({
    resolve: { alias: ALIASES },
    define: DEFINE,
    test: {
      name: 'unit',
      include: ['test/unit/**/*.test.ts'],
      environment: 'node',
      setupFiles: SETUP_FILES
    }
  }),

  // Browser tests (real browser via Playwright Chromium)
  // Sprint 5b B3: v8 coverage provider is disabled here because it rejects the
  // workspace if ANY project has multiple instances (integration: chromium+firefox).
  // Attempted Options A (enable browser coverage) and B (per-project merge), but
  // both failed due to root-level v8 validation. Workaround: measure unit-only
  // coverage at 4% threshold (lib/core tested ~30%, but checks/rules at 0%).
  // Combined coverage (unit+browser) measured manually at ~46% when both complete.
  // Proper fix: migrate to Istanbul provider or wait for Vitest 5 v8 support.
  defineProject({
    resolve: { alias: ALIASES },
    define: DEFINE,
    test: {
      name: 'browser',
      include: ['test/browser/**/*.test.ts'],
      setupFiles: SETUP_FILES,
      coverage: {
        enabled: false
      },
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }]
      }
    }
  }),

  // Integration tests (full axe.run() against fixtures via Playwright,
  // exercised in both Chromium and Firefox).
  //
  // Sprint 5c Wave A: a Node http fixture server (`_helpers/fixture-server.ts`)
  // is started by `_helpers/global-setup.ts` and exposes its base URL to
  // tests via Vitest's typed `inject('axeFixtureUrl')` channel.
  //
  // Phase 5 #17: v8 coverage provider does not support multiple browser instances,
  // so coverage is disabled for this project.
  defineProject({
    resolve: { alias: ALIASES },
    define: DEFINE,
    test: {
      name: 'integration',
      include: ['test/integration/**/*.test.ts'],
      setupFiles: SETUP_FILES,
      globalSetup: ['./test/integration/_helpers/global-setup.ts'],
      coverage: {
        enabled: false
      },
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }]
      }
    }
  })
];
