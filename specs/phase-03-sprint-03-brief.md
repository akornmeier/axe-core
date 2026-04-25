# Phase 3 Sprint 3 — Build Brief

**Purpose:** Self-contained handoff so a fresh `/build` session can execute Sprint 3 of the Phase 3 test infrastructure modernization without re-reading the prior conversation. Authored 2026-04-25 after Sprint 2 completion.

**How to use:** `/clear`, then `/build specs/phase-03-sprint-03-brief.md`. The brief points at the canonical plan (`specs/phase-03-test-infrastructure-modernization-plan.md`) and PRD (`specs/PRD-03-test-infrastructure-modernization.md`); read those for full context. Everything below is delta-state and constraints carried forward.

---

## 1. Branch + commit state

- **Branch:** `chore/modernize-phase-03`
- **HEAD:** `d5d28a2b` (Sprint 2 final commit — rule-matches visibility/landmark/odds migration)
- **Sprint 1+2 baseline:** `79d43278` (pre-Sprint 1)
- **Total commits since baseline:** 35 (full list at end of brief)

## 2. Test-suite state at HEAD

`pnpm run test:vitest` (from `packages/axe-core/`):

```
Test Files  38 passed | 31 skipped (69)
Tests       223 passed | 1 skipped | 61 todo (353)
```

Karma stack still green in parallel — strangler-fig is intact.

### Migrated (`.test.ts`, runs in CI)

| Directory | Files |
|---|---|
| `test/unit/commons/` | 42 |
| `test/unit/core/` | 18 |
| `test/browser/checks/` (Sprint 1 pilots) | 3 |
| `test/browser/rule-matches/` (Sprint 1 pilots) | 2 |
| `test/integration/` (Sprint 1 pilots) | 2 |
| Total `.test.ts` | **65** |

### Browser-deferred (`.test.ts.todo`, NOT in CI)

| Directory | Files |
|---|---|
| `test/browser/commons/` | 103 |
| `test/browser/core/` | 101 |
| `test/browser/rule-matches/` | 42 |
| Total `.test.ts.todo` | **246** |

These are codemod-converted-but-renamed-`.todo` because they require a live `axe._audit` registry and per-test fixture isolation that Sprint 3 task #10 will formalize. They are valid TypeScript; rename `.todo → ts` once the canonical pattern lands.

### `it.todo` stubs blocked on Phase 1 follow-up

61 stubs across the migrated suites. Each carries a `// FIXME(phase-01-followup): blocked by ...` comment pointing at `PRD-01 §4.1`. Closing PRD-01 §4.1 work unblocks ~58 of them in one sweep.

---

## 3. Phase carryovers (do NOT fix in Sprint 3 — flag and continue)

### PRD-01 §4.1 — Pure-ESM import blockers

1. **`lib/core/utils/memoize.ts`** — module-top-level `axe._memoizedFns = []` throws `ReferenceError` in Node ESM. Cascades to every `commons/` module that transitively imports memoize. **Owns ~58 of the 61 `it.todo` stubs.**
2. **`lib/commons/aria/valid-langs.ts`** — `isValidLang('abcd')` returns `true` post-TS conversion (commit `5b57d18c`). Trie returns early at depth 3 with `next === 1`. Owns the 4-char `it.todo` in `test/unit/core/utils/valid-langs.test.ts`.

### PRD-04 §5.1 — Color-algebra regression

`lib/commons/color/flatten-colors.ts` produces `#0NaN0NaN0NaN` for the color-contrast pass case. `test/browser/checks/color/color-contrast.test.ts` currently asserts against the broken state with a `// FIXME(phase-04)` marker.

**Scope guard (still in force for Sprint 3):** Do NOT modify `lib/checks/`, `lib/rules/`, `lib/commons/`, `lib/standards/` without explicit user approval. Phase 3 is test-infrastructure-only. Flag better approaches per the `feedback_flag_better_approaches` memory, but the deliverable is the flag, not the fix.

---

## 4. Sprint 3 scope (plan tasks 10–13, verbatim)

### Task #10 — Migrate browser-bound `test/checks/`
- **Task ID:** `migrate-checks-browser` · **Agent:** ts-builder · **Parallel:** false
- Convert all `test/checks/**/*.js` to `test/browser/checks/**/*.test.ts` running under the Vitest `browser` project.
- Replace `axe.testUtils.getCheckEvaluate('foo')` with direct imports from `lib/checks/`.
- Replace shared `<div id="fixture">` with per-test `createFixture()` helper for parallel-test safety (PRD §5.5).

### Task #11 — Migrate `test/integration/`
- **Task ID:** `migrate-integration` · **Agent:** ts-builder · **Parallel:** false · **Depends on:** #10
- Convert `test/integration/full/*` to `test/integration/**/*.test.ts` under the Vitest `integration` project.
- Replace Selenium WebDriver with Playwright `page.goto()` against fixture URLs served by the Vite dev server.
- Decommission `test/get-webdriver.js` once nothing imports it.

