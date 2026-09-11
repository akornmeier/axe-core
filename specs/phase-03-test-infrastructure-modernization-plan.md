# Plan: Phase 3 — Test Infrastructure Modernization (Karma/Mocha → Vitest 4 + Playwright)

> Historical migration plan. Use [The next accessibility engine](streamlined-modernization-plan.html) for new execution and [repository reconciliation](modernization-reconciliation.md) for the current baseline and PR #5 reuse map. Tasks below retain their historical state; they are not a second active queue.

## Task Description

Replace axe-core's three-system legacy test stack (Mocha + Chai + Sinon for Node, Karma for browser, `http-server` + HTML fixtures for integration) with a single unified test framework: **Vitest 4** with **Browser Mode powered by Playwright**. This work implements `specs/PRD-03-test-infrastructure-modernization.md` (PRD v2.0, Feb 16 2026) on top of the now-completed Phase 0 (PNPM monorepo), Phase 1 (TypeScript strict + Zod schemas), and Phase 2 (Vite + Rolldown build pipeline).

The migration is largely mechanical — Vitest's API is Jest-compatible and Mocha's `describe/it` pattern maps directly — but it touches every test file under `packages/axe-core/test/` (core, commons, checks, rule-matches, integration, act-rules, aria-practices, node, virtual-rules, locales). It also removes ~12 legacy devDependencies and all IE-era polyfills.

This plan is **planning only**. Execution happens later via `/build` against this document.

## Objective

When this plan is complete:

1. `pnpm test --filter=axe-core` runs the entire suite via Vitest with **zero behavioural regressions** vs. the current Karma/Mocha pipeline.
2. `karma.conf.js`, all `karma-*` packages, `mocha`, `chai`, `sinon`, `http-server`, and `jquery` are deleted from `packages/axe-core/package.json`.
3. Browser tests run in real Chromium and Firefox via Playwright, exercised through Vitest Browser Mode.
4. Code coverage baseline is established with v8 provider; thresholds enforced in CI (≥85% lines for `lib/core/`).
5. CI runs `unit`, `browser`, `integration`, and `typecheck` jobs in parallel, cached through Turborepo.
6. Total wall-clock test time on CI is ≥50% lower than the current pipeline.
7. All IE/legacy polyfills enumerated in PRD §2.4 are removed from `lib/`, fixtures, and test code.

## Problem Statement

axe-core's current test infrastructure has three independent problems that compound:

- **Three test runners, three configs.** Mocha runs Node tests, Karma+Mocha runs browser tests, and Selenium WebDriver via `start-server-and-test` runs integration. Each has its own bootstrapping, reporters, and CI wiring. Engineers have to remember which `pnpm test:*` script maps to which runner.
- **Karma is end-of-life.** It's in maintenance mode, still ships `karma-ie-launcher` (IE is dead since 2022), and has no first-class TypeScript story. Vitest Browser Mode is the modern replacement endorsed by the Vite ecosystem axe-core just adopted in Phase 2.
- **Test code carries dead weight.** Test fixtures still load jQuery, polyfill `Array.from` for IE11, and use a global `axe.testUtils.getCheckEvaluate()` helper instead of importing checks directly. Phase 1 (TS strict) and Phase 2 (Vite) made direct ESM imports possible; tests should now match.

The test stack is also a blocker for Phase 4 (Rules & Checks Optimization) — refactoring rule internals is risky without a fast, trustworthy test loop.

## Solution Approach

A **strangler-fig migration**: stand up Vitest alongside Karma in Sprint 1, migrate tests in bulk through Sprints 2–3, and delete Karma in Sprint 4. CI runs both stacks in parallel during Sprints 1–3 so any regression is caught against the old runner before the old runner is deleted.

Migration mechanics:

- **Sprint 1 (Foundation):** Install Vitest 4 + `@vitest/browser-playwright` + Playwright, write `vitest.config.ts` and `vitest.workspace.ts` with `unit | browser | integration` projects, migrate ~10 representative tests across all categories (Node unit, browser check, integration `axe.run`) to validate patterns and catch surprises (color-contrast computed-style rendering being the main risk).
- **Sprint 2 (Bulk unit migration):** Codemod-driven conversion of `test/commons/`, `test/core/`, `test/rule-matches/`, `test/checks/` (Node-side). Find/replace tables for Chai → `expect`, Sinon → `vi.spyOn`/`vi.fn`. Replace `require()` with ESM `import`. Convert globals (`axe.utils.getSelector`) to direct module imports.
- **Sprint 3 (Browser + integration migration):** Convert browser tests to Vitest Browser Mode; rebuild the HTML fixture story (inline template literals for simple cases, file imports for medium, `page.goto()` against Vite dev server for full-page integration). Audit and remove polyfills. Remove jQuery from test code.
- **Sprint 4 (Cleanup + hardening):** Delete `karma.conf.js`, all `karma-*` deps, `mocha`, `chai`, `sinon`, `http-server`, `jquery`. Set v8 coverage thresholds. Wire Turborepo `test`/`test:browser`/`typecheck` pipelines. Update `.github/workflows/test.yml` and `CONTRIBUTING.md`.

