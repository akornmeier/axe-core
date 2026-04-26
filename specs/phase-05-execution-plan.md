# Plan: Phase 5 — Test Modernization Closure (Sprint 4b residue + Sprint 5)

## Task Description

Close out Phase 3 of the axe-core modernization by executing the work tracked in `specs/phase-05-remaining-work-brief.md`. This covers two parallel tracks:

1. **Sprint 4b residue** — two ts-morph codemods that mechanically clear ~72 of the remaining 148 `.test.ts.todo` files (testUtils destructure migration + module-scope fixture rewrite), plus a plan-doc outcomes update.
2. **Sprint 5** — the keystone deletion of legacy infrastructure (Karma, 17 devDeps, original `.js` test sources, the UMD-bundle import in `_helpers/check-helpers.ts`), the mechanical re-flip of the remaining 74 check tests to ESM-direct, the synthetic-audit helper for `axe._audit` tests, the `test_node` matrix CI cleanup, coverage-threshold enforcement, performance benchmarking, docs update, and the final regression / code-review / acceptance gates (plan tasks #16-A through #21).

After these tasks land, Phase 3 of the axe-core modernization (`PRD-03-test-infrastructure-modernization.md`) is complete: the engine runs exclusively on Vitest 4 + Playwright; Karma + Mocha + Chai + Sinon + jQuery + Selenium are gone from `packages/axe-core/`; coverage is enforced; CI wall-clock is ≥50% faster than the captured baseline.

This plan is **planning only**. Execution happens later via `/build` against this document.

## Objective

When this plan is complete:

1. `pnpm --filter axe-core test` runs the entire suite via Vitest with zero behavioural regressions vs. the captured pre-Sprint-5 baseline; `.test.ts.todo` count reaches near-zero (only `axe._audit` files awaiting Sprint 5b synthetic-audit work, plus PRD-04 §5.1 carryover skips).
2. `karma.conf.js`, all `karma-*` packages, `mocha`, `chai`, `sinon`, `http-server`, `jquery`, `start-server-and-test`, `selenium-webdriver`, `chromedriver`, `serve-handler` are absent from `packages/axe-core/package.json`.
3. The 74 check tests still on the UMD-hybrid path flip cleanly to `getCheckEvaluateESM` after the bundle is removed from `test/browser/_helpers/check-helpers.ts`.
4. v8 coverage thresholds (lines 85, branches 80, functions 85, statements 85) are active; `lib/core/` ≥85% lines.
5. `.github/workflows/test.yml` runs the four-job parallel layout (unit / browser / integration / typecheck); the standalone `test_node` matrix job is gone.
6. `specs/phase-03-results.md` documents ≥50% wall-clock reduction vs. the Karma baseline.
7. `CONTRIBUTING.md` reflects the new Vitest commands; root `README.md` references are clean.
8. Zero false-positive guarantee preserved — act-rules and aria-practices conformance suites pass under Vitest.

## Problem Statement

Phase 3 stalled at the strangler-fig boundary. Karma + the UMD bundle are still live in CI and in `_helpers/check-helpers.ts` because Sprint 4 discovered the dual-instance issue: the UMD bundle and the ESM project hold separate copies of `lib/core/base/cache.ts`, `lib/standards/*`, and `AbstractVirtualNode`. Cache mirroring alone could not bridge them. The architectural fix is bundle removal, not bridging.

Sprint 4 also surfaced 148 `.test.ts.todo` files whose dominant blockers are mechanically tractable: ~64 use `axe.testUtils.X` destructure (helpers already exposed under `@helpers/check-helpers`), ~8 do module-scope `fixture` lookup (need a `beforeEach` rewrite), ~14 hit `axe._audit` (need a synthetic audit helper). Two ts-morph codemods plus one helper module unlock most of them.

Sprint 5 is therefore three coordinated moves: ship the codemods (independent of bundle removal), delete the legacy infrastructure including the bundle, then mechanically re-flip the 74 deferred check tests now that the dual-instance issue has dissolved.

## Solution Approach

A **two-track sequence with a clean handoff:**

- **Track A (Sprint 4b residue):** Author both codemods in parallel; each mirrors the existing `migrate-chai-assert-to-vitest.ts` shape (ts-morph pass + `migrate-axe-tree-to-flat-tree-setup.ts`-style runner + revert-on-fail). Run them, rename `.test.ts.todo` → `.test.ts` for files that pass, leave failures stamped with refined FIXMEs.
- **Track B (Sprint 5):** Sequential. Deletion (#16-A) is the keystone — it removes Karma, the 17 dead devDeps, the original `.js` test sources, and rewrites `_helpers/check-helpers.ts` to drop the UMD bundle import in favor of direct ESM imports from `@core/public/setup`, `@core/public/teardown`, `@core/utils/{get-flattened-tree,get-node-from-tree,query-selector-all}`. The flip script (`/tmp/flip-checks.mjs` against `/tmp/task4-files.txt`) then runs idempotently against all 84 check tests; the 10 already on ESM-direct are no-ops for the regex. After flip, the synthetic-audit helper unlocks the remaining `axe._audit` files and the `test_node` matrix job is dropped from CI. Coverage thresholds, benchmark, docs, and validation close the phase.

**Track A is gated to land before Track B** in this plan to avoid merge conflicts in `test/browser/`. The codemods only touch `.test.ts.todo` files, but having them in tree before the deletion makes the pre/post regression diff cleaner and lowers risk on the keystone PR.

**Why this order and granularity:** keystone-first within Track B was rejected because Track A is genuinely independent and de-risks the keystone (fewer `.todo` files in the snapshot used to validate `_helpers/check-helpers.ts` rewrite). Track A first, Track B second, gives the cleanest before/after numbers and the smallest diff per PR.

## Relevant Files

### Source brief and adjacent specs

- `specs/phase-05-remaining-work-brief.md` — the consolidated tracker this plan executes against. Section references below assume this brief.
- `specs/phase-03-test-infrastructure-modernization-plan.md` — origin of tasks #16-A through #21 with exit criteria.
- `specs/phase-03-sprint-04b-followup-brief.md` — Sprint 4b codemod design notes (helper exports, FIXME stamps, runner shape).
- `specs/phase-03-baseline.md` — Karma/Mocha baseline for the §18 benchmark comparison.
- `specs/PRD-03-test-infrastructure-modernization.md` — acceptance criteria source of truth (§2.6 CI layout, §4 dep changes, §5.5 fixture isolation, §6 open questions).

### Track A — codemod authoring

- `packages/build-tools/src/codemods/migrate-chai-assert-to-vitest.ts` — mirror this shape for the testUtils codemod.
- `packages/build-tools/src/codemods/migrate-axe-tree-to-flat-tree-setup.ts` — mirror this shape for the fixture-lookup codemod.
- `packages/build-tools/src/codemods/__tests__/` — co-located unit tests (45 across the two existing codemods); add ≥10 unit tests per new codemod.
- `packages/build-tools/scripts/run-chai-assert-migration.mjs` — runner pattern (rename, run vitest, revert on fail, refined FIXME).
- `packages/axe-core/test/browser/_helpers/check-helpers.ts` — exports the helpers the testUtils codemod imports from. **Do not modify in Track A.**
- `packages/axe-core/test/browser/{commons,core,rule-matches,checks}/**/*.test.ts.todo` — input set (148 files; bucket counts in the brief §3).
- `scripts/migrate-todo-tests.mjs` — has the existing module-scope fixture rewrite; extract for the fixture codemod.

### New files (Track A)

- `packages/build-tools/src/codemods/migrate-test-utils-destructure.ts` — Sprint 4b #1 codemod.
- `packages/build-tools/scripts/run-test-utils-migration.mjs` — Sprint 4b #1 runner.
- `packages/build-tools/src/codemods/migrate-module-scope-fixture.ts` — Sprint 4b #2 codemod.
- `packages/build-tools/scripts/run-fixture-lookup-migration.mjs` — Sprint 4b #2 runner.

### Track B — Sprint 5 deletion + flip + closure

- `packages/axe-core/package.json` — devDependencies pruned by 17; `scripts` block rewritten (`test`, `test:browser`, `test:integration`).
- `packages/axe-core/test/karma.conf.js` — delete.
- `packages/axe-core/test/get-webdriver.js` — delete.
- `packages/axe-core/test/testutils.js` — delete.
- `packages/axe-core/test/{commons,core,checks,rule-matches,integration,act-rules,aria-practices,node}/**/*.js` — delete (all original Mocha sources; replacement `.test.ts` versions live under `test/{unit,browser,integration}/`).
- `packages/axe-core/test/browser/_helpers/check-helpers.ts` — drop UMD bundle import + `getCheckEvaluate(id)` + `axe`/`checks` re-exports; replace with direct ESM imports from `@core/public/setup`, `@core/public/teardown`, `@core/utils/get-flattened-tree`, `@core/utils/get-node-from-tree`, `@core/utils/query-selector-all`. Initialize `globalThis.axe ??= {}` so `lib/core/public/*`'s `declare const axe` writes have a target.
- `packages/axe-core/vitest.config.ts` — confirm coverage thresholds active (already authored in Sprint 1).
- `packages/axe-core/CONTRIBUTING.md` — update test commands.
- `packages/axe-core/README.md` and root `README.md` — update test commands if referenced.
- `.github/workflows/test.yml` — drop `test_node` matrix job; verify 4-job layout.
- `pnpm-lock.yaml` — regenerated after dep removal.

### New files (Track B)

- `packages/axe-core/test/browser/_helpers/synthetic-audit.ts` — minimal audit-shaped object assembled from `lib/core/base/metadata-function-map.ts` + per-check JSON. Replaces `axe._audit` access in ~14 test files.
- `specs/phase-05-baseline.md` — pre-Sprint-5 snapshot (Vitest counts, Karma green status, deps list, `.test.ts.todo` count) for diff comparison after.
- `specs/phase-03-results.md` — wall-clock comparison vs. `phase-03-baseline.md`; documents any per-directory test-count deltas; per-file coverage exceptions if any.

### Reference (read-only, no changes)

- `lib/core/utils/memoize.ts`, `lib/core/utils/valid-langs.ts`, `lib/core/utils/uuid.ts` — PRD-01 §4.1 closures (already shipped in `031008eb`); confirm no regressions.
- `/tmp/flip-checks.mjs`, `/tmp/task4-files.txt`, `/tmp/task4-clean-files.txt`, `/tmp/task4-ids-resolved.txt` — preserved at this writing; if missing at execution time, reconstruct from the Sprint 4 commit `59545ca7` diff before running #16-B.

## Implementation Phases

### Phase 1: Foundation — baseline + Track A codemods

Capture the pre-Sprint-5 baseline (Vitest pass counts, Karma green status, deps snapshot, `.test.ts.todo` count). Author Sprint 4b #1 (testUtils destructure → named imports) and Sprint 4b #2 (module-scope fixture → `beforeEach`) codemods in parallel. Each codemod ships as: ts-morph (or regex) pass + co-located unit tests (≥10 per codemod) + thin CLI runner that strips the FIXME, applies the rewrite, renames `.test.ts.todo` → `.test.ts`, runs Vitest on the file, and reverts with a refined FIXME on failure. Update the Phase 3 plan with realized 4b outcomes.

Exit criteria: 70+ `.test.ts.todo` files flipped to passing `.test.ts`; Karma stack still green; codemod unit tests pass; build-tools typecheck clean.

### Phase 2: Core Implementation — Sprint 5 keystone + flip + helpers

Execute #16-A: delete `karma.conf.js`, `get-webdriver.js`, `testutils.js`, all original `.js` test sources, and the 17 listed devDependencies. Rewrite `package.json` scripts. Rewrite `_helpers/check-helpers.ts` to drop the UMD bundle import and use direct ESM imports. Regenerate the lockfile. Confirm Vitest is the sole test runner.

Execute #16-B: re-run `/tmp/flip-checks.mjs` against `/tmp/task4-files.txt` (full 84-file list). The 10 already-flipped files are idempotent for the regex; the remaining 74 flip mechanically because the dual-instance issue has dissolved.

Execute #16-C: build `test/browser/_helpers/synthetic-audit.ts`; rewrite the ~14 `.test.ts.todo` files that hit `axe._audit` to import from there. Could be deferred to Sprint 5b if time-pressured.

Execute #16-D in parallel with #16-B/#16-C: drop the `test_node` matrix job from `.github/workflows/test.yml`. Matrix is already at `[20, 22, 24]`; the standalone job adds no signal because axe-core has no Node-version-specific code paths.

Exit criteria: zero `karma|mocha|chai|sinon|jquery` strings outside `CHANGELOG.md`; all 84 check tests on ESM-direct path; `.test.ts.todo` count below 10 (PRD-04 §5.1 carryovers + manual-fixup residue only); CI test workflow has 4 parallel jobs, no `test_node`.

### Phase 3: Integration & Polish — coverage, benchmark, validation

Execute #17: enable v8 coverage thresholds in `vitest.config.ts` (already authored — verify active); run `pnpm test --coverage`; confirm `lib/core/` ≥85% lines. For sub-threshold files, write missing tests OR document an explicit `coverage.exclude` exception with rationale.

Execute #18: compare new Vitest wall-clock to the baseline in `specs/phase-03-baseline.md`. Demand ≥50% reduction. Record numbers, per-directory test-count deltas, and any threshold exclusions in new `specs/phase-03-results.md`. Update `packages/axe-core/CONTRIBUTING.md` (Karma/Mocha → Vitest commands: `pnpm test`, `pnpm test:browser`, `pnpm test:integration`, `pnpm test --coverage`, `pnpm test --ui`). Update root `README.md` if it references test commands.

Execute #19: full regression validation. `pnpm validate` clean; per-directory test counts compared against baseline; any drops explained in results doc.

Execute #20: final code review — pattern compliance (consistent `expect`, no `assert.*`, no `sinon.*`); fixture-isolation spot-checks across 5 random browser tests; deliberate failing-test smoke to confirm Playwright trace upload; zero `karma-*` strings in package.json/lockfile/CI.

Execute #21: full acceptance against the 12 criteria in `phase-03-test-infrastructure-modernization-plan.md` §`Acceptance Criteria`.

Exit criteria: every acceptance criterion met; results doc complete with numbers; CI green on the merge target.

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

- Validator
  - Name: regression-validator
  - Role: Capture the pre-Sprint-5 baseline, run the post-deletion regression diff (#19), and the final acceptance gate (#21). Owns `specs/phase-05-baseline.md` and contributions to `specs/phase-03-results.md`. Read-only; never edits source.
  - Agent Type: validator
  - Resume: true
- Builder
  - Name: codemod-testutils-builder
  - Role: Author Sprint 4b #1 — `axe.testUtils.X` destructure → `@helpers/check-helpers` named imports codemod, unit tests, and CLI runner. Run against ~64 affected `.test.ts.todo` files; rename successes; revert failures with refined FIXMEs.
  - Agent Type: ts-builder
  - Resume: false
- Builder
  - Name: codemod-fixture-builder
  - Role: Author Sprint 4b #2 — module-scope `fixture` lookup → per-test `beforeEach` codemod, unit tests, and CLI runner. Run against ~8 affected `.test.ts.todo` files; same rename-success / revert-failure pipeline.
  - Agent Type: ts-builder
  - Resume: false
- Builder
  - Name: plan-doc-updater
  - Role: Append a "Sprint 4b — Realized Outcomes" subsection to `specs/phase-03-test-infrastructure-modernization-plan.md` recording final pass counts, codemod paths, and residual `.todo` blocker bucket sizes after Track A.
  - Agent Type: builder
  - Resume: false
- Builder
  - Name: legacy-deletion-builder
  - Role: Execute #16-A — delete Karma + 17 devDeps + original `.js` test sources; rewrite `package.json` scripts; rewrite `_helpers/check-helpers.ts` (drop UMD bundle, use ESM-direct imports, init `globalThis.axe ??= {}`); regenerate `pnpm-lock.yaml`. Single keystone PR.
  - Agent Type: builder
  - Resume: false
- Builder
  - Name: check-test-flipper
  - Role: Execute #16-B — re-run `/tmp/flip-checks.mjs` against `/tmp/task4-files.txt`; verify all 84 check tests pass under Vitest after flip; reconstruct the script from commit `59545ca7` if `/tmp/` artifacts are missing at execution time.
  - Agent Type: builder
  - Resume: false
- Builder
  - Name: synthetic-audit-builder
  - Role: Execute #16-C — build `test/browser/_helpers/synthetic-audit.ts` (assembled from `lib/core/base/metadata-function-map.ts` + per-check JSON); rewrite the ~14 `axe._audit` `.test.ts.todo` files to import from it.
  - Agent Type: ts-builder
  - Resume: false
- DevOps
  - Name: ci-workflow-engineer
  - Role: Execute #16-D — drop the `test_node` matrix job from `.github/workflows/test.yml`; verify the 4-job parallel layout (unit / browser / integration / typecheck) is intact; confirm Playwright cache key still references root `pnpm-lock.yaml`.
  - Agent Type: engineering-devops-automator
  - Resume: false
- Validator
  - Name: coverage-validator
  - Role: Execute #17 — confirm `vitest.config.ts` thresholds (lines 85, branches 80, functions 85, statements 85) active; run coverage; verify `lib/core/` ≥85% lines; document any per-file exclusions with rationale.
  - Agent Type: coverage-checker
  - Resume: false
- Builder
  - Name: benchmark-and-docs-writer
  - Role: Execute #18 — wall-clock comparison vs. `phase-03-baseline.md`; write `specs/phase-03-results.md`; update `CONTRIBUTING.md` and root `README.md` with Vitest commands.
  - Agent Type: builder
  - Resume: false
- Reviewer
  - Name: final-code-reviewer
  - Role: Execute #20 — pattern compliance, fixture-isolation spot-checks, Playwright trace upload smoke, grep-for-zero on legacy strings.
  - Agent Type: code-review
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Capture pre-Sprint-5 baseline

- **Task ID**: capture-phase-05-baseline
- **Depends On**: none
- **Assigned To**: regression-validator
- **Agent Type**: validator
- **Parallel**: false
- Run `pnpm --filter axe-core run test:vitest` and capture: total file count, passed / skipped / todo counts (Vitest output line).
- Run `find packages/axe-core/test -name "*.test.ts.todo" | wc -l` and capture the count by directory (commons / core / rule-matches / checks).
- Run `pnpm --filter axe-core run test:tsc` — capture clean / dirty.
- Run `cd packages/axe-core && pnpm run test:unit -- --browsers=ChromeHeadless --single-run` — capture Karma green status.
- Run `pnpm --filter axe-core list --depth=0 > specs/phase-05-deps-before.txt` — dependency snapshot for the post-#16-A diff.
- Write `specs/phase-05-baseline.md` with all of the above plus the `b9da71e2` merge SHA + current branch HEAD SHA.

### 2. Build Sprint 4b #1 — testUtils destructure codemod

- **Task ID**: codemod-testutils-destructure
- **Depends On**: capture-phase-05-baseline
- **Assigned To**: codemod-testutils-builder
- **Agent Type**: ts-builder
- **Parallel**: true (alongside codemod-fixture-lookup)
- Build `packages/build-tools/src/codemods/migrate-test-utils-destructure.ts`. Mirror `migrate-chai-assert-to-vitest.ts` (ts-morph pass).
- Handle two patterns: `const { X, Y } = axe.testUtils;` → `import { X, Y } from '@helpers/check-helpers';` AND bare `axe.testUtils.X(...)` → `X(...)` after adding the import.
- Add ≥10 unit tests under `packages/build-tools/src/codemods/__tests__/migrate-test-utils-destructure.test.ts` covering: clean destructure, mixed destructure (some helpers exposed, some not — must skip the file), bare access, multiple imports needed, idempotency.
- Build the runner `packages/build-tools/scripts/run-test-utils-migration.mjs`. Mirror `run-chai-assert-migration.mjs`. Pipeline: identify file set via `grep -rln "FIXME(phase-3-sprint-4b): codemod blocker — unresolved axe.testUtils\\|testUtils helper not exposed\\|destructures.*from axe.testUtils\\|unresolved bare \`axe\` reference" test/browser/`, strip FIXME header, run codemod, rename `.test.ts.todo` → `.test.ts`, run `pnpm test:vitest <file>`, revert on fail with refined FIXME (`unsupported helper: <name>` or `post-codemod failure`).
- Files using `captureError`, `html`, `assertStylesheet`, `injectIntoFixture`, `addStyleSheet`/`removeStyleSheet`, `isIE11` MUST be skipped — refined FIXME `helper not exposed (will not be re-exposed)`. They stay `.test.ts.todo`.
- Verification: `pnpm --filter @axe-core/build-tools test` ≥45 + new tests passing; expected ~50–60 files flipped.

### 3. Build Sprint 4b #2 — module-scope fixture codemod

- **Task ID**: codemod-fixture-lookup
- **Depends On**: capture-phase-05-baseline
- **Assigned To**: codemod-fixture-builder
- **Agent Type**: ts-builder
- **Parallel**: true (alongside codemod-testutils-destructure)
- Build `packages/build-tools/src/codemods/migrate-module-scope-fixture.ts`. Reference `scripts/migrate-todo-tests.mjs` for the existing rewrite logic; extract and adapt to ts-morph.
- Pattern: `describe('foo', () => { const fixture = document.querySelector('#fixture'); it(...) })` → introduce `let fixture: HTMLElement;` + `beforeEach(() => { fixture = document.getElementById('fixture') as HTMLElement })`.
- Add ≥10 unit tests under `packages/build-tools/src/codemods/__tests__/migrate-module-scope-fixture.test.ts` covering: top-level lookup, nested describes, multiple fixture references, idempotency, no-op when no `#fixture` lookup.
- Build the runner `packages/build-tools/scripts/run-fixture-lookup-migration.mjs`. Same revert-on-fail pattern as Task 2. Identify file set via `grep -rln "FIXME(phase-3-sprint-4b): codemod blocker — fixture lookup at module top level" test/browser/`.
- Verification: `pnpm --filter @axe-core/build-tools test` passing; expected ~6–8 files flipped (8 files stamped, some may have other co-blockers and stay `.todo`).

### 4. Update plan with Sprint 4b realized outcomes

- **Task ID**: update-plan-4b-outcomes
- **Depends On**: codemod-testutils-destructure, codemod-fixture-lookup
- **Assigned To**: plan-doc-updater
- **Agent Type**: builder
- **Parallel**: false
- Append a "Sprint 4b — Realized Outcomes" subsection to `specs/phase-03-test-infrastructure-modernization-plan.md` after the existing "Sprint 4 — Realized Outcomes" section.
- Record: final Vitest pass / skipped / todo counts, the two new codemod paths (`migrate-test-utils-destructure.ts`, `migrate-module-scope-fixture.ts`), the residual `.test.ts.todo` count by blocker bucket (re-run the same `grep -rh "FIXME(phase-3-sprint-4b)" | sort | uniq -c` from the brief).
- No code changes in this task.

### 5. Delete legacy infrastructure (#16-A keystone)

- **Task ID**: delete-legacy-infra
- **Depends On**: update-plan-4b-outcomes
- **Assigned To**: legacy-deletion-builder
- **Agent Type**: builder
- **Parallel**: false
- Delete `packages/axe-core/test/karma.conf.js`, `test/get-webdriver.js`, `test/testutils.js`.
- Delete original `test/{commons,core,checks,rule-matches,integration,act-rules,aria-practices,node}/**/*.js` source files (the new `.test.ts` versions live under `test/{unit,browser,integration}/`). Use `git ls-files` to enumerate; do not delete `_helpers/` or `mock/` or `assets/` or fixture HTML.
- Remove from `packages/axe-core/package.json` devDependencies: `karma`, `karma-chai`, `karma-chrome-launcher`, `karma-firefox-launcher`, `karma-ie-launcher`, `karma-mocha`, `karma-sinon`, `karma-spec-reporter`, `mocha`, `chai`, `sinon`, `http-server`, `jquery`, `start-server-and-test`, `selenium-webdriver`, `chromedriver`, `serve-handler`.
- Rewrite `package.json` `scripts` block: `test` → `vitest run --project unit`, `test:browser` → `vitest run --project browser`, `test:integration` → `vitest run --project integration`. Drop the seven `test:unit:*` shards and `integration:*` selenium scripts. Keep `test:tsc`, `test:vitest`, `eslint`, `fmt:check`, `build`, `build:locales` etc.
- Rewrite `packages/axe-core/test/browser/_helpers/check-helpers.ts`:
  - Delete `import '../../../dist/axe.js'`.
  - Delete `getCheckEvaluate(checkId)` and the `axe`, `checks` re-exports.
  - Add `import { setup } from '@core/public/setup'`, `import { teardown } from '@core/public/teardown'`, and the three `@core/utils/*` imports listed in the brief §2.16-A.
  - Add `globalThis.axe ??= {}` at module top so `lib/core/public/*`'s `declare const axe` writes have a target.
  - Update the module-header JSDoc to reflect ESM-direct status.
- Run `pnpm install` from repo root; commit `pnpm-lock.yaml`.
- Verification: `pnpm --filter axe-core run test:tsc` clean; `pnpm --filter axe-core run test:vitest` passes (74 check tests will be `.test.ts.todo` or failing here — that's expected; #16-B is the immediate fix); `pnpm validate` excluding the failing check-test files; `grep -rn 'karma\\|mocha\\|chai\\|sinon\\|jquery' packages/axe-core --include='*.{ts,js,json}' | grep -v CHANGELOG | grep -v node_modules` returns empty.

### 6. Flip remaining 74 check tests to ESM-direct (#16-B)

- **Task ID**: flip-check-tests-esm
- **Depends On**: delete-legacy-infra
- **Assigned To**: check-test-flipper
- **Agent Type**: builder
- **Parallel**: true (alongside drop-test-node-matrix)
- Verify `/tmp/flip-checks.mjs`, `/tmp/task4-files.txt`, `/tmp/task4-clean-files.txt`, `/tmp/task4-ids-resolved.txt` are present. If missing, reconstruct from the diff in commit `59545ca7` (the original Sprint 4 ESM-flip commit) before running.
- Run from `packages/axe-core/`:
  ```bash
  cp /tmp/task4-files.txt /tmp/task4-clean-files.txt
  node /tmp/flip-checks.mjs
  pnpm run test:vitest test/browser/checks/
  ```
- Confirm all 84 check tests (10 already-flipped + 74 newly flipped) pass under Vitest. The 10 already on ESM-direct are no-ops for the regex.
- For any check test that fails post-flip: leave a `// FIXME(phase-05-sprint-5)` comment naming the residual blocker; expected count is near-zero post-bundle-removal.
- Verification: `pnpm --filter axe-core run test:vitest test/browser/checks/` green; `grep -rn "getCheckEvaluate('" test/browser/checks/` returns empty (only `getCheckEvaluateESM` should remain).

### 7. Drop test_node matrix from CI workflow (#16-D)

- **Task ID**: drop-test-node-matrix
- **Depends On**: delete-legacy-infra
- **Assigned To**: ci-workflow-engineer
- **Agent Type**: engineering-devops-automator
- **Parallel**: true (alongside flip-check-tests-esm)
- Edit `.github/workflows/test.yml`. Remove the entire `test_node:` job (matrix already trimmed to `[20, 22, 24]` per commit `62f4baaf`). The Vitest `unit` project subsumes the per-LTS coverage; axe-core has no Node-version-specific code paths (the lib is browser-targeted; the Node path is JSDOM glue).
- Verify the 4-job parallel layout from PRD-03 §2.6 is intact: `unit`, `browser`, `integration`, `typecheck`. If `vitest_pilot` still exists as a transitional name, rename to `unit` / `browser` per the PRD.
- Verify Playwright cache key references **root** `pnpm-lock.yaml` (not the package one). Cache-hit branch must still run `playwright install-deps` for system libs.
- Verification: trigger a workflow dry-run (`gh workflow run` is fine, or push a no-op commit) and confirm the test job graph matches expectation; `gh run list --workflow=test.yml --limit 1` shows green.

### 8. Build synthetic-audit helper for axe._audit tests (#16-C)

- **Task ID**: build-synthetic-audit
- **Depends On**: flip-check-tests-esm
- **Assigned To**: synthetic-audit-builder
- **Agent Type**: ts-builder
- **Parallel**: true (alongside enable-coverage-thresholds)
- Build `packages/axe-core/test/browser/_helpers/synthetic-audit.ts`. Export `createSyntheticAudit(checkIds: string[]): SyntheticAudit` that takes an array of check IDs and assembles a minimal audit-shaped object using `lib/core/base/metadata-function-map.ts` for evaluators and the per-check JSON files for metadata/options.
- Identify the affected files: `grep -rln "FIXME(phase-3-sprint-4b): codemod blocker — uses axe._audit" test/browser/` (~14 files).
- For each file: replace `axe._audit.checks[id]` and `axe._audit.rules[id]` accesses with `createSyntheticAudit([...]).checks[id]` style calls; rename `.test.ts.todo` → `.test.ts`; run Vitest; revert with refined FIXME on persistent failure (`requires full audit registry — defer`).
- Files that need cross-rule helpers like `heading-order-after` may not migrate cleanly — leave those `.todo` for Sprint 5b and document in the results doc.
- Verification: `pnpm --filter axe-core run test:vitest test/browser/` green; expected ~12 of 14 files flipped.

### 9. Enable coverage thresholds (#17)

- **Task ID**: enable-coverage-thresholds
- **Depends On**: flip-check-tests-esm
- **Assigned To**: coverage-validator
- **Agent Type**: coverage-checker
- **Parallel**: true (alongside build-synthetic-audit)
- Confirm `packages/axe-core/vitest.config.ts` has thresholds active: `coverage.thresholds.lines: 85`, `branches: 80`, `functions: 85`, `statements: 85`. Update if missing.
- Run `pnpm --filter axe-core run test:vitest --coverage` and capture `lib/core/` line coverage.
- If any file falls below threshold:
  - Prefer writing tests if the gap is small and the file is simple.
  - Otherwise add an explicit `coverage.exclude` entry in `vitest.config.ts` with a `// reason: …` comment.
- Capture the final coverage numbers (overall + `lib/core/` slice) for inclusion in `specs/phase-03-results.md` (next task).
- Verification: `pnpm --filter axe-core run test:vitest --coverage` exits 0 (no threshold-failure exit code).

### 10. Performance benchmark + docs update (#18)

- **Task ID**: benchmark-and-docs
- **Depends On**: enable-coverage-thresholds, build-synthetic-audit, drop-test-node-matrix
- **Assigned To**: benchmark-and-docs-writer
- **Agent Type**: builder
- **Parallel**: false
- Run `time pnpm --filter axe-core run test` three times; record median wall-clock. Compare to the Karma baseline in `specs/phase-03-baseline.md`. Demand ≥50% reduction.
- If <50% reduction: investigate (Vitest worker count, Playwright pool size, `vitest run` vs `vitest --pool=threads`) and re-run before claiming done.
- Write `specs/phase-03-results.md` with: wall-clock comparison table, per-directory test-count deltas vs. baseline, coverage exclusions and rationale (from #17), per-file failures still on `.test.ts.todo` and why, link back to this plan.
- Update `packages/axe-core/CONTRIBUTING.md`: replace Karma/Mocha references with `pnpm test`, `pnpm test:browser`, `pnpm test:integration`, `pnpm test --coverage`, `pnpm test --ui`. Update the "Running tests locally" section.
- Update root `README.md` and `packages/axe-core/README.md` if they reference test commands.
- Verification: `grep -rn 'karma\\|mocha test\\|grunt test' packages/axe-core/CONTRIBUTING.md README.md packages/axe-core/README.md` returns empty (allow CHANGELOG mentions).

### 11. Final regression validation (#19)

- **Task ID**: final-regression-validation
- **Depends On**: benchmark-and-docs
- **Assigned To**: regression-validator
- **Agent Type**: validator
- **Parallel**: false
- Run `pnpm validate` from repo root — expect green (typecheck + lint + format + test).
- Run `pnpm --filter axe-core run test:vitest` and compare per-directory test counts against `specs/phase-05-baseline.md`. Any drop must be explained in `specs/phase-03-results.md`.
- Run `grep -rn 'karma\\|mocha\\|chai\\|sinon\\|jquery' packages/axe-core --include='*.{ts,js,json}' | grep -v CHANGELOG | grep -v node_modules` — must be empty.
- Run `grep -rn 'polyfill\\|shim\\|ponyfill' packages/axe-core/lib packages/axe-core/test` — only intentional matches remain (each annotated in results doc per PRD §2.4).
- Run the `.test.ts.todo` count: `find packages/axe-core/test -name "*.test.ts.todo" | wc -l` — should be ≤ ~5 (PRD-04 §5.1 carryovers + manual residue only).
- Verification: every command above clean; results doc updated with any deltas.

### 12. Final code review (#20)

- **Task ID**: final-code-review
- **Depends On**: final-regression-validation
- **Assigned To**: final-code-reviewer
- **Agent Type**: code-review
- **Parallel**: false
- Verify pattern compliance across migrated tests: consistent use of `expect`, no leftover `assert.*`, no leftover `sinon.*`, no leftover `chai` imports.
- Spot-check 5 random browser tests under `test/browser/` for shared-state hazards — confirm per-test fixture container is used (no shared `<div id="fixture">`).
- Trigger a deliberate test failure (commit a `expect(true).toBe(false)` in a feature branch) and confirm Playwright trace lands as a CI artifact. Revert immediately.
- Confirm zero `karma-*` strings in `packages/axe-core/package.json`, `pnpm-lock.yaml`, `.github/workflows/test.yml`.
- Confirm `_helpers/check-helpers.ts` no longer imports from `../../../dist/`.
- Verification: review report posted with go / no-go decision; any blockers fed back to the appropriate builder.

### 13. Final acceptance validation (#21)

- **Task ID**: validate-all
- **Depends On**: final-code-review
- **Assigned To**: regression-validator
- **Agent Type**: validator
- **Parallel**: false
- Run all commands listed in `phase-03-test-infrastructure-modernization-plan.md` §`Validation Commands`.
- Verify each of the 12 acceptance criteria in that plan's §`Acceptance Criteria` is met with evidence from `specs/phase-03-results.md`.
- Append a "Phase 3 closed" entry to `specs/phase-03-results.md` with the final commit SHA and a one-line summary.

## Acceptance Criteria

These are the 12 criteria from `phase-03-test-infrastructure-modernization-plan.md` §`Acceptance Criteria`, restated here as the gate for this plan:

1. **Behavioural parity** — every test that passed under Karma/Mocha passes under Vitest; per-directory test counts match the baseline (or any deltas are explained in `specs/phase-03-results.md`).
2. **Karma deletion** — `karma.conf.js` and all `karma-*` packages absent from `packages/axe-core/`.
3. **Mocha/Chai/Sinon deletion** — zero imports/requires of `mocha`, `chai`, `sinon` anywhere in the repo (excluding `CHANGELOG.md`).
4. **Polyfill purge** — every entry in PRD §2.4 table is verified — either removed or has a documented reason for staying.
5. **jQuery purge** — `jquery` removed from `devDependencies`; no `$(` or `jQuery` calls in test code.
6. **Browser coverage** — browser tests run in real Chromium and Firefox via Playwright on CI.
7. **Coverage thresholds enforced** — v8 thresholds 85/80/85/85 active and CI fails on regression; `lib/core/` baseline ≥85% lines.
8. **CI parallelism** — 4 parallel jobs (unit, browser, integration, typecheck) in `.github/workflows/test.yml`; `test_node` matrix job removed; Turborepo cache keys present in `turbo.json`.
9. **Performance** — total CI test wall-clock ≥50% faster than baseline (recorded with numbers in `specs/phase-03-results.md`).
10. **Color-contrast specifically validated** — PRD §6.2 risk closed with a passing computed-style test under Vitest Browser Mode + Playwright.
11. **Docs updated** — `packages/axe-core/CONTRIBUTING.md` reflects new commands; no stale Karma/Mocha references.
12. **Zero false-positive guarantee** — rule-level integration tests pass — confirmed by re-running act-rules and aria-practices conformance suites under Vitest.

Plus this-plan-specific:

13. **`.test.ts.todo` count near zero** — only PRD-04 §5.1 color-algebra carryovers and any documented Sprint 5b deferrals remain.
14. **All 84 check tests on ESM-direct path** — `grep -rn "getCheckEvaluate('" test/browser/checks/` returns empty.

## Validation Commands

Execute these commands to validate the task is complete:

- `pnpm install --frozen-lockfile` — lockfile consistent post-deletion.
- `pnpm --filter axe-core run build` — Vite build still succeeds (tests don't break the build pipeline).
- `pnpm --filter axe-core run test` — full Vitest unit suite green.
- `pnpm --filter axe-core run test:browser` — Playwright Chromium suite green.
- `pnpm --filter axe-core run test:integration` — Playwright Chromium + Firefox integration suite green.
- `pnpm --filter axe-core run test --coverage` — coverage thresholds met (no exit code from threshold failure).
- `pnpm typecheck` — TS strict still passes.
- `pnpm lint` — `oxlint` clean across migrated test files.
- `pnpm format:check` — Prettier (gating) clean; `oxfmt --check` advisory.
- `pnpm turbo run test --filter=axe-core` — Turbo cache works, second run hits cache.
- `pnpm --filter @axe-core/build-tools test` — codemod unit tests passing (existing 45 + new ≥20 from Track A).
- `grep -rn 'karma\|mocha\|chai\|sinon\|jquery' packages/axe-core --include='*.{ts,js,json}' | grep -v CHANGELOG | grep -v node_modules` — empty output.
- `grep -rn 'polyfill\|shim\|ponyfill' packages/axe-core/lib packages/axe-core/test` — only intentional matches remain (annotated in `specs/phase-03-results.md`).
- `find packages/axe-core/test -name "*.test.ts.todo" | wc -l` — ≤ ~5.
- `grep -rn "getCheckEvaluate('" packages/axe-core/test/browser/checks/` — empty (all on `getCheckEvaluateESM`).
- Manual: trigger a deliberate test failure in CI and confirm the Playwright trace lands as an artifact.

## Notes

- **Branch:** `chore/modernize-phase-5`. PR target: `develop`. Each task may ship as one or several commits; PR boundaries are at the executor's discretion based on review burden, but Track A's two codemods are good single-PR candidates and #16-A is the natural keystone PR.
- **Karma stays green until #16-A.** Track A (Sprint 4b residue) must keep the Karma stack green; the deletion happens only at task #5.
- **Phase 3 scope guard remains in force during Track A** — no edits under `lib/checks/`, `lib/rules/`, `lib/commons/`, `lib/standards/`. The `feedback_flag_better_approaches` memory still applies: surface modernization opportunities, let the user decide. Sprint 4 already opened the door for `lib/core/utils/` surgical fixes (memoize, valid-langs, uuid), but those are closed; no further `lib/` work in this plan.
- **No abstraction shims.** Each codemod = one ts-morph (or regex) pass + a thin runner. Mirror `migrate-chai-assert-to-vitest.ts` shape. Same applies to the synthetic-audit helper — a function that builds a plain object from existing data, not a `MockAuditFactory` class.
- **`/tmp/` artifacts.** `flip-checks.mjs` + the three `task4-*` files are present at this writing. They are ephemeral. If missing at execution time of task #6, reconstruct from commit `59545ca7` before running.
- **Performance contingency.** If task #10's wall-clock comparison shows <50% reduction, investigate Vitest worker pool / Playwright concurrency before claiming done. Acceptable mitigations include: increasing `vitest run --pool=threads` thread count, adjusting Playwright `workers` setting, or splitting the `browser` project into Chromium-only vs. cross-browser shards. Do not relax the ≥50% target without explicit user approval.
- **Coverage exclusions.** Document each `coverage.exclude` entry in `vitest.config.ts` with a `// reason: …` comment AND an entry in `specs/phase-03-results.md`. Acceptable reasons: build-time-generated files (`default-config.ts`), platform shims that only run in JSDOM, dead-code paths kept for backward compat with PRD-00 §4.4.
- **PRD-04 §5.1 carryovers stay deferred.** The flatten-colors NaN regression in `lib/commons/color/{flatten-colors,stacking-context}.ts` is Phase 4's problem. Tests asserting against the broken state with `// FIXME(phase-04)` markers should remain unchanged in this plan; the 13 `it.skip` in `link-in-text-block.test.ts` stay skipped. Surface them in `specs/phase-03-results.md` as known carryovers.
- **No new runtime libraries.** All additions are devDependencies (none expected in this plan; the codemods reuse existing `ts-morph`). Use `pnpm add -D --filter=axe-core <pkg>` if a new dev dep is needed.
- **Zero false-positive guarantee** is non-negotiable. The act-rules + aria-practices conformance suites under Vitest are the integration-level proof; tasks #11 and #13 must run them.