### Task #12 — Conformance + node + locale drivers
- **Task ID:** `migrate-conformance-and-node` · **Agent:** ts-builder · **Parallel:** false · **Depends on:** #11
- Convert Mocha-driven `*.spec.js` (act-rules, aria-practices) to Vitest. Keep external `wcag-act-rules` and `aria-practices` GitHub deps as-is.
- Convert `test/test-locales.js`, `test/test-virtual-rules.js`, `test/test-rule-help-version.js` to Vitest under `test/unit/`.
- Convert `test/node/node.js` and `test/node/jsdom.js` to Vitest, gated behind a `legacy-jsdom` tag with a `console.warn` (per PRD-00 §4.4 — JSDOM deprecated, removal in v5).

### Task #13 — Polyfill + jQuery purge
- **Task ID:** `purge-polyfills-jquery` · **Agent:** builder · **Parallel:** false · **Depends on:** #12
- `grep -rn 'polyfill\|shim\|ponyfill' packages/axe-core/lib packages/axe-core/test` and evaluate each hit against PRD §2.4 table.
- Remove `Array.from`, `Array.prototype.includes`, `Object.assign`, `Element.prototype.closest`, `requestAnimationFrame` polyfills now covered by Baseline 2024.
- `grep -rn 'jquery\|jQuery\|\$(' packages/axe-core/test` — replace with native DOM in test code.
- Run full Vitest suite to confirm no regressions.

### Sprint 3 trailing work (in addition to plan tasks)

- **Process the 246 `.test.ts.todo` files.** Once the task #10 canonical pattern lands, the bulk of these become rename-only. A small subset (anything touching memoize-dependent commons) stays `.todo` until PRD-01 §4.1 closes.
- **Codemod gap fixes** (file: `packages/build-tools/src/codemods/migrate-mocha-to-vitest.ts`):
  - Mocha `done` callback → Vitest `() => new Promise<void>(resolve => ...)` (Vitest 4 deprecates `done`).
  - Strip `'use strict'` from nested describes (Pass-3 cleanup).
  - Detect `var X = axe.utils.X` self-shadow when `X` is also imported (TDZ at runtime).
  - Add a separate `--overwrite` flag distinct from `--force`; current `--force` clobbers hand-authored files (clobbered Sprint 1 pilot once during Sprint 2).
- **Table-driven (`it.each`) candidate review.** ~30 files flagged during Sprint 2; top offenders: `text/accessible-text` (218 blocks), `color-contrast-matches` (60), `core/base/check` (57), `core/utils/matches` (55). Propose, don't auto-convert.

---

## 5. Hard constraints