**Why this order:** the unit suite is the largest body of tests but the lowest risk (no DOM); migrating it first builds team muscle memory before tackling browser and integration which carry the real risk (color-contrast, fixtures, parallel-test isolation).

## Relevant Files

### Source PRD & adjacent plans

- `specs/PRD-03-test-infrastructure-modernization.md` — authoritative spec (v2.0, Feb 16 2026). Source of truth for thresholds, dep changes, and migration patterns. Read first.
- `specs/PRD-00-axe-core-modernization-overview.md` — master plan; confirms Phase 3's place in the program.
- `specs/build-system-modernization-plan.md` & `specs/phase-01-type-system-modernization-plan.md` — examples of execution structure used for prior phases.

### Test infrastructure to replace

- `packages/axe-core/test/karma.conf.js` — Karma launcher referenced by `npm run test:unit`. Delete in Sprint 4.
- `packages/axe-core/test/testutils.js` — global `axe.testUtils.getCheckEvaluate()` shim used across browser tests. Replace with direct imports.
- `packages/axe-core/test/get-webdriver.js` — Selenium WebDriver bootstrapping. Replaced by Playwright.
- `packages/axe-core/test/test-locales.js`, `test-virtual-rules.js`, `test-rule-help-version.js` — Mocha-driven Node entry points. Convert to `*.test.ts` under a `test/unit/` tree.
- `packages/axe-core/test/playground.html` — manual debugging fixture; keep but reframe under Vite dev server.

### Test bodies to migrate (by directory)

- `packages/axe-core/test/core/` — engine internals (Audit, Rule, Check, run/configure). Highest density of unit tests; highest coverage value.
- `packages/axe-core/test/commons/` — shared utilities (DOM, text, color, math). Pure-ish; mostly Node-friendly.
- `packages/axe-core/test/checks/` — per-check evaluators. Browser tests; some require computed CSS (color-contrast).
- `packages/axe-core/test/rule-matches/` — selector/match logic. Browser tests.
- `packages/axe-core/test/integration/` — full `axe.run()` against fixture pages. Goes to Vitest `integration` project + Playwright.
- `packages/axe-core/test/act-rules/` & `test/aria-practices/` — external standards conformance suites driven by Mocha. Convert to Vitest Node project; keep external GitHub repo deps (`wcag-act-rules`, `aria-practices`).
- `packages/axe-core/test/node/` — JSDOM-based smoke tests. Note PRD-00 §4.4: JSDOM is **deprecated with a warning in v4, removal in v5** — keep these tests for now but tag them.
- `packages/axe-core/test/mock/` — fixture helpers. Audit and prune jQuery dependence.
- `packages/axe-core/test/assets/` — large fixture assets; keep, serve through Vite.

### Configuration files (to create or modify)

- `packages/axe-core/package.json` — script section completely rewritten; devDeps overhauled (PRD §4).
- `packages/axe-core/vite.config.ts` — already exists from Phase 2; reference from Vitest config.
- `turbo.json` — add `test`, `test:browser`, `test:integration`, `typecheck` task graph entries with Turborepo caching keys.
- `.github/workflows/test.yml` — current single-job workflow → 4-job parallel (unit/browser/integration/typecheck). PRD §2.6 has the target.
- `packages/axe-core/CONTRIBUTING.md` — update local-dev test commands.

### New files

- `packages/axe-core/vitest.config.ts` — root config (PRD §2.1).
- `packages/axe-core/vitest.workspace.ts` — three-project workspace (PRD §2.2).
- `packages/axe-core/test/setup/vitest.setup.ts` — global beforeEach/afterEach (fixture container creation, DOM cleanup), Zod schema matchers, Playwright trace upload hooks.
- `packages/axe-core/test/setup/fixture-helpers.ts` — replacement for `testutils.js`; exports `createFixture()`, `loadHTMLFixture(path)`, typed.
- `packages/axe-core/test/fixtures/README.md` — documents fixture-loading conventions (inline | file | `page.goto`).

## Implementation Phases

### Phase 1: Foundation (Sprint 1, weeks 1–2)

