# Phase 3 Sprint 4b + Sprint 5 Follow-up Brief

**Purpose:** Self-contained handoff for the next `/build` session. Captures (a) two tractable codemod follow-ups that can ship anytime in Sprint 4b, and (b) the Sprint 5 tasks that unblock the rest of the test migration.

**How to use:** `/clear`, then `/build specs/phase-03-sprint-04b-followup-brief.md`. Read this brief plus `specs/phase-03-test-infrastructure-modernization-plan.md` (Sprint 4 outcomes section + tasks #16–#21).

**Authored:** 2026-04-25 after Sprint 4 + 4b codemod runs landed.

---

## 1. Branch + commit state

- **Branch:** `chore/modernize-phase-03`
- **HEAD:** `c5a276c5` (Sprint 4b codemod migrations)
- **Sprint 4 baseline (pre-codemod):** `5d6c67eb`
- **Sprint 3 baseline:** `09321cd6`
- **Recent commits (oldest → newest, 8 added this session):**
  ```
  031008eb fix(axe-core): close PRD-01 §4.1 carryovers (memoize, valid-langs, uuid)
  59545ca7 test(axe-core): flip 10 check tests from UMD-hybrid to ESM-direct
  5d6c67eb test(axe-core): bulk-migrate 73 .test.ts.todo files to Vitest
  e1a555f4 docs(specs): add Sprint 4 carryover brief for PRD-01 §4.1
  b6355071 docs(specs): record Sprint 4 outcomes + defer Path B to Sprint 5
  b3b1d5f2 feat(build-tools): add chai assert.* → Vitest expect codemod
  9b25f8ff feat(build-tools): add axe._tree → flatTreeSetup codemod
  c5a276c5 test(axe-core): migrate 25 more .test.ts.todo via Sprint 4b codemods
  ```

## 2. Test-suite state at HEAD

```
Test Files  244 passed | 33 skipped (277)
Tests      2475 passed | 39 skipped | 66 todo (2648)
```

`pnpm --filter axe-core run test:tsc` clean. Karma stack untouched. `pnpm --filter @axe-core/build-tools test`: 126/126 pass (45 of those are the new codemod unit tests).

**Session delta vs Sprint 3 HEAD `09321cd6`:** +99 test files, +1031 tests.

## 3. Remaining `.test.ts.todo` blocker landscape (148 files)

Sprint 4 + 4b codemods (`scripts/migrate-todo-tests.mjs`, the chai-assert codemod, the axe-tree codemod) cleared the easy migrations. The 148 files still on `.test.ts.todo` are stamped with refined FIXME headers naming the dominant remaining blocker.

| Bucket | Count | Tractable in Sprint 4b? |
|---|---|---|
| `axe.testUtils.X` destructure (Sprint 4b #1 below) | ~63 | **YES — codemoddable** |
| Module-scope `fixture` lookup (Sprint 4b #2 below) | ~25 | **YES — codemoddable** |
| Generic test failure post-codemod (logic divergence) | ~24 | NO — case-by-case |
| `axe._audit` direct access | ~10 | NO — needs synthetic-audit helper or Sprint 5 |
| Mocha `done()` callbacks | ~6 | Partial — codemoddable for simple cases |
| `accessible-text` codemod produced bad output | 1 | Manual fixup |
| Test timeouts | 2 | Manual review |
| Other (fixture null, axe._* internal state, mixed) | ~17 | Mixed |

The `axe.testUtils.X` and module-scope-fixture buckets together cover **88 of 148** files. A Sprint 4b that lands both codemods could realistically flip 60+ more files green.

---

## 4. Sprint 4b scope (two codemods, both independent)

### Task #1 — `axe.testUtils.X` destructure → `@helpers/check-helpers` named imports

- **Task ID:** `migrate-test-utils-destructure` · **Agent:** ts-builder · **Parallel:** true (independent of #2)
- **Affected files:** ~63 `.test.ts.todo` in `test/browser/{commons,core,rule-matches}/` stamped with `FIXME(phase-3-sprint-4b): unresolved axe.testUtils.* (Path-B helper migration)`.
- **Locate:**
  ```bash
  cd packages/axe-core
  grep -rln "FIXME(phase-3-sprint-4b): unresolved axe.testUtils" test/browser/{commons,core,rule-matches} > /tmp/sprint4b-testutils-files.txt
  ```
- **Pattern to rewrite:**
  ```ts
  // before
  const { fixtureSetup, queryFixture, shadowSupport } = axe.testUtils;
  // after
  import { fixtureSetup, queryFixture, shadowSupport } from '@helpers/check-helpers';
  ```
  Also handle the bare-access form:
  ```ts
  // before
  axe.testUtils.flatTreeSetup(node);
  // after
  flatTreeSetup(node);                                                     // (after adding import)
  ```
- **Helper exports already available** in `test/browser/_helpers/check-helpers.ts`: `checkSetup`, `queryFixture`, `fixtureSetup`, `flatTreeSetup`, `queryShadowFixture`, `shadowCheckSetup`, `createMockCheckContext`, `getCheckEvaluate`, `getCheckEvaluateESM`, `shadowSupport`, `axe`, `checks`.
- **Helpers NOT exported (will leave the file as `.todo`):** `captureError`, `html`, `assertStylesheet`, `injectIntoFixture`, `addStyleSheet`/`removeStyleSheet`, `isIE11`. Stamp those files with a refined FIXME — Sprint 5 territory.
- **Build the codemod under** `packages/build-tools/src/codemods/migrate-test-utils-destructure.ts`. Mirror the structure of `migrate-chai-assert-to-vitest.ts`. Add a CLI runner at `packages/build-tools/scripts/run-test-utils-migration.mjs`.
- **Pipeline:** strip the FIXME header line, rewrite the destructure, rename `.test.ts.todo` → `.test.ts`, run Vitest, revert failures with refined FIXMEs.

### Task #2 — Module-scope `fixture` lookup → per-test `beforeEach`

- **Task ID:** `migrate-fixture-lookup` · **Agent:** ts-builder · **Parallel:** true (independent of #1)
- **Affected files:** ~25 `.test.ts.todo` stamped with `FIXME(phase-3-sprint-4b): fixture lookup at module top level`.
- **Pattern to rewrite:**
  ```ts
  // before
  describe('foo', function () {
    const fixture = document.querySelector('#fixture');
    it('...', function () { fixture.innerHTML = '...'; ... });
  });
  // after
  describe('foo', function () {
    let fixture: HTMLElement;
    beforeEach(() => { fixture = document.getElementById('fixture') as HTMLElement; });
    it('...', function () { fixture.innerHTML = '...'; ... });
  });
  ```
  The per-test fixture container is created by `vitest.setup.ts`'s `beforeEach` (see `globalThis.__axeFixture`), but the legacy module-scope `document.querySelector('#fixture')` runs at *import* time — before the `beforeEach` fires.
- **Reference:** `scripts/migrate-todo-tests.mjs` already does this same rewrite for the no-imports `.todo` case. Extract and adapt.
- **Build under** `packages/build-tools/src/codemods/migrate-module-scope-fixture.ts` with a runner at `packages/build-tools/scripts/run-fixture-lookup-migration.mjs`. Same revert-on-fail pattern as #1.

### Task #3 — Update PRD-03 plan with Sprint 4b outcomes

- **Task ID:** `update-plan-sprint-4b` · **Agent:** builder · **Parallel:** false · **Depends on:** #1, #2
- Append a "Sprint 4b — Realized Outcomes" subsection to `specs/phase-03-test-infrastructure-modernization-plan.md` (after the Sprint 4 outcomes section). Record final Vitest pass counts, the new codemod paths, and the residual `.todo` blocker bucket sizes.

---

## 5. Sprint 5 scope (unblocks the rest)

Sprint 5 was already in the original plan as **task #16 (`delete-legacy`)** and tasks #14–#21. The Sprint 4 outcomes amendment (committed in `b6355071`) added a Path B follow-up note. Re-stating here for handoff completeness.

### Task #16-A — Delete Karma + the UMD bundle from test helpers

- Per `specs/phase-03-test-infrastructure-modernization-plan.md` task #16: delete `packages/axe-core/test/karma.conf.js`, `test/get-webdriver.js`, `test/testutils.js`, the original `test/{commons,core,checks,rule-matches,integration,act-rules,aria-practices,node}/**/*.js`. Remove 17 dead devDependencies. Rewrite `package.json` scripts.
- **New addition (Sprint 4 carryover):** in the same task, also rewrite `packages/axe-core/test/browser/_helpers/check-helpers.ts`:
  - Remove `import '../../../dist/axe.js';`
  - Remove the `axe`, `checks` re-exports.
  - Remove `getCheckEvaluate(checkId)` (the UMD-hybrid path).
  - Replace internal `axe.setup` / `axe.teardown` / `axe.utils.X` calls with direct ESM imports from `@core/public/setup`, `@core/public/teardown`, `@core/utils/get-flattened-tree`, `@core/utils/get-node-from-tree`, `@core/utils/query-selector-all`.
  - Initialize `globalThis.axe ??= {}` at module top so the `lib/core/public/*` files' `declare const axe` writes have a target.

### Task #16-B — Re-run the check-test flip script

- After #16-A lands, the dual-instance issue (UMD bundle vs ESM modules) dissolves: there is only one module graph.
- Re-run the existing flip script:
  ```bash
  cd packages/axe-core
  cp /tmp/task4-files.txt /tmp/task4-clean-files.txt   # use the full 84-file list
  node /tmp/flip-checks.mjs
  pnpm run test:vitest test/browser/checks/
  ```
- All 84 check tests should flip cleanly. The 10 already-flipped files are idempotent (`getCheckEvaluateESM` calls become no-ops for the regex).

### Task #16-C — Address the `axe._audit` direct-access tests (~10 files)

- The `.test.ts.todo` files stamped `uses axe._audit` need ESM-direct rule/check imports OR a synthetic mini-audit helper.
- Path: build `test/browser/_helpers/synthetic-audit.ts` that takes a list of check IDs and assembles a minimal audit-shaped object from `lib/core/base/metadata-function-map.ts` entries + the per-check JSON. Then rewrite the affected tests to import from there instead of `axe._audit`.
- Lower priority — only ~10 files. Could be a Sprint 5b if Sprint 5 ships under time pressure.

### Tasks #17–#21 (already in plan, unchanged)

- #17 enable coverage thresholds
- #18 performance benchmark + docs update
- #19 final regression validation
- #20 final code review
- #21 final validation

---

## 6. Hard constraints (carry from Sprint 4)

- **Karma stack must stay green throughout Sprint 4b.** Deletion happens in Sprint 5 task #16, not before.
- **Sprint 4b touches only `.test.ts.todo` files and the new codemod files.** No changes to `lib/`, `_helpers/check-helpers.ts`, or `test/browser/checks/**/*.test.ts`.
- **Do NOT bulk-flip the remaining 74 check tests in Sprint 4b.** That's Sprint 5 task #16-B, gated on the UMD bundle being removed first. Attempts in Sprint 4 hit dual-instance failures; the architectural fix is bundle removal, not cache mirroring.
- **No abstraction shims.** Each codemod is a single ts-morph (or regex) pass + a thin runner script. Mirror the existing `migrate-chai-assert-to-vitest.ts` and `migrate-axe-tree-to-flat-tree-setup.ts` shapes.

---

## 7. Verification plan

After each Sprint 4b task:

```bash
# Build-tools (codemod unit tests)
cd /Users/tonykornmeier/Code/axe-core
pnpm --filter @axe-core/build-tools run typecheck
pnpm --filter @axe-core/build-tools test

# Axe-core (typecheck + vitest)
pnpm --filter axe-core run test:tsc
pnpm --filter axe-core run test:vitest

# Karma smoke (must remain green)
cd packages/axe-core
pnpm run test:unit:core -- --browsers=ChromeHeadless --single-run
```

**Expected post-Sprint-4b deltas (cumulative):**

```
Test Files  ~300 passed | ~10 skipped (~310)   (was 244 passed | 33 skipped)
Tests      ~3000 passed | <30 todo            (was 2475 passed | 66 todo)
```

The bigger jump comes from Sprint 5 task #16, which unblocks the 74 check-test flips + retires Karma's parallel stack.

---

## 8. Pointers for the implementer

- **Existing codemods (mirror their structure):**
  - `packages/build-tools/src/codemods/migrate-mocha-to-vitest.ts` — the original (handles describe/it/expect, sinon→vi).
  - `packages/build-tools/src/codemods/migrate-chai-assert-to-vitest.ts` — Sprint 4b commit `b3b1d5f2`. ts-morph based. 34 unit tests.
  - `packages/build-tools/src/codemods/migrate-axe-tree-to-flat-tree-setup.ts` — Sprint 4b commit `9b25f8ff`. Regex based. 11 unit tests.
- **Existing runners (mirror their two-phase orchestrator pattern):**
  - `packages/build-tools/scripts/run-chai-assert-migration.mjs` — codemod + rename + Vitest + revert-on-fail.
  - `scripts/migrate-axe-tree-mutations.mjs`, `scripts/migrate-todo-tests.mjs`, `scripts/revert-todo-failures.mjs`.
- **Helper module (read before writing the destructure codemod):**
  - `packages/axe-core/test/browser/_helpers/check-helpers.ts` — exported names, comment block at top.
- **Path aliases (Sprint 3 task #9):** `@checks/`, `@commons/`, `@core/`, `@standards/`, `@lib/`, `@helpers/`. Use them in new test files and codemod outputs.
- **The flip script (Sprint 5 task #16-B input):** `/tmp/flip-checks.mjs` (preserved). `/tmp/task4-files.txt` is the full 84-file list. `/tmp/task4-ids-resolved.txt` has check-id → category/evaluator/options metadata pre-resolved.

---

## 9. Out of scope (carry to later sprints)

- **PRD-04 §5.1** — flatten-colors NaN regression. Unblocks the 13 `it.skip` in `link-in-text-block.test.ts`. Independent of Sprint 4b/5.
- **`describe.skip('heading-order')` rewrite** — modernize ancestry-string assertions to environment-agnostic comparisons. Phase 3 modernization follow-up.
- **Plan task #11** — Selenium → Playwright integration migration. Independent.
- **Plan task #12** — Conformance + node + locale drivers. Depends on #11.
- **Synthetic-audit helper for `axe._audit` tests** (Sprint 4b §5 task #16-C) — could land independently if a contributor wants to unblock those 10 files before Sprint 5.
- **Restoring chai's optional message arguments as inline comments in the codemod output** — mentioned by the chai-assert codemod's report. Small extension to `ASSERT_MAP` renderers in `migrate-chai-assert-to-vitest.ts`.
