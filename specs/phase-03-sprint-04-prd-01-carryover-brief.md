# Phase 3 Sprint 4 — PRD-01 §4.1 Carryover Brief

**Purpose:** Self-contained handoff so a fresh `/build` session can close the PRD-01 §4.1 carryovers without re-reading prior context. Authored 2026-04-25 after Sprint 3 task #10 (test/checks migration) completion.

**How to use:** `/clear`, then `/build specs/phase-03-sprint-04-prd-01-carryover-brief.md`. Read this brief plus `specs/PRD-01-type-system-modernization.md` §4.1 for full context.

**Why this is next:** Closing §4.1 is the single highest-leverage move on the modernization runway. It cascades into:

- ~32 `it.todo` / `describe.todo` stubs across `test/unit/commons/` and `test/unit/core/utils/` flip from `.todo` to running tests.
- ~200 of the 246 `.test.ts.todo` files in `test/browser/{commons,core}/` become rename-only operations (`.test.ts.todo` → `.test.ts`).
- Most check tests in `test/browser/checks/` can flip from the **UMD-bundle hybrid** (`getCheckEvaluate(id)`) to the **ESM-direct** path (`getCheckEvaluateESM(evaluator)`) with a one-line edit. See `test/browser/_helpers/check-helpers.ts` "D1" decision tree.
- The two PRD-01 §4.1 sub-issues (memoize global, valid-langs trie) are independent and can ship in two separate commits.

---

## 1. Branch + commit state

- **Branch:** `chore/modernize-phase-03`
- **HEAD:** `09321cd6` (Sprint 3 final commit — path aliases)
- **Sprint 3 baseline:** `d5d28a2b` (pre-Sprint 3 task #10)
- **Sprint 1+2 baseline:** `79d43278`
- **Total commits since 79d43278:** 41

## 2. Test-suite state at HEAD

`pnpm run test:vitest` (from `packages/axe-core/`):

```
Test Files  145 passed | 33 skipped (178)
Tests      1444 passed | 38 skipped | 67 todo (1617)
```

`pnpm run test:tsc` clean. Karma stack (`pnpm run test:unit` plus the per-suite jobs in `.github/workflows/test.yml`) untouched and still green — the strangler-fig invariant is intact.

---

## 3. The two carryovers (verbatim from PRD-01 §4.1)

### 3.1 — Memoize global side-effect

`packages/axe-core/lib/core/utils/memoize.ts:23` mutates a global at module top level:

```ts
axe._memoizedFns = []; // axe is a global
function memoizeImplementation<T extends ...>(fn: T): T {
  const memoized = memoize(fn);
  axe._memoizedFns.push(memoized);   // line 31
  return memoized as T;
}
```

Under Node ESM (any pure-ESM import path that pulls this module), `axe` is undefined at module-load time and `axe._memoizedFns = []` throws `ReferenceError`. That cascades to every `commons/` module that transitively imports memoize, which is most of them.

**Consumers of `axe._memoizedFns`** (tracked via `grep -rn "_memoizedFns" packages/axe-core/lib`):

- `lib/core/utils/memoize.ts:23` — declares (the bug).
- `lib/core/utils/memoize.ts:31` — populates on each `memoize()` call.
- `lib/core/public/teardown.ts:5` (type) and `:17` — iterates and calls `.clear()` on each registered memoized function.
- `lib/index.ts:118` — comment only, but documents that `axe.utils` / `axe._memoizedFns` are the runtime contract.

**Test consumers** (tracked via the same grep across `test/`):

- `test/core/utils/memoize.js` (legacy Karma) — `axe._memoizedFns.length` length-checks.
- `test/core/public/run-rules.js`, `test/core/public/teardown.js` (legacy Karma) — direct mutation of `axe._memoizedFns[0]`.
- `test/browser/core/utils/memoize.test.ts.todo` and `test/browser/core/public/teardown.test.ts.todo` — already codemod-converted but kept `.todo` because they assume the global.

### 3.2 — `valid-langs.ts` trie regression

`packages/axe-core/lib/core/utils/valid-langs.ts` (the brief's earlier `lib/commons/aria/valid-langs.ts` reference is a leftover from before the Phase 1 file move). Introduced in commit `5b57d18c` during the Phase 1 JS→TS conversion.

Bug: `isValidLang('abcd')` returns `true` (should be `false`). The trie traversal returns early at depth 3 with `next === 1`, never validates the 4th character. Surfaced by Sprint 2 `test/unit/core/utils/valid-langs.test.ts` (currently `it.todo` for the 4-char case).

Inspect `lib/core/utils/valid-langs.ts:65–84`:

```ts
function isValidLang(lang: string): boolean {
  let array: LangTrie = langs;
  while (lang.length < 3) lang += '`';
  for (let i = 0; i <= lang.length - 1; i++) {
    const index = lang.charCodeAt(i) - 96;
    const next = array[index];
    if (!next) return false;
    if (next === 1) return true;     // ← early return, doesn't check remaining chars
    array = next;
  }
  return true;
}
```

The `next === 1` branch is the leaf-marker check, but for a 4-char input it should only return true if `i === lang.length - 1`. Otherwise the test should continue with `array[0]` (the trailing `\`` padding lookup).