- **Strangler-fig stays in force.** Karma jobs (`test_chrome`, `test_firefox`, `test_examples`, `test_act`, `test_aria_practices`, `test_locales`, `test_virtual_rules`, `test_jsdom`, `test_node`) must remain green throughout Sprint 3. They are deleted in Sprint 4 (plan task #16), not before.
- **Phase 3 scope guard.** No modifications under `lib/checks/`, `lib/rules/`, `lib/commons/`, `lib/standards/`. Test-only changes. Use the `feedback_flag_better_approaches` memory: name the legacy pattern, propose the better approach, let the user decide. Don't silently fix.
- **Per-test fixture isolation.** The Sprint 1 fixture-container pattern (`globalThis.__axeFixture` populated by `test/setup/vitest.setup.ts`'s `beforeEach`) is the contract. Do NOT reintroduce a shared `<div id="fixture">`. See `test/browser/_helpers/check-helpers.ts` for the canonical helper.
- **Maintain CI parallel-stack invariants.** `vitest_pilot` job in `.github/workflows/test.yml` uses Playwright cache keyed on root `pnpm-lock.yaml` (NOT the package one — that path is empty). Cache-hit branch still runs `playwright install-deps` for system libs. Don't regress this.
- **Zero false-positive guarantee.** Every closed task ends with the full Vitest suite green AND the Karma suite green.

---

## 6. Open decisions for Sprint 3 (resolve in task #10, then apply consistently)

### D1 — Canonical evaluator-import pattern (the big one)

Sprint 1 helpers route through the built UMD bundle (`dist/axe.js`) to populate `axe._audit.checks`. PRD §2.3.2 says Sprint 3 task #10 replaces this with direct imports from `lib/checks/<category>/<name>-evaluate.ts`. **This decision affects all 246 deferred files** — pick once, codify in `_helpers/`, then apply everywhere.

Two viable shapes:
- **(a) Pure ESM imports.** Import `evaluate` and `options` from the source module; build a thin wrapper that mimics `Check#getOptions` + `.call(this, ...)`. No bundle dependency. Blocked while memoize global side-effect (PRD-01 §4.1) is unfixed for any check transitively pulling commons.
- **(b) UMD-bundle hybrid.** Keep the bundle import for `_audit.checks` lookup but stop using the global helper API. Lower velocity gain, no Phase-1 dependency.

Recommend (a) where the dependency graph permits, (b) where memoize is in the import closure. Document the chosen pattern in `test/browser/_helpers/check-helpers.ts` JSDoc.

### D2 — Fixture URL strategy for task #11

Vite dev server vs. a Playwright route handler vs. inline `data:` URLs for small fixtures. PRD §5.5 prefers Vite dev server for parity with production. Confirm a working pattern with one integration test before bulk-migrating.

### D3 — Conformance driver location

Plan task #12 routes locale + virtual-rules + rule-help-version into `test/unit/`. Confirm they don't transitively need `axe._audit` populated; if they do, route them to `test/browser/` instead.

---

## 7. Pointers for the implementer

- **Plan:** `specs/phase-03-test-infrastructure-modernization-plan.md` — full task list (1–21), constraints, agent assignments.
- **PRD:** `specs/PRD-03-test-infrastructure-modernization.md` — the spec being implemented. §2.3.2 (evaluator imports), §2.4 (polyfill audit), §5.5 (fixture isolation), §6.1 (Playwright trace), §6.2 (color-contrast risk — closed via Sprint 1 pilot).
- **Carryovers:** `specs/PRD-01-type-system-modernization.md` §4.1, `specs/PRD-04-rules-checks-optimization.md` §5.1.
- **Codemod:** `packages/build-tools/src/codemods/migrate-mocha-to-vitest.ts` (81 unit tests in `__tests__/`, all passing). Gaps listed in §4 above.
- **Vitest workspace:** `packages/axe-core/vitest.workspace.ts` — three projects (`unit`, `browser`, `integration`), each wires `setupFiles: ['./test/setup/vitest.setup.ts']` (Vitest 4 does not inherit root setupFiles).
- **Setup file:** `packages/axe-core/test/setup/vitest.setup.ts` — installs `globalThis.__axeFixture` and tears it down per test.
- **Helpers:** `packages/axe-core/test/browser/_helpers/check-helpers.ts` — the canonical (temporary) `MockCheckContext`, `getCheckEvaluate`, `checkSetup`, `queryFixture`. Sprint 3 task #10 replaces the bundle dependency.
- **CI workflow:** `.github/workflows/test.yml` — `vitest_pilot` job is the parallel-stack live wire; Karma jobs unchanged.

---

## 8. Sprint 1+2 commit log (for context, oldest first)

```
844785fc chore: bump root devDependencies (husky/oxlint/turbo, @types/node, typescript)
29f98eb4 fix(axe-core): generated default-config.ts skips typecheck (Phase 2 regression)
0837e60a fix(axe-core): pull in @types/node for Buffer/module references
e6f19aad fix(axe-core): preserve axe._audit on UMD global (Phase 2 regression)
ac498904 chore(axe-core): point karma.conf.js at dist/ for axe.js (transitional)
f931ea3e docs(phase-03): refresh baseline with real Karma counts after Phase 2 fixes
0e8fd039 chore(axe-core): install Vitest 4 + Playwright (Phase 3, Task 2)
044958f5 chore(axe-core): add Vitest config, workspace, setup, fixture helpers (Task 3)
b473012b test(axe-core): pilot-migrate 10 representative tests to Vitest 4 (Task 4)
69a56d4a ci(phase-03): add vitest_pilot job for parallel test runs
da9aba4f ci(phase-03): fix Playwright cache invalidation and skip redundant install
4131a59d fix(axe-core): wire setupFiles per Vitest project (Sprint 1 carryover)
57cafe55 docs(phase-04): document color-algebra regression as Phase 3 carryover
036825f7 feat(build-tools): add Mocha/Chai/Sinon → Vitest codemod (Task 6)
ff96350f fix(build-tools): codemod must not rewrite strings/comments and must preserve paths
814f8303 test(axe-core): migrate test/commons/aria/ to Vitest (Task 7)
eae70917 test(axe-core): migrate test/commons/color/ to Vitest
edc3b96b test(axe-core): migrate test/commons/dom/ to Vitest
9dde1003 test(axe-core): migrate test/commons/forms/ to Vitest
88563638 test(axe-core): migrate test/commons/math/ to Vitest
f0d303cd test(axe-core): migrate test/commons/matches/ to Vitest
aa887775 test(axe-core): migrate test/commons/standards/ to Vitest
2b93dad9 test(axe-core): migrate test/commons/table/ to Vitest
ec002cd4 test(axe-core): migrate test/commons/text/ to Vitest
e3b6687f test(axe-core): stub test/commons/index.js as describe.todo
2c061812 docs(phase-01): document pure-ESM import blockers as Phase 3 carryover
1c741d75 test(axe-core): migrate test/core/utils/ to Vitest (Task 8)
c4a3e741 test(axe-core): migrate test/core/base/ to Vitest
cf032f30 test(axe-core): migrate test/core/public/ to Vitest
02b2f54c test(axe-core): migrate test/core/reporters/ to Vitest
5e7971cf test(axe-core): migrate test/core root-level files to Vitest
939ee3a6 docs(phase-01): add valid-langs trie regression to Phase 3 carryover
ac6a382b test(axe-core): migrate test/rule-matches/aria-* to Vitest (Task 9)
b6540b72 test(axe-core): migrate test/rule-matches/ label/role/text to Vitest
9283f4ba test(axe-core): migrate test/rule-matches/ frame/duplicate-id/namespace to Vitest
d5d28a2b test(axe-core): migrate test/rule-matches/ visibility/landmark/odds to Vitest
```
