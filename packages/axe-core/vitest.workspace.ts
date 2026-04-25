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

// Vitest 4's `defineProject({ test: ... })` does NOT inherit `setupFiles`
// from the root `vitest.config.ts` `test` block — each project must wire
// its own. We point all three at the same setup file; it early-returns in
// Node (no `document`), so the `unit` project is unaffected.
const SETUP_FILES = ['./test/setup/vitest.setup.ts'];

export default [
  // Unit tests (Node.js, no DOM by default)
  defineProject({
    test: {
      name: 'unit',
      include: ['test/unit/**/*.test.ts'],
      environment: 'node',
      setupFiles: SETUP_FILES
    }
  }),

  // Browser tests (real browser via Playwright Chromium)
  defineProject({
    test: {
      name: 'browser',
      include: ['test/browser/**/*.test.ts'],
      setupFiles: SETUP_FILES,
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
  // NOTE: `test/integration/` currently contains LEGACY *.js fixture/spec
  // files served by Karma. The `*.test.ts` glob picks up zero files until
  // task 11 of the Phase 3 plan migrates them. That is the correct state.
  defineProject({
    test: {
      name: 'integration',
      include: ['test/integration/**/*.test.ts'],
      setupFiles: SETUP_FILES,
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }, { browser: 'firefox' }]
      }
    }
  })
];