Install Vitest 4, `@vitest/browser-playwright`, `@vitest/coverage-v8`, `playwright`. Author `vitest.config.ts` + `vitest.workspace.ts` with three projects: `unit` (Node), `browser` (Playwright Chromium), `integration` (Playwright Chromium + Firefox). Stand up the test setup file and fixture-helper module. Migrate ten representative tests across categories (3 Node unit, 3 browser check, 2 rule-match, 2 integration) to **prove the pattern works** — including the high-risk **color-contrast** check that depends on real computed styles. Add `pnpm test:vitest` script alongside `pnpm test:unit` (Karma) so both run in CI.

Exit criteria: ten Vitest tests green in CI on Linux Chromium + Firefox; coverage report renders; both old and new pipelines pass on every PR.

### Phase 2: Core Implementation (Sprints 2–3, weeks 3–6)

**Sprint 2 — bulk unit migration.** Author and run a `jscodeshift` (or AST-based `ts-morph`) codemod for Chai → `expect` and Sinon → `vi`. Convert `test/commons/`, `test/core/`, `test/rule-matches/`, then check evaluators that don't need a real browser. Replace `require()` with ESM `import`; replace `axe.utils.foo` global access with direct module imports (now possible thanks to Phase 1+2). Establish coverage baseline number — record in PR description, do not yet enforce thresholds.

**Sprint 3 — browser + integration migration.** Convert browser-bound tests in `test/checks/`, `test/rule-matches/`, `test/integration/`. Pick the fixture loading strategy per test (inline string | file import | `page.goto`). Migrate `act-rules` and `aria-practices` Mocha drivers to Vitest. **Audit polyfills** per PRD §2.4 — grep for `polyfill|shim|ponyfill`, evaluate each hit, delete what Baseline 2024 covers. Remove jQuery from all fixtures and test helpers. Validate parallel-test isolation strategy (per-test fixture containers, not shared `<div id="fixture">`); add `test.sequential` annotations only where genuinely needed.

### Phase 3: Integration & Polish (Sprint 4, weeks 7–8)

Delete `karma.conf.js`. Remove all 12 dead devDependencies from `packages/axe-core/package.json` (see PRD §4). Wire Turborepo `test`, `test:browser`, `test:integration`, `typecheck` tasks with `outputs` for cache hits and `dependsOn: ["^build"]`. Replace `.github/workflows/test.yml` with the four-job parallel configuration from PRD §2.6. Enable v8 coverage thresholds (lines 85, branches 80, functions 85, statements 85) — fail CI on regression. Enable Playwright traces on failure with artifact upload (open question 6.1 — leaning yes). Benchmark old vs. new wall-clock; record in PR description; demand ≥50% reduction. Update `CONTRIBUTING.md` and rename test scripts so `pnpm test`, `pnpm test:browser`, `pnpm test:integration` are the canonical commands.

## Sprint 4 — Realized Outcomes & Adjusted Scope (2026-04-25)

**What landed in Sprint 4:**

1. **PRD-01 §4.1 carryovers closed.** `lib/core/utils/memoize.ts` no longer mutates `axe` at module top level. `valid-langs.ts` trie traversal fixed. `uuid.ts` got the same ESM-load guard. Commit `031008eb`.
2. **73 of 246 `.test.ts.todo` files migrated** in `test/browser/{commons,core,rule-matches}/` via `scripts/migrate-todo-tests.mjs`. Commit `5d6c67eb`. Vitest pass count jumped from 1444→2163 tests.
3. **10 of 84 check tests** flipped from UMD-hybrid to ESM-direct (commit `59545ca7`). Mechanical script at `/tmp/flip-checks.mjs`; clean-id list at `/tmp/task4-clean-files.txt`.

**What did NOT land in Sprint 4:**