The original JS used a different structure that handled this correctly. The TS conversion encoded the trie differently (or lost a check).

---

## 4. Sprint 4 scope (closes both §4.1 carryovers)

### Task #1 — Convert memoize.ts to a module-local registry

- **Task ID:** `fix-memoize-global` · **Agent:** ts-builder · **Parallel:** false
- Replace `axe._memoizedFns` global with a module-local `Set<{ clear: () => void }>` inside `lib/core/utils/memoize.ts`.
- Export a new `clearAllMemoized()` function from the module.
- Update `lib/core/public/teardown.ts:17` to call `clearAllMemoized()` instead of iterating `axe._memoizedFns`.
- Keep `axe._memoizedFns` as a deprecation-grade backward-compat property (assigned from the same module-local set) so the four legacy Karma tests above still pass. The Sprint 4 goal is to fix the side-effect, not to break Karma.
- Add a unit test under `test/unit/core/utils/memoize.test.ts` (replace the existing `.todo` stub) that confirms a memoized function survives `clearAllMemoized()` then re-runs cleanly.

### Task #2 — Fix valid-langs trie traversal

- **Task ID:** `fix-valid-langs-trie` · **Agent:** ts-builder · **Parallel:** true (independent of #1)
- Fix `lib/core/utils/valid-langs.ts:77` — the `if (next === 1) return true` branch must only fire at the last iteration of the loop. Lookup test:
  - `isValidLang('abcd')` → `false`
  - `isValidLang('en')` → `true` (existing case still passes)
  - `isValidLang('eng')` → `true`
  - `isValidLang('a')` → must return whatever the trie says for single-char
- Replace the `it.todo` for the 4-char case in `test/unit/core/utils/valid-langs.test.ts` with the live assertion.
- Cross-check: `validLangs()` (the deprecated array-form export at `:93`) should not regress — its consumer is the rule-help-version test driver.

### Task #3 — Rename `.test.ts.todo` files unblocked by #1

- **Task ID:** `unblock-test-todo-renames` · **Agent:** builder · **Parallel:** false · **Depends on:** #1
- After #1 lands, walk `packages/axe-core/test/browser/{commons,core,rule-matches}/**/*.test.ts.todo`.
- For each: `git mv X.test.ts.todo X.test.ts`, then run `pnpm run test:vitest <file>` to verify it passes.
- If a file fails, leave it `.todo` and add a one-line comment at the top noting the residual blocker (could be PRD-04 §5.1 color-algebra, evaluator behavior diff, etc.).
- Expected hit rate: ~80% rename-and-pass, ~20% still need follow-up.

### Task #4 — Flip migrated check tests from UMD-bundle to ESM-direct

- **Task ID:** `flip-checks-to-esm-direct` · **Agent:** builder · **Parallel:** false · **Depends on:** #1
- For each file under `test/browser/checks/**/*.test.ts` that uses `getCheckEvaluate('id')` from `@helpers/check-helpers`:
  1. Open the matching evaluator at `lib/checks/<category>/<name>-evaluate.ts`.
  2. If its import closure no longer touches the memoize global (i.e., #1 has shipped), change the test to `import <name>Evaluate from '@checks/<category>/<name>-evaluate'` + `getCheckEvaluateESM(<name>Evaluate)`.
- This is mechanical post-#1; `aria-busy.test.ts` is the canonical reference.
- Skip checks whose evaluator still has a real reason to need the audit registry (e.g., cross-rule helpers like `heading-order-after`).

---

## 5. Hard constraints

- **Strangler-fig stays in force.** Karma jobs (`test_chrome`, `test_firefox`, `test_examples`, `test_act`, `test_aria_practices`, `test_locales`, `test_virtual_rules`, `test_jsdom`, `test_node`) MUST remain green throughout Sprint 4. They are deleted in Sprint 5 (plan task #16), not before. This is why Task #1 keeps the `axe._memoizedFns` compatibility shim — the legacy Karma `test/core/utils/memoize.js` and `test/core/public/teardown.js` length-check it.
- **Zero false-positive guarantee.** Every closed task ends with the full Vitest suite green AND the Karma suite green.
- **Scope guard widened (deliberately).** Phase 3 was test-only. Sprint 4 explicitly opens the door to two surgical `lib/` changes — `memoize.ts` and `valid-langs.ts` — and nothing else. If a third `lib/` file is tempting to touch, STOP and surface it.
- **No abstraction shims.** When fixing memoize, do NOT introduce a `MemoizationRegistry` class or similar. A module-local `Set` plus an exported `clearAll()` function is the whole change. The brief explicitly preempts AI-slop here.

---

## 6. Open decisions for Sprint 4

### D1 — Backward-compat shape for `axe._memoizedFns`

Three options, ranked:

- **(a) Keep the property, drop the side-effect.** `lib/core/utils/memoize.ts` no longer mutates `axe` at top level; instead, the module-local set is mirrored to `axe._memoizedFns` lazily (the first time `memoize` is called, OR via an explicit init in `lib/index.ts`). Karma tests still see the array.
- **(b) Drop `axe._memoizedFns` entirely; teach legacy Karma tests to use the new `clearAllMemoized()` export.** Cleaner, but requires touching ~3 legacy `.js` files and risks Karma breakage right before Sprint 5 deletes them anyway.
- **(c) Keep the property AND keep the top-level mutation.** Defeats the purpose. Don't pick this.

**Recommendation: (a).** Smallest blast radius, no Karma risk, removes the ESM-load failure mode. Document in the module header that the property is deprecated and disappears with Karma in Sprint 5.

### D2 — `validLangs()` deprecated export

The 1-liner deprecated `export function validLangs(langArray?)` at `valid-langs.ts:93` is a pre-existing artifact. Don't remove it as part of this brief — it's used by external consumers per `JSDoc @deprecated`. Just confirm `validLangs()` still works after the trie fix.

---

## 7. Verification plan

After each task:

```bash
# Vitest (full)
cd packages/axe-core && pnpm run test:vitest

# TypeScript
cd packages/axe-core && pnpm run test:tsc

# Karma (smoke — full Chrome run is in CI)
cd packages/axe-core && pnpm run test:unit -- --browsers=ChromeHeadless --single-run
```

Expected post-Sprint 4 deltas (cumulative across tasks #1–#4):

```
Test Files  ~360 passed | ~10 skipped (~370)    (was 145 passed | 33 skipped)
Tests      ~3000+ passed | <30 todo                (was 1444 passed | 67 todo)
```

The big jump comes from Task #3 — bulk-renaming `.test.ts.todo` to `.test.ts` once memoize stops throwing.

---

## 8. Pointers for the implementer

- **Plan:** `specs/phase-03-test-infrastructure-modernization-plan.md` (Sprint 4 is plan-internal, not a numbered task).
- **PRDs:**
  - `specs/PRD-01-type-system-modernization.md` §4.1 — the carryover list.
  - `specs/PRD-03-test-infrastructure-modernization.md` §2.3.2 — evaluator-import strategy that #4 unblocks.
- **Files modified by Sprint 4:**
  - `packages/axe-core/lib/core/utils/memoize.ts` (Task #1)
  - `packages/axe-core/lib/core/public/teardown.ts` (Task #1, one line)
  - `packages/axe-core/lib/core/utils/valid-langs.ts` (Task #2)
  - `packages/axe-core/test/unit/core/utils/memoize.test.ts` (Task #1 — replace `.todo`)
  - `packages/axe-core/test/unit/core/utils/valid-langs.test.ts` (Task #2 — replace `.todo`)
  - `packages/axe-core/test/browser/{commons,core,rule-matches}/**/*.test.ts.todo` → `*.test.ts` (Task #3, ~200 files)
  - `packages/axe-core/test/browser/checks/**/*.test.ts` (Task #4, mostly `getCheckEvaluate` → `getCheckEvaluateESM` flips)
- **Helpers (no changes expected):**
  - `packages/axe-core/test/browser/_helpers/check-helpers.ts` — already exposes `getCheckEvaluateESM`. Update the module header to mark `getCheckEvaluate(id)` as deprecated post-Sprint 4.
  - `scripts/post-migrate-checks.mjs` — leave as-is; Sprint 4 doesn't run the codemod.
- **Path aliases (Sprint 3 task #9):** `@checks/`, `@commons/`, `@core/`, `@standards/`, `@lib/`, `@helpers/`. Use them in any new test files.
- **CI workflow:** `.github/workflows/test.yml` — `vitest_pilot` job is the parallel-stack live wire. The cache key for Playwright is the root `pnpm-lock.yaml` (NOT the package one). Don't regress this.

---

## 9. Out of scope (carry to Sprint 4b or later)

- **Plan task #11** — Selenium → Playwright integration. Independent.
- **Plan task #12** — Conformance + node + locale drivers. Depends on #11.
- **Plan task #13** — Polyfill + jQuery purge. Independent and mostly mechanical; can run in parallel.
- **Codemod gap fixes** — fold `scripts/post-migrate-checks.mjs` logic back into `packages/build-tools/src/codemods/migrate-mocha-to-vitest.ts`. Independent.
- **PRD-04 §5.1** — flatten-colors NaN regression. Out of scope here; unblocks the 16 `it.skip` in `link-in-text-block.test.ts` once it lands.
- **`describe.skip('heading-order')` rewrite** — modernize ancestry-string assertions to environment-agnostic comparisons. Phase 3 modernization follow-up.
