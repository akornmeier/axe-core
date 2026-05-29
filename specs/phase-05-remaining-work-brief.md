# Phase 3 → Phase 4 — Remaining Work Tracker

**Purpose:** Single source of truth for what is still open after Phase 3 PR #4 merged. Supersedes the running list across `phase-03-sprint-03-brief.md`, `phase-03-sprint-04-prd-01-carryover-brief.md`, and `phase-03-sprint-04b-followup-brief.md` — those remain as historical handoffs; new work tracks against this doc.

**Authored:** 2026-04-25, branch `chore/modernize-phase-5`. After commit `b9da71e2` (PR #4 merge).

---

## 1. State snapshot

- **Phase 0 (monorepo):** complete
- **Phase 1 (TS strict + Zod, PRD-01 §4.1 carryovers):** complete (`031008eb` closed memoize / valid-langs / uuid)
- **Phase 2 (Vite + Rolldown):** complete
- **Phase 3 (Vitest + Playwright):** **complete** — Sprint 5c landed 2026-04-27. See `specs/phase-05-sprint-5c-results.md`.
- **Phase 4 (rules/checks optimization):** not started — all carryovers documented in `specs/phase-04-a3-carryover-bugs.md`.

### Sprint 5 history

| Sprint | Focus | Status |
|---|---|---|
| 5a | Bulk browser-test migration | ✅ Landed |
| 5b | Karma retirement + #16-A keystone | ✅ Landed (PR #4 merged at `b9da71e2`) |
| 5c | Preserved-suite migration (ACT / APG / full / node-smoke) + Selenium retire + CI consolidation | ✅ Landed (this branch — pending merge) |

Test counts at Sprint 5c close:

```
unit         Tests  589 passed | 2 skipped | 61 todo (720)
browser      Tests  2519 passed | 38 skipped | 6 todo (2563)
integration  Tests  1540 passed | 56 skipped | 38 todo (1634)
Aggregate    4,648 passing | 96 skipped | 105 todo across 4,849 tests.
```

Vs. baseline `b9da71e2`: **+2,171 passing tests** (+88%).

### Section 2 (Sprint 5 task list) — closed.

The detailed Sprint 5 task list below was the working plan during Sprints 5a–5c. All tasks are now complete; the file is preserved as historical record. New work tracks against `phase-04-a3-carryover-bugs.md` and `PRD-04-rules-checks-optimization.md`.

---

## 2. Sprint 5 — primary track (Phase 3 completion)

Pulled from `phase-03-test-infrastructure-modernization-plan.md` tasks #16–#21 plus the Sprint 4 carryover note.

### #16-A — Delete legacy infrastructure (the keystone)
- **Agent:** builder · **Parallel:** false · **Depends on:** none
- Delete `packages/axe-core/test/karma.conf.js`, `test/get-webdriver.js`, `test/testutils.js`, and original `test/{commons,core,checks,rule-matches,integration,act-rules,aria-practices,node}/**/*.js` source files.
- Remove from `packages/axe-core/package.json` devDependencies: `karma`, `karma-chai`, `karma-chrome-launcher`, `karma-firefox-launcher`, `karma-ie-launcher`, `karma-mocha`, `karma-sinon`, `karma-spec-reporter`, `mocha`, `chai`, `sinon`, `http-server`, `jquery`, `start-server-and-test`, `selenium-webdriver`, `chromedriver`, `serve-handler`.
- Rewrite `package.json` scripts: `test` → `vitest run --project unit`, `test:browser` → `vitest run --project browser`, `test:integration` → `vitest run --project integration`. Drop the seven `test:unit:*` shards and `integration:*` selenium scripts.
- Rewrite `packages/axe-core/test/browser/_helpers/check-helpers.ts`:
  - Drop `import '../../../dist/axe.js'` and the `axe` / `checks` re-exports.
  - Drop `getCheckEvaluate(checkId)` (UMD-hybrid path).
  - Replace internal `axe.setup` / `axe.teardown` / `axe.utils.X` calls with direct ESM imports from `@core/public/setup`, `@core/public/teardown`, `@core/utils/get-flattened-tree`, `@core/utils/get-node-from-tree`, `@core/utils/query-selector-all`.
  - Initialize `globalThis.axe ??= {}` so `lib/core/public/*`'s `declare const axe` writes have a target.
- Run `pnpm install`; commit lockfile.

### #16-B — Flip the remaining 74 check tests to ESM-direct
- **Agent:** builder · **Parallel:** false · **Depends on:** #16-A
- Re-run the existing flip script:
  ```bash
  cd packages/axe-core
  cp /tmp/task4-files.txt /tmp/task4-clean-files.txt
  node /tmp/flip-checks.mjs
  pnpm run test:vitest test/browser/checks/
  ```
- The dual-instance issue dissolves once #16-A removes the second module graph. The 10 already-flipped files are idempotent.

### #16-C — Synthetic-audit helper for `axe._audit` tests (~14 files)
- **Agent:** ts-builder · **Parallel:** true (independent of #17–#21 once #16-B lands)
- Build `test/browser/_helpers/synthetic-audit.ts` that takes a list of check IDs and assembles a minimal audit-shaped object from `lib/core/base/metadata-function-map.ts` entries + per-check JSON.
- Rewrite affected `.test.ts.todo` files to import from there. Could be deferred to Sprint 5b under time pressure.

### #16-D — Drop the `test_node` matrix job
- **Agent:** engineering-devops-automator · **Parallel:** true
- Sprint 4b carryover. Remove the entire `test_node:` job from `.github/workflows/test.yml` once `test:node` runs under the Vitest `unit` project (per plan task #12 note, line 329). Matrix is already trimmed to `[20, 22, 24]`; the standalone job adds no signal because axe-core has no Node-version-specific code paths.

### #17 — Enable v8 coverage thresholds
- **Agent:** coverage-checker · **Depends on:** #16-A
- Confirm `vitest.config.ts` thresholds: lines 85, branches 80, functions 85, statements 85.
- Run `pnpm test --coverage`; verify `lib/core/` ≥85% lines.
- For sub-threshold files, decide: write tests OR document exception in `coverage.exclude`.

### #18 — Performance benchmark + docs update
- **Agent:** builder · **Depends on:** #17
- Compare new Vitest wall-clock to baseline in `phase-03-baseline.md`. Demand ≥50% reduction; record in new `specs/phase-03-results.md`.
- Update `packages/axe-core/CONTRIBUTING.md` — replace Karma/Mocha references with Vitest (`pnpm test`, `pnpm test:browser`, `pnpm test:integration`, `pnpm test --coverage`, `pnpm test --ui`).
- Update root `README.md` if it references test commands.

### #19 — Final regression validation
- **Agent:** validator · **Depends on:** #18
- `pnpm validate` clean.
- Per-directory test counts compared to baseline; explain any drops in `phase-03-results.md`.
- `grep -rn 'karma\|mocha\|chai\|sinon\|jquery' packages/axe-core --include='*.{ts,js,json}' | grep -v CHANGELOG | grep -v node_modules` → empty.

### #20 — Final code review
- **Agent:** code-review · **Depends on:** #19
- Pattern compliance across migrated tests (consistent `expect`, no `assert.*`, no `sinon.*`).
- Spot-check 5 random browser tests for fixture-isolation hazards.
- Verify Playwright trace upload fires on a deliberate failing test.
- Verify zero `karma-*` strings in `package.json`, lockfile, or CI.

### #21 — Final acceptance validation
- **Agent:** validator · **Depends on:** #20
- Run all commands in plan §`Validation Commands`.
- Verify all 12 acceptance criteria in plan §`Acceptance Criteria`.

---

## 3. Sprint 4b residue — optional codemod parallel track

148 `.test.ts.todo` files remain. Bucket counts from current FIXME stamps:

| Bucket | Count | Tractable how |
|---|---|---|
| Generic post-codemod failure (logic divergence) | 33 | Manual, file-by-file |
| Unresolved `axe.testUtils.X` destructure / bare ref | ~64 | Sprint 4b #1 codemod |
| `axe._audit` direct access | 14 | Sprint 5 #16-C synthetic-audit helper |
| Module-scope `fixture` lookup | 8 | Sprint 4b #2 codemod |
| Unknown testUtils helpers (`html`, `isIE11`, `injectIntoFixture`) | 3 | Manual; helpers will not be re-exposed |
| Generic test failure post-codemod | 21 | Manual |
| `axe._tree` / `axe._memoizedFns` internal state | 2 | Manual; check whether Sprint 4 fix covers these now |
| Misc (sinon, name collisions, logic) | ~3 | Manual |

The two codemods (Sprint 4b #1 and #2) together cover ~72 of the 148 files. They are independent of Sprint 5 and can ship anytime.

### 4b-#1 — `axe.testUtils.X` destructure → `@helpers/check-helpers` named imports
- **Agent:** ts-builder · **Parallel:** true
- Build under `packages/build-tools/src/codemods/migrate-test-utils-destructure.ts`.
- CLI runner at `packages/build-tools/scripts/run-test-utils-migration.mjs`.
- Mirror `migrate-chai-assert-to-vitest.ts` shape: ts-morph pass + revert-on-fail.
- Helper exports already available: `checkSetup`, `queryFixture`, `fixtureSetup`, `flatTreeSetup`, `queryShadowFixture`, `shadowCheckSetup`, `createMockCheckContext`, `getCheckEvaluate`, `getCheckEvaluateESM`, `shadowSupport`, `axe`, `checks`.
- Files using `captureError`, `html`, `assertStylesheet`, `injectIntoFixture`, `addStyleSheet`, `removeStyleSheet`, `isIE11` stay `.todo` with a refined FIXME — those helpers will not be re-exposed.

### 4b-#2 — Module-scope `fixture` lookup → per-test `beforeEach`
- **Agent:** ts-builder · **Parallel:** true
- Build under `packages/build-tools/src/codemods/migrate-module-scope-fixture.ts` with runner `run-fixture-lookup-migration.mjs`.
- Reference: `scripts/migrate-todo-tests.mjs` already does this rewrite for the no-imports `.todo` case — extract and adapt.

### 4b-#3 — Update plan with realized outcomes
- **Agent:** builder · **Depends on:** 4b-#1, 4b-#2
- Append a "Sprint 4b — Realized Outcomes" subsection to `specs/phase-03-test-infrastructure-modernization-plan.md`.

---

## 4. Phase 3 → Phase 4 carryovers (out of Sprint 5 scope)

| Item | Location | Notes |
|---|---|---|
| **PRD-04 §5.1** color-algebra NaN regression | `lib/commons/color/{flatten-colors,stacking-context}.ts` | `flatten-colors` returns `#0NaN0NaN0NaN` for color-contrast pass case under Vitest Browser Mode. Currently asserted-against-broken-state with `// FIXME(phase-04)`. Unblocks 13 `it.skip` in `link-in-text-block.test.ts`. |
| `describe.skip('heading-order')` rewrite | tests/browser | Modernize ancestry-string assertions to environment-agnostic comparisons. |
| `accessible-text` codemod bad output | 1 file | Manual fixup; the codemod produced invalid output for this single case. |
| Chai assert-message inline-comment preservation | `migrate-chai-assert-to-vitest.ts` | Small extension to `ASSERT_MAP` renderers. Optional. |

---

## 5. Phase 4 — not yet started

PRD: `specs/PRD-04-rules-checks-optimization.md`. Three sprints planned:

- **Sprint 1** — Rule/Check conversion (typed factories `defineRule` / `defineCheck`)
- **Sprint 2** — Bulk conversion across `lib/rules/` and `lib/checks/`
- **Sprint 3** — Optimization, tree-shakeable bundles, performance benchmarking

Open questions in PRD-04 §6 (semver for rule bundles, custom-rule DX, ARIA spec sourcing, deprecation strategy) are still unresolved.

---

## 6. Hard constraints (carry from prior sprints)

- **Zero false-positive guarantee** — every closed task ends with the full Vitest suite green AND (until #16-A) the Karma suite green.
- **Karma stays green until #16-A.** No deletions in Sprint 4b residue work.
- **Phase 3 scope guard** — no edits to `lib/checks/`, `lib/rules/`, `lib/commons/`, `lib/standards/`. Surface modernization opportunities; let the user decide. (Carries the `feedback_flag_better_approaches` memory.)
- **No abstraction shims.** Each codemod = one ts-morph (or regex) pass + a thin runner. Mirror existing `migrate-chai-assert-to-vitest.ts` and `migrate-axe-tree-to-flat-tree-setup.ts` shapes.

---

## 7. Verification commands

```bash
# Build-tools (codemod unit tests)
pnpm --filter @axe-core/build-tools run typecheck
pnpm --filter @axe-core/build-tools test

# Axe-core
pnpm --filter axe-core run test:tsc
pnpm --filter axe-core run test:vitest

# Karma smoke (until #16-A)
cd packages/axe-core
pnpm run test:unit:core -- --browsers=ChromeHeadless --single-run

# Full validation gate
pnpm validate
```

---

## 8. Recommended execution order

1. **Sprint 4b #1 + #2** in parallel (independent, low risk, covers ~72 files).
2. **Sprint 5 #16-A** (the keystone; unblocks 16-B, 17, etc.).
3. **#16-B** immediately after #16-A (mechanical script re-run).
4. **#16-C** in parallel with #17 (independent).
5. **#17 → #18 → #19 → #20 → #21** in sequence.
6. Phase 4 kickoff.