- The other 74 check tests cannot mechanically flip to ESM-direct yet. Path A (Vite plugin to alias the bundle's bare imports) and Path B (drop the UMD bundle from `_helpers/check-helpers.ts`) were both attempted. Path B revealed that the dual-instance issue is structural — separate copies of `lib/core/base/cache.ts`, `lib/standards/*`, and `AbstractVirtualNode` between the UMD bundle and the ESM project. `axe.configure()` writes to UMD's standards registry only; `nodeLookup()` `instanceof` checks fail across module instances. Cache mirroring alone is insufficient.
- The 173 remaining `.test.ts.todo` files in `commons/`/`core/`/`rule-matches/`. Top blocker buckets: 97 use chai `assert.*` (Sprint 4b codemod target), 42 mutate `axe._tree` directly, 33 hit Path-B work-in-flight bugs, 26 use `axe._audit`, 14 use unknown `axe.testUtils.*` helpers.

**Decision: Sprint 5 deletes the UMD bundle from the test harness.** Task #16 below already deletes Karma + the UMD bundle's role. Once that lands, the dual-instance issue dissolves: there is only one module graph, the harness imports `setup`/`teardown` directly from `lib/core/public/*`, and the remaining 74 check tests flip mechanically with the existing script. Path B then becomes a one-line change to `_helpers/check-helpers.ts` rather than the architectural surgery this sprint discovered.

**Sprint 4b (incremental, parallel to Sprint 5 prep):**

- Build the `assert.*` → `expect(...).to*(...)` codemod and run on the 97 affected `.test.ts.todo` files.
- Build the `axe._tree = axe.utils.getFlattenedTree(node)` → `flatTreeSetup(node)` codemod and run on the 42 affected files.
- Both unblock more `.test.ts.todo` migrations without depending on Sprint 5.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: vitest-foundation-builder
  - Role: Stand up Vitest 4, Playwright, the workspace config, the setup file, fixture-helper module, and the first ~10 representative migrated tests.
  - Agent Type: builder
  - Resume: true
- Builder
  - Name: codemod-author
  - Role: Author the Chai→`expect` and Sinon→`vi` AST codemod (ts-morph or jscodeshift), validate against a small sample, hand off to bulk migrators.
  - Agent Type: ts-builder
  - Resume: true
- Builder
  - Name: unit-test-migrator
  - Role: Run the codemod across `test/commons/`, `test/core/`, `test/rule-matches/` and Node-side `test/checks/` evaluators; fix codemod misses; replace `require` with `import`; convert global `axe.*` usage to direct imports.
  - Agent Type: ts-builder
  - Resume: true
- Builder
  - Name: browser-test-migrator
  - Role: Convert browser-bound tests in `test/checks/`, `test/rule-matches/`, plus `test/integration/`, `test/act-rules/`, `test/aria-practices/`. Implement per-test fixture containers and pick the right fixture-loading strategy per file.
  - Agent Type: ts-builder
  - Resume: true
- Builder
  - Name: polyfill-jquery-purger
  - Role: Audit `lib/`, `test/`, fixtures for polyfills and jQuery; delete what Baseline 2024 covers; replace jQuery in test helpers with native DOM.
  - Agent Type: builder
  - Resume: false
- Builder
  - Name: ci-and-turbo-wiring
  - Role: Update `.github/workflows/test.yml` to the 4-job parallel layout; add `test`/`test:browser`/`test:integration`/`typecheck` task graph entries to `turbo.json` with proper inputs/outputs and cache keys.
  - Agent Type: engineering-devops-automator
  - Resume: false
- Builder
  - Name: dependency-cleanup
  - Role: Remove the 12 dead devDependencies from `packages/axe-core/package.json`, delete `karma.conf.js`, regenerate `pnpm-lock.yaml`, update `CONTRIBUTING.md` test commands.
  - Agent Type: builder
  - Resume: false
- Validator
  - Name: regression-validator
  - Role: Run full Vitest suite + lint + typecheck + coverage; compare counts against the legacy Karma/Mocha baseline captured in Sprint 1; flag any test counts that dropped without a documented reason.
  - Agent Type: validator
  - Resume: false
- Validator
  - Name: coverage-checker
  - Role: Verify v8 coverage meets the 85/80/85/85 thresholds, especially `lib/core/` ≥85% lines.
  - Agent Type: coverage-checker
  - Resume: false
- Reviewer
  - Name: code-reviewer
  - Role: Final pass — pattern compliance, ensure no Mocha/Chai/Sinon imports remain, confirm parallel-test isolation, confirm no `karma-*` strings anywhere in the repo.
  - Agent Type: code-review
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Capture the legacy test baseline

- **Task ID**: capture-baseline
- **Depends On**: none
- **Assigned To**: regression-validator
- **Agent Type**: validator
- **Parallel**: false
- Run `pnpm --filter=axe-core run test` against the existing Karma+Mocha pipeline; capture: total test count per directory, pass/fail counts, total wall-clock duration, and current (informal) coverage.
- Record results in `specs/phase-03-baseline.md` (new file) so subsequent migration steps can compare against an authoritative number.
- Save dependency snapshot: `pnpm --filter=axe-core list --depth=0 > specs/phase-03-deps-before.txt`.

### 2. Install Vitest + Playwright toolchain

- **Task ID**: install-vitest-toolchain
- **Depends On**: capture-baseline
- **Assigned To**: vitest-foundation-builder
- **Agent Type**: builder
- **Parallel**: false
- Add `vitest@^4.0`, `@vitest/browser-playwright@^4.0`, `@vitest/coverage-v8@^4.0`, `playwright@^1.50` to `packages/axe-core/devDependencies` via `pnpm add -D --filter=axe-core`.
- Run `pnpm exec playwright install chromium firefox` and document any system deps in `CONTRIBUTING.md`.
- Do NOT remove any existing `karma-*`, `mocha`, `chai`, `sinon`, or `http-server` deps yet — strangler-fig requires both stacks live.

### 3. Author Vitest config + workspace

- **Task ID**: vitest-config
- **Depends On**: install-vitest-toolchain
- **Assigned To**: vitest-foundation-builder
- **Agent Type**: builder
- **Parallel**: false
- Create `packages/axe-core/vitest.config.ts` per PRD §2.1 (globals, `lib/**/*.ts` coverage scope, v8 provider, default reporters, browser block disabled at root).
- Create `packages/axe-core/vitest.workspace.ts` per PRD §2.2 with three projects: `unit` (Node, `test/unit/**`), `browser` (Chromium, `test/browser/**`), `integration` (Chromium + Firefox, `test/integration/**`).
- Create `packages/axe-core/test/setup/vitest.setup.ts`: registers global `beforeEach` to create per-test fixture containers and `afterEach` to remove them; wires Zod schema matchers from `@axe-core/schemas`.
- Create `packages/axe-core/test/setup/fixture-helpers.ts`: typed `createFixture()`, `loadHTMLFixture(path)`, `runAxeOnPage(url)` helpers — the replacement for `testutils.js`.

### 4. Pilot migration: 10 representative tests

- **Task ID**: pilot-migration
- **Depends On**: vitest-config
- **Assigned To**: vitest-foundation-builder
- **Agent Type**: builder
- **Parallel**: false
- Migrate three Node unit tests (pick from `test/commons/utils/`), three browser check tests (one of which MUST be `color-contrast` to validate computed-style rendering — PRD open question 6.2), two rule-match tests, two integration tests under `test/integration/full/`.
- Land them under a parallel `test/unit/`, `test/browser/`, `test/integration/` tree (do NOT delete originals yet).
- Add `test:vitest` script alongside existing `test:unit` Karma script; both run in CI.
- Confirm color-contrast test passes — this is the single biggest technical risk in the phase.

### 5. CI parallel-stack bring-up

- **Task ID**: ci-parallel-stack
- **Depends On**: pilot-migration
- **Assigned To**: ci-and-turbo-wiring
- **Agent Type**: engineering-devops-automator
- **Parallel**: false
- Add a `vitest-pilot` job to `.github/workflows/test.yml` that runs `pnpm test:vitest` against the migrated subset on every PR, in parallel with the existing Karma job.
- Do NOT yet remove the Karma job. Both must remain green for the duration of Sprints 2–3.

### 6. Author Chai→Vitest / Sinon→Vitest codemod

- **Task ID**: author-codemod
- **Depends On**: pilot-migration
- **Assigned To**: codemod-author
- **Agent Type**: ts-builder
- **Parallel**: true (alongside ci-parallel-stack)
- Use `ts-morph` (preferred — keeps types) or `jscodeshift` to AST-rewrite per PRD §2.3.1 mapping table.
- Validate against the ten pilot files: codemod must produce byte-identical output to the hand-migrated versions, modulo formatting.
- Commit codemod under `packages/build-tools/src/codemods/migrate-mocha-to-vitest.ts` so it's reusable.

### 7. Bulk migrate `test/commons/`

- **Task ID**: migrate-commons
- **Depends On**: author-codemod
- **Assigned To**: unit-test-migrator
- **Agent Type**: ts-builder
- **Parallel**: true (with migrate-core, migrate-rule-matches once codemod stable)
- Run codemod across `test/commons/**/*.js`, output to `test/unit/commons/**/*.test.ts`.
- Replace `require()` with ESM `import`.
- Replace `axe.commons.foo` globals with direct imports from `lib/commons/`.
- Run `pnpm test:vitest -- test/unit/commons` until green.

### 8. Bulk migrate `test/core/`

- **Task ID**: migrate-core
- **Depends On**: author-codemod
- **Assigned To**: unit-test-migrator
- **Agent Type**: ts-builder
- **Parallel**: true
- Same procedure as migrate-commons applied to `test/core/`.
- Pay special attention to Audit/Rule/Check construction tests that depend on internal class identity — verify imports point at the right module.

### 9. Bulk migrate `test/rule-matches/`

- **Task ID**: migrate-rule-matches
- **Depends On**: author-codemod
- **Assigned To**: unit-test-migrator
- **Agent Type**: ts-builder
- **Parallel**: true
- Same procedure. These tests touch the DOM but most can run in jsdom-style Node fixtures via the `unit` project; route DOM-heavy ones to the `browser` project.

### 10. Migrate browser-bound `test/checks/`

- **Task ID**: migrate-checks-browser
- **Depends On**: migrate-commons, migrate-core
- **Assigned To**: browser-test-migrator
- **Agent Type**: ts-builder
- **Parallel**: false
- Convert all `test/checks/**/*.js` to `test/browser/checks/**/*.test.ts` running under the Vitest `browser` project.
- Replace `axe.testUtils.getCheckEvaluate('foo')` with direct imports from `lib/checks/`.
- Replace shared `<div id="fixture">` with per-test `createFixture()` helper for parallel-test safety (PRD §5.5).
- **Sprint 4 status (2026-04-25):** Sprint 3 task #10 migrated all 84 check tests to the **UMD-hybrid path** (`getCheckEvaluate('id')` against the loaded UMD bundle). Sprint 4 flipped **10** of those to ESM-direct via `getCheckEvaluateESM(<evaluator>)`. The remaining **74** are blocked by the dual-instance issue between the UMD bundle and ESM imports of `lib/`. Task #16 (delete-legacy) unblocks them automatically; the flip becomes a `node /tmp/flip-checks.mjs` re-run after the bundle is gone.

### 11. Migrate `test/integration/`

- **Task ID**: migrate-integration
- **Depends On**: migrate-checks-browser
- **Assigned To**: browser-test-migrator
- **Agent Type**: ts-builder
- **Parallel**: false
- Convert `test/integration/full/*` to `test/integration/**/*.test.ts` under the Vitest `integration` project.
- Replace Selenium WebDriver usage with Playwright `page.goto()` against fixture URLs served by Vite dev server.
- Decommission `test/get-webdriver.js` once nothing imports it.

### 12. Migrate `test/act-rules/`, `test/aria-practices/`, `test/node/`, locale + virtual-rules drivers

- **Task ID**: migrate-conformance-and-node
- **Depends On**: migrate-integration
- **Assigned To**: browser-test-migrator
- **Agent Type**: ts-builder
- **Parallel**: false
- Convert Mocha-driven `*.spec.js` files to Vitest. Keep external `wcag-act-rules` and `aria-practices` GitHub deps as-is.
- Convert `test/test-locales.js`, `test/test-virtual-rules.js`, `test/test-rule-help-version.js` to Vitest under `test/unit/`.
- Convert `test/node/node.js` and `test/node/jsdom.js` to Vitest, gated behind a `legacy-jsdom` tag with a `console.warn` (per PRD-00 §4.4 — JSDOM deprecated, removal in v5).
- **Sprint 4b carryover (2026-04-25):** delete the `test_node` matrix job from `.github/workflows/test.yml` once the migration above lands. Sprint 4b already trimmed the matrix from `[6, 18, 20, 22, 24]` to `[20, 22, 24]` to align with `engines: ">=20.0.0"` (commits trimmed Node 6 + 18 — EOL since 2019 and 2025). Once `test:node` runs under the Vitest `unit` project, the standalone matrix becomes redundant — the unit project on whatever Node version `.nvmrc` pins is enough; per-LTS coverage adds no signal because axe-core has no Node-version-specific code paths (the lib is browser-targeted; the Node path is JSDOM glue). Remove the entire `test_node:` job at this step.

### 13. Polyfill + jQuery purge

- **Task ID**: purge-polyfills-jquery
- **Depends On**: migrate-conformance-and-node
- **Assigned To**: polyfill-jquery-purger
- **Agent Type**: builder
- **Parallel**: false
- `grep -rn 'polyfill\|shim\|ponyfill' packages/axe-core/lib packages/axe-core/test` and evaluate each hit against PRD §2.4 table.
- Remove `Array.from`, `Array.prototype.includes`, `Object.assign`, `Element.prototype.closest`, `requestAnimationFrame`, etc. polyfills now safely covered by Baseline 2024.
- `grep -rn 'jquery\|jQuery\|\$(' packages/axe-core/test` — replace with native DOM in test code.
- Run full Vitest suite to confirm no regressions.

### 14. Wire Turborepo task graph

- **Task ID**: wire-turbo
- **Depends On**: purge-polyfills-jquery
- **Assigned To**: ci-and-turbo-wiring
- **Agent Type**: engineering-devops-automator
- **Parallel**: false
- Add `test`, `test:browser`, `test:integration`, `typecheck` to `turbo.json` with correct `dependsOn: ["^build"]`, `inputs` (`test/**`, `lib/**`, `vitest.*.ts`), and `outputs` for cache hits (`coverage/**`).
- Verify `pnpm turbo run test --filter=axe-core` and `pnpm turbo run test:browser --filter=axe-core` both work.

### 15. Replace CI workflow with 4-job parallel layout

- **Task ID**: replace-ci-workflow
- **Depends On**: wire-turbo
- **Assigned To**: ci-and-turbo-wiring
- **Agent Type**: engineering-devops-automator
- **Parallel**: false
- Replace `.github/workflows/test.yml` content with the layout from PRD §2.6: four jobs (`unit`, `browser`, `integration`, `typecheck`) running in parallel, each on Ubuntu, each using `pnpm/action-setup@v4` + `actions/setup-node@v4` with `node-version: 20` and `cache: 'pnpm'`.
- For the `browser` and `integration` jobs add `pnpm exec playwright install chromium firefox`.
- Enable Playwright trace artifact upload on failure (PRD open question 6.1).
- Remove the now-redundant `vitest-pilot` and Karma jobs.

### 16. Delete legacy infrastructure

- **Task ID**: delete-legacy
- **Depends On**: replace-ci-workflow
- **Assigned To**: dependency-cleanup
- **Agent Type**: builder
- **Parallel**: false
- Delete `packages/axe-core/test/karma.conf.js`, `test/get-webdriver.js`, `test/testutils.js`, and the original `test/{commons,core,checks,rule-matches,integration,act-rules,aria-practices,node}/**/*.js` source files (the new `.test.ts` versions live under `test/{unit,browser,integration}/`).
- Remove from `packages/axe-core/package.json` devDependencies: `karma`, `karma-chai`, `karma-chrome-launcher`, `karma-firefox-launcher`, `karma-ie-launcher`, `karma-mocha`, `karma-sinon`, `karma-spec-reporter`, `mocha`, `chai`, `sinon`, `http-server`, `jquery`, `start-server-and-test`, `selenium-webdriver`, `chromedriver`, `serve-handler`.
- Rewrite the `scripts` block: `test` → `vitest run --project unit`, `test:browser` → `vitest run --project browser`, `test:integration` → `vitest run --project integration`, drop the seven `test:unit:*` shards and the `integration:*` selenium scripts.
- Run `pnpm install` and commit lockfile.
- **Path B unblock (Sprint 4 carryover):** removing Karma also retires the UMD-bundle import in `test/browser/_helpers/check-helpers.ts` (`import '../../../dist/axe.js'`). After this task lands, replace that import with direct ESM imports of `setup`, `teardown`, `getFlattenedTree`, `getNodeFromTree`, `querySelectorAll` from `@core/...`. Then re-run `node /tmp/flip-checks.mjs` (with `/tmp/task4-files.txt` as the input) to flip the remaining 74 check tests from `getCheckEvaluate('id')` to `getCheckEvaluateESM(<evaluator>)`. The dual-instance issue resolves automatically: there is no longer a second module graph to diverge from. Drop the `getCheckEvaluate(id)` and `axe`/`checks` exports from check-helpers when the migration is complete.

### 17. Enable coverage thresholds

- **Task ID**: enable-coverage-thresholds
- **Depends On**: delete-legacy
- **Assigned To**: coverage-checker
- **Agent Type**: coverage-checker
- **Parallel**: false
- Confirm `vitest.config.ts` thresholds (lines 85, branches 80, functions 85, statements 85) are active.
- Run `pnpm test --coverage` locally; verify `lib/core/` meets ≥85% lines target.
- If a particular file falls below threshold, decide: write missing tests OR document an exception in `vitest.config.ts` `coverage.exclude`.

### 18. Performance benchmark + docs update

- **Task ID**: benchmark-and-docs
- **Depends On**: enable-coverage-thresholds
- **Assigned To**: dependency-cleanup
- **Agent Type**: builder
- **Parallel**: false
- Compare new Vitest wall-clock against the baseline captured in task 1; record in `specs/phase-03-results.md` (new file). Demand ≥50% reduction; if not met, investigate before claiming done.
- Update `packages/axe-core/CONTRIBUTING.md`: replace all Karma/Mocha references with Vitest commands; document `pnpm test`, `pnpm test:browser`, `pnpm test:integration`, `pnpm test --coverage`, `pnpm test --ui` workflows.
- Update root `README.md` if it references test commands.

### 19. Final regression validation

- **Task ID**: final-regression-validation
- **Depends On**: benchmark-and-docs
- **Assigned To**: regression-validator
- **Agent Type**: validator
- **Parallel**: false
- Run `pnpm validate` (build + test + lint + format + typecheck) and confirm all green.
- Compare test counts per directory against the baseline; any drop must be explained in `specs/phase-03-results.md`.
- Confirm `grep -rn 'karma\|mocha\|chai\|sinon\|jquery' packages/axe-core` returns nothing (allow for `CHANGELOG.md` historical mentions).

### 20. Final code review

- **Task ID**: final-code-review
- **Depends On**: final-regression-validation
- **Assigned To**: code-reviewer
- **Agent Type**: code-review
- **Parallel**: false
- Verify pattern compliance across migrated tests (consistent use of `expect`, no leftover `assert.*`, no leftover `sinon.*`).
- Verify per-test fixture isolation strategy — spot-check 5 random browser tests for shared-state hazards.
- Verify Playwright trace upload path actually fires on a deliberately failing test.
- Verify zero `karma-*` strings remain in `package.json`, lockfile, or CI.

### 21. Final validation

- **Task ID**: validate-all
- **Depends On**: final-code-review
- **Assigned To**: regression-validator
- **Agent Type**: validator
- **Parallel**: false
- Run all validation commands (see below).
- Verify acceptance criteria met.

## Acceptance Criteria

1. **Behavioural parity**: every test that passed under Karma/Mocha passes under Vitest; test counts per directory match the captured baseline (or any deltas are explained in `specs/phase-03-results.md`).
2. **Karma deletion**: `karma.conf.js` and all `karma-*` packages absent from `packages/axe-core/`.
3. **Mocha/Chai/Sinon deletion**: zero imports/requires of `mocha`, `chai`, `sinon` anywhere in the repo (excluding `CHANGELOG.md`).
4. **Polyfill purge**: every entry in PRD §2.4 table is verified — either removed or has a documented reason for staying.
5. **jQuery purge**: `jquery` removed from `devDependencies`; no `$(` or `jQuery` calls in test code.
6. **Browser coverage**: browser tests run in real Chromium and Firefox via Playwright on CI.
7. **Coverage thresholds enforced**: v8 thresholds 85/80/85/85 active and CI fails on regression; `lib/core/` baseline ≥85% lines.
8. **CI parallelism**: 4 parallel jobs (unit, browser, integration, typecheck) in `.github/workflows/test.yml`; Turborepo cache keys present in `turbo.json`.
9. **Performance**: total CI test wall-clock ≥50% faster than baseline (recorded with numbers in `specs/phase-03-results.md`).
10. **Color-contrast specifically validated**: PRD §6.2 risk closed with a passing computed-style test under Vitest Browser Mode + Playwright.
11. **Docs updated**: `packages/axe-core/CONTRIBUTING.md` reflects new commands; no stale Karma/Mocha references.
12. **Zero false-positive guarantee**: rule-level integration tests pass — confirmed by re-running the existing act-rules and aria-practices conformance suites under Vitest.

## Validation Commands

Execute these commands to validate the task is complete:

- `pnpm install --frozen-lockfile` — lockfile consistent.
- `pnpm --filter=axe-core build` — Vite build still succeeds (tests don't break the build pipeline).
- `pnpm --filter=axe-core test` — full Vitest unit suite green.
- `pnpm --filter=axe-core test:browser` — Playwright Chromium suite green.
- `pnpm --filter=axe-core test:integration` — Playwright Chromium + Firefox integration suite green.
- `pnpm --filter=axe-core test --coverage` — coverage thresholds met (no exit code from threshold failure).
- `pnpm typecheck` — TS strict still passes.
- `pnpm lint` — `oxlint` clean across migrated test files.
- `pnpm format` — `oxfmt --check` (advisory) and Prettier (gating) clean.
- `pnpm turbo run test --filter=axe-core` — Turbo cache works, second run hits cache.
- `grep -rn 'karma\|mocha\|chai\|sinon\|jquery' packages/axe-core --include='*.{ts,js,json}' | grep -v CHANGELOG | grep -v node_modules` — empty output.
- `grep -rn 'polyfill\|shim\|ponyfill' packages/axe-core/lib packages/axe-core/test` — only intentional matches remain (each one annotated in `specs/phase-03-results.md`).
- Manual: trigger a deliberate test failure and confirm Playwright trace lands as a CI artifact.

## Notes

- **Strangler-fig discipline**: do not delete Karma until Sprints 1–3 ship. The parallel-stack CI cost is real but small relative to the cost of an unnoticed regression.
- **Color-contrast risk**: PRD open question 6.2 is the single biggest technical unknown — validate it in **task 4** (pilot), not at the end of Sprint 3. If Vitest Browser Mode + Playwright cannot reproduce real computed styles to the precision color-contrast needs, escalate before doing the bulk migration.
- **Vitest 4.0.8 CI flake** (PRD §5.1): pin to a patched version, set `retry: 2` in CI, monitor `vitest-dev/vitest#9635`.
- **Parallelism vs. shared DOM**: enforce per-test fixture containers via `createFixture()` from the start. Do NOT lean on `test.sequential` as a global escape hatch — it negates Vitest's biggest win.
- **JSDOM deprecation**: per PRD-00 §4.4, JSDOM stays in v4 with a `console.warn`. Phase 3 keeps `test/node/jsdom.js` migrated under Vitest with the `legacy-jsdom` tag. Full removal happens in v5, not in this phase.
- **No new runtime libraries needed**: all additions are devDependencies. Use `pnpm add -D --filter=axe-core <pkg>` for installs.
- **Scope guard**: Phase 3 does NOT modify rule logic, build output, or public API. If something in `lib/` needs changing to make a test work, that's a flag — surface it before changing source.
