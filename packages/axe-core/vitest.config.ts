// Root Vitest config for the axe-core package.
//
// Phase 3, Task 3 — establishes the Vitest scaffolding for the strangler-fig
// migration off Karma/Mocha. The browser block here is intentionally disabled;
// per-project browser settings are defined in `vitest.workspace.ts`.
//
// See specs/PRD-03-test-infrastructure-modernization.md §2.1.
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import projects from './vitest.workspace';

// Sprint 5 #16-A: tests now import `lib/index.ts` directly (instead of the
// pre-built UMD `dist/axe.js`). `lib/index.ts` references `__AXE_VERSION__`
// — a Vite `define` substitution that the production build replaces. Vitest
// does NOT inherit Vite's build-time `define` for browser-mode projects under
// Vitest 4.1 (only the unit/Node project picks it up reliably), so the runtime
// fallback in `test/browser/_helpers/init-axe-global.ts` is the actual
// load-bearing path. We keep this define here too for the unit project.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(
  readFileSync(path.resolve(HERE, 'package.json'), 'utf8')
).version;

// NOTE: path aliases (`@checks`, `@helpers`, …) live in `vitest.workspace.ts`.
// Vitest 4 projects do not inherit `resolve.alias` from the root config,
// so each project wires its own. The aliases are also mirrored in
// `tsconfig.json`'s `paths` for editor / typecheck support. Sprint 3 task #9.

export default defineConfig({
  define: {
    __AXE_VERSION__: JSON.stringify(PKG_VERSION)
  },
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
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85
      },
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
