// Root Vitest config for the axe-core package.
//
// Phase 3, Task 3 — establishes the Vitest scaffolding for the strangler-fig
// migration off Karma/Mocha. The browser block here is intentionally disabled;
// per-project browser settings are defined in `vitest.workspace.ts`.
//
// See specs/PRD-03-test-infrastructure-modernization.md §2.1.
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import projects from './vitest.workspace';

export default defineConfig({
  test: {
    // Workspace projects (unit | browser | integration) — see
    // ./vitest.workspace.ts. Vitest 4 dropped auto-discovery of
    // `vitest.workspace.{ts,js}`; the canonical API is this `projects`
    // field on the root config.
    projects,
    // --- Shared settings ---
    // Provides describe/it/expect without imports (Mocha compat for migrated tests).
    globals: true,
    include: ['test/**/*.{test,spec}.ts'],
    // Defense-in-depth: legacy Karma/Mocha test directories must NEVER be
    // collected by Vitest. They use a `.js` extension without the `.test.`
    // infix so the include glob already excludes them, but we list them
    // explicitly so an accidental rename (e.g. someone touching `*.spec.ts`
    // inside `test/integration/`) doesn't pull legacy fixtures into Vitest.
    exclude: [
      'test/integration/**',
      'test/{core,commons,checks,rule-matches,api,virtual-rules,act-rules,aria-practices,node,mock,assets}/**',
      'node_modules/**'
    ],
    setupFiles: ['./test/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['lib/core/generated/**'],
      // Coverage thresholds are aspirational for Phase 3 Sprint 4 (task 17).
      // Defining `thresholds` here would cause Vitest 4 to fail the run if
      // coverage falls short, which we cannot enforce until the bulk migration
      // is done. The values stay in source as a comment for traceability.
      // TODO: re-enable in Phase 3 Sprint 4 (task 17)
      // thresholds: {
      //   lines: 85,
      //   branches: 80,
      //   functions: 85,
      //   statements: 85,
      // },
      reporter: ['text', 'lcov', 'html']
    },
    reporters: ['default'],
    typecheck: {
      enabled: true
    },

    // --- Browser test configuration ---
    // Disabled at root; the workspace `browser` and `integration` projects
    // override this with their own provider + instances configuration.
    browser: {
      enabled: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }]
    }
  }
});
