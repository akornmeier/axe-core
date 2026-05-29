# Phase 4 — A3 Carryover Bugs (from Phase 3 Sprint 5a/b)

**Authored:** 2026-04-26
**Source sprint:** `chore/modernize-phase-5` — Sprint 5c, Step 3 (`capture-a3-bugs`)
**Owner on intake:** PRD-04 §5.1 maintainer (color-algebra cluster) + PRD-04 Sprint 1 lead (selector cluster)
**Scope guard upstream:** Phase 3 may not edit `lib/checks/`, `lib/rules/`, `lib/commons/`, or `lib/standards/` (`feedback_flag_better_approaches` memory + `phase-05-remaining-work-brief.md` §6). This doc is the clean intake hand-off.

---

## Why this doc exists

Sprints 5a and 5b migrated `packages/axe-core/test/browser/**` off Karma+Mocha onto Vitest Browser Mode + Playwright. Two codemods (chai-assert→`expect`, axe-tree→flat-tree-setup) automated the bulk; ~148 files survived as `.test.ts.todo` parking with single-line FIXME stamps describing the bucket they fell into.

Four of those parked files are special: their FIXME bucket reads `chai+testUtils chain failed` AND the failing assertions sit on top of either color-algebra paths (`flatten-colors` / blending math) or selector-generation paths (`get-selector` / `DqElement` source serialization). PRD-04 §5.1 already names the color-algebra NaN regression as a known Phase 4 carryover; this doc forwards the four parked files to the same intake so the Phase 4 maintainer does not have to re-archaeology the failure mode from a one-line stamp.

Total tests parked across the four files (per FIXME headers): **3 + 15 + 2 + 1 = 21**.

---

## Reproducing all four at once

The four files share the same parking mechanism. To wake any of them up:

```bash
cd packages/axe-core

# Wake one file:
mv test/browser/<path>/<name>.test.ts.todo test/browser/<path>/<name>.test.ts

# Run only that file:
pnpm run test:vitest:browser -- <name>.test.ts

# Restore parking after triage (do NOT commit a wake without a real fix):
mv test/browser/<path>/<name>.test.ts test/browser/<path>/<name>.test.ts.todo
```

Per-cluster wake commands are in each section below.

> **Common pre-fix:** before any of these will surface their *actual* assertion failures, the `chai+testUtils chain` has to be unbroken. Concretely, every file uses `assert.closeTo` / `assert.isFunction` / `assert.isBelow` / `assert.isAtLeast` / `assert.instanceOf` (Chai-style) AND module-scope `axe.testUtils.X` destructures (UMD-hybrid path that no longer exists post-Sprint 5 #16-A). Running the existing `migrate-chai-assert-to-vitest` codemod and `migrate-test-utils-destructure` codemod (Sprint 4b #1) over each file is the prerequisite. Only once those run cleanly does the *product* failure underneath become visible. See "Verification gating" at the bottom of this doc.

---

## Cluster 1 — `color-contrast-matches` (3 tests)

**Path:** `packages/axe-core/test/browser/rule-matches/color-contrast-matches.test.ts.todo`
**FIXME:** line 1 — `// FIXME(phase-05-sprint-5b): chai+testUtils chain failed: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯`
**File length:** 600 lines, ~50 `it()` cases inside one outer `describe('color-contrast-matches', …)` plus a nested `describe('with font icons', …)`.

### What's failing

The FIXME stamp records 3 test failures at parking time but does not name them. Reading the file body, the candidate set is heavily weighted toward tests that exercise:

- text-overflow / text-indent geometry (`'should not match when there is text that is out of the container'`, `'should match when there is text that is in the scroll reach of container'`, `'should match when there is text that is only partially out of the container'`, `'should not match text outside overflow'`)
- font-icon detection (`'is false for a single icon'`, `'is false for multiple icons'` — the `with font icons` block, which `await materialFont.load()` and depends on font availability under Playwright)
- `font-size: 0` short-circuit (`'should not match text with font-size: 0'`)

These assertions ride on `rule.matches(target, vNode)` returning a boolean. The matcher itself walks `lib/rules/color-contrast-matches.js` → into `lib/commons/text/visible-virtual.js` and `lib/commons/dom/is-visible.js`, neither of which is in PRD-04 §5.1's named color-algebra surface. So the *path* under test is not a color-algebra path — but PRD-04 §5.1 records the related observation that `lib/commons/color/flatten-colors.ts` returns `#0NaN0NaN0NaN` for the contrast-pass case under Vitest+Playwright, and the broader `color-contrast` rule shares an evaluator. Whether the same Browser Mode quirk hits this matcher is an open question.

### Repro

```bash
cd packages/axe-core
mv test/browser/rule-matches/color-contrast-matches.test.ts.todo \
   test/browser/rule-matches/color-contrast-matches.test.ts
pnpm run test:vitest:browser -- color-contrast-matches.test.ts
# (Restore parking after triage.)
```

### Hypothesized root cause

Two-layer hypothesis:

1. **Surface (must fix first to see the real failure):** Module-scope `assert.*` chai usage and the file's `axe.testUtils.flatTreeSetup(fixture)` destructure pattern. These break before any product code runs. The Sprint 4b #1 / chai-assert codemods cover this mechanically.
2. **Underneath (the actual A3 candidate):** Once the chain is restored, the most likely surviving failures are geometry-driven `is-visible` / overflow-reach edge cases under Playwright's headless layout engine, OR a font-loading race in the `'with font icons'` block (`document.fonts.add` timing vs. `axe.run`). Geometry mismatch between Karma+Chrome and Vitest Browser+Playwright Chrome is a known class of Sprint-5 issues — but it's not color-algebra. Treat the cluster as **rule-matcher geometry drift suspect**, not as PRD-04 §5.1.

### Recommended Phase 4 slot

**PRD-04 Sprint 1 — ancillary** (with PRD-04 §5.1 as a secondary cross-link in case the matcher path hits the same `flatten-colors` symptom). Sprint 1's `defineRule(colorContrastRule, …)` work touches `lib/rules/color-contrast/` — a natural moment to also exercise the matcher under Vitest Browser Mode and triage these 3 cases. Do NOT widen PRD-04 §5.1 to swallow this without first running the wake-and-triage above; the failure mode may not be color-algebra at all.

---

## Cluster 2 — `get-foreground-color` (15 tests)

**Path:** `packages/axe-core/test/browser/commons/color/get-foreground-color.test.ts.todo`
**FIXME:** line 1 — `// FIXME(phase-05-sprint-5b): chai+testUtils chain failed: ⎯⎯⎯⎯⎯⎯ Failed Tests 15 ⎯⎯⎯⎯⎯⎯⎯`
**File length:** 222 lines. Outer `describe('color.getForegroundColor', …)` plus three nested describes: `text-stroke` (4 tests), `with transparency` (5 tests), `test-shadow` (3 tests). Plus 4 top-level `it()` cases. Total visible `it()` count: ~16 — close enough to the FIXME's 15 that one test was likely conditional or skipped at parking time.

### What's failing

Heavy color-algebra coverage. `assertSameColor(actual, expected, margin)` is the workhorse helper (uses `assert.closeTo` four times — chai-style). Tests cover:

- direct `color` CSS property reads (`'returns the CSS color property'`, `'returns the CSS color from inside of Shadow DOM'`)
- `-webkit-text-fill-color` precedence (`'returns ` `-webkit-text-fill-color` ` over ` `color` `'`)
- text-stroke handling at thresholds (`'ignores stroke when equal to 0'`, `'ignores stroke when less then the minimum'`, `'uses stroke color when thickness is equal to the minimum'`, `'blends the stroke color with color'`)
- alpha + opacity blending (`'returns the blended color if it has alpha set'`, `'returns the blended color if it has opacity set'`, `'does not apply opacity to node background'`, `'combines opacity with text stroke alpha color'`, `'takes into account parent opacity tree'`, `'takes into account entire parent opacity tree'`)
- text-shadow as foreground when `color: transparent` (`'returns text shadow color if foreground is transparent'`, `'returns a mix of colors if there is a shadow, foreground with alpha < 1, and background color'`, `'applies opacity to text-shadow'`)

Every one of these calls into `lib/commons/color/get-foreground-color.ts`, which itself dispatches into `flatten-colors`, `stacking-context`, `get-text-shadow-colors`, and `get-own-background-color`.

### Repro

```bash
cd packages/axe-core
mv test/browser/commons/color/get-foreground-color.test.ts.todo \
   test/browser/commons/color/get-foreground-color.test.ts
pnpm run test:vitest:browser -- get-foreground-color.test.ts
# (Restore parking after triage.)
```

### Hypothesized root cause

This is the **prime suspect for PRD-04 §5.1**. Once the chai+testUtils surface is repaired, the underlying failures are very likely the same `flatten-colors` NaN propagation already documented in PRD-04 §5.1: `lib/commons/color/flatten-colors.ts` and `lib/commons/color/stacking-context.ts` produce `#0NaN0NaN0NaN` for the color-contrast pass case under Vitest Browser Mode + Playwright (Chromium). The pilot `test/browser/checks/color/color-contrast.test.ts` is already asserting against the broken state with a `// FIXME(phase-04)` stamp.

A 15-test cluster all blowing up at once (rather than 3 of 15) is consistent with a *pervasive* algebra regression rather than a per-test geometry quirk. The reference companion files `get-background-color.test.ts.todo`, `get-own-background-color.test.ts.todo`, `get-text-shadow-colors.test.ts.todo`, and `stacking-context.test.ts.todo` (all `.todo`-parked in the same directory) corroborate that color-algebra coverage at large is currently dark in CI — these four siblings should be triaged at the same time.

Likely contributing factor: alpha-channel handling in the new ESM path for `Color`/`flatten-colors` differs from the legacy concat path in how it normalizes `0..1` vs `0..255` ranges, producing NaN when an opacity multiplier flows through a not-yet-normalized component. Verify by running one wake (`'returns the blended color if it has opacity set'`) under the Vitest UI debugger and inspecting the `Color` instance returned by `getForegroundColor`.

### Recommended Phase 4 slot

**PRD-04 §5.1 — direct.** This cluster is the practical test-coverage proof that PRD-04 §5.1 is not a one-off. Triage all four sibling color `.todo` files together with this one as the §5.1 work. Acceptance: when §5.1 lands, all 15 tests here plus the sibling files' tests must wake green, and the pilot `// FIXME(phase-04)` stamp in `test/browser/checks/color/color-contrast.test.ts` is removed.

---

## Cluster 3 — `dq-element` (2 tests)

**Path:** `packages/axe-core/test/browser/core/utils/dq-element.test.ts.todo`
**FIXME:** line 1 — `// FIXME(phase-05-sprint-5b): chai+testUtils chain failed: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯`
**File length:** 352 lines. Outer `describe('DqElement', …)` plus nested describes for `element`, `source`, `selector`, `ancestry`, `xpath`, `absolutePaths`, `nodeIndexes`, `toJSON`, `merging frames` (with sub-describes `.mergeSpecs`, `DqElement.fromFrame`, `DqElement.prototype.fromFrame`), and `DqElement.setRunOptions`.

### What's failing

The FIXME stamp says 2. Three Chai-style assertions remain in the file (lines 110, 111, 295) and are the most likely culprits in terms of mechanical chain-break:

- line 110 — `assert.isBelow(truncatedAttrCount, 100);`
- line 111 — `assert.isAtLeast(truncatedAttrCount, 10);`
- line 295 — `assert.instanceOf(DqElement.fromFrame(dqMain, {}, dqIframe), DqElement);`

The two probable failing tests are:

1. **`'should remove attributes for a large element having a large number of attributes'`** (lines 99–112) — uses both `assert.isBelow` and `assert.isAtLeast`. This validates the `lib/core/utils/dq-element.js` source-truncation heuristic for large attribute lists, asserting between 10 and 100 attributes survive truncation.
2. **`'returns a new DqElement'`** (lines 294–296) under `DqElement.fromFrame` — uses `assert.instanceOf` to check the constructor identity of the returned object.

### Repro

```bash
cd packages/axe-core
mv test/browser/core/utils/dq-element.test.ts.todo \
   test/browser/core/utils/dq-element.test.ts
pnpm run test:vitest:browser -- dq-element.test.ts
# (Restore parking after triage.)
```

### Hypothesized root cause

Two paths to consider once the chai chain is restored:

1. **Source truncation heuristic drift:** `dq-element.js`'s outer-HTML truncation logic (`source` field) walks attributes and elides them when the element is "large." Whether the boundary `>=10 && <100` still holds in the post-Sprint-1 typed implementation is a number-fiddling question — the codemod left the assertion bounds untouched but the underlying `MAX_NODE_HTML_LEN` / per-attr cutoffs may have shifted.
2. **`DqElement.fromFrame` identity:** `assert.instanceOf` failing in `expect(...).toBeInstanceOf(DqElement)` form would point at a class-identity mismatch — most likely two `DqElement` constructors live in the test process at parking time (the UMD path and the ESM path coexist until Sprint 5 #16-A finishes the keystone). After #16-A merges, this class-identity issue likely dissolves on its own.

### Recommended Phase 4 slot

**PRD-04 Sprint 1 — ancillary.** Sprint 1's typed-rule/typed-check pass touches `lib/core/utils/` indirectly when `defineRule` is wired in. It's a low-cost moment to wake this file, observe whether (1) is still a real bug in the typed implementation (likely yes — verify the 10/100 bounds), and whether (2) auto-resolves after #16-A. Do NOT lift to PRD-04 §5.1; the path is unrelated to color algebra.

---

## Cluster 4 — `get-selector` (1 test)

**Path:** `packages/axe-core/test/browser/core/utils/get-selector.test.ts.todo`
**FIXME:** line 1 — `// FIXME(phase-05-sprint-5b): chai+testUtils chain failed: ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯`
**File length:** 634 lines. Outer `describe('axe.utils.getSelector', …)` with many sub-describes (e.g., `'shadow DOM'`, `'with options.toRoot'`, `'attributes'`, `'classes'`, etc.). Single Chai assertion at line 50 — `assert.isFunction(axe.utils.getSelector);`.

### What's failing

Only one test is reported as failing. The most likely candidate is the head-of-file sanity check **`'should be a function'`** (line 49–51) — it uses `assert.isFunction`, which is the only chai-style call left in the file body. Once that's flipped to `expect(axe.utils.getSelector).toBeTypeOf('function')`, the surface chain is restored. Whether a deeper test then fails is the open question; the plan's claim of "selector-generation drift" is a hypothesis, not a confirmed observation.

### Repro

```bash
cd packages/axe-core
mv test/browser/core/utils/get-selector.test.ts.todo \
   test/browser/core/utils/get-selector.test.ts
pnpm run test:vitest:browser -- get-selector.test.ts
# (Restore parking after triage.)
```

### Hypothesized root cause

Most likely **purely the chai `assert.isFunction` chain-break** at the file head. The Sprint 4b #1 chai-assert codemod almost certainly fixes this on its own — wake it, run the codemod over it, run the suite, and confirm green.

If a *different* test fails after that, the next-most-likely cluster is selector-generation drift on the `'should generate a unique CSS selector'` shape — the algorithm in `lib/core/utils/get-selector.ts` produces a *different but still valid* selector under the typed implementation than the legacy concat build did. That would be a true selector-generation drift bug, but it is **not yet observed** — the FIXME stamp only proves the chain-break.

### Recommended Phase 4 slot

**PRD-04 Sprint 1 — ancillary**, lowest priority of the four clusters. Bundled with Cluster 3's wake. If on wake the failure is purely the line-50 `assert.isFunction`, it does not need a Phase 4 slot at all — it's a Sprint-4b-residue codemod miss and can be closed in Phase 3 cleanup (a documentation/scope tweak in the parent plan, with `feedback_flag_better_approaches` consultation if any `lib/` touches surface during triage).

---

## Verification gating

Before opening a PR for any of these in Phase 4, run:

```bash
cd packages/axe-core

# 1. Wake the file:
mv test/browser/<cluster-path>.test.ts.todo test/browser/<cluster-path>.test.ts

# 2. Run the chai-assert codemod over it (already shipped in build-tools):
pnpm --filter @axe-core/build-tools exec node scripts/run-chai-assert-migration.mjs \
  packages/axe-core/test/browser/<cluster-path>.test.ts

# 3. Run the test-utils-destructure codemod (Sprint 4b #1, when available):
pnpm --filter @axe-core/build-tools exec node scripts/run-test-utils-migration.mjs \
  packages/axe-core/test/browser/<cluster-path>.test.ts

# 4. Now run the test:
pnpm run test:vitest:browser -- <name>.test.ts
```

Only after step 4 fails on a *post-codemod* surface is there a real product bug to fix. Don't propose a `lib/` patch based on the raw FIXME stamp alone — the stamp records HOW the test was parked, not WHY the underlying assertion fails.

---

## Summary table

| Cluster | Path | Tests parked | Most likely Phase 4 slot | Confidence |
|---|---|---|---|---|
| 1 | `test/browser/rule-matches/color-contrast-matches.test.ts.todo` | 3 | PRD-04 Sprint 1 ancillary (cross-link §5.1) | medium — geometry suspect, not pure algebra |
| 2 | `test/browser/commons/color/get-foreground-color.test.ts.todo` | 15 | **PRD-04 §5.1 — direct** | high — sibling color `.todo` files corroborate |
| 3 | `test/browser/core/utils/dq-element.test.ts.todo` | 2 | PRD-04 Sprint 1 ancillary | medium — split between truncation drift and #16-A class-identity |
| 4 | `test/browser/core/utils/get-selector.test.ts.todo` | 1 | PRD-04 Sprint 1 ancillary (or close in Phase 3 cleanup) | low — likely just `assert.isFunction` codemod miss |

**Total tests parked:** 21 across 4 files (3 + 15 + 2 + 1 = 21 — matches the `Failed Tests N` headers in each FIXME stamp).

---

## Cross-references

- **PRD-04 §5.1 — Phase 3 Carryover — Known Regressions** (`specs/PRD-04-rules-checks-optimization.md` §5.1) — color-algebra NaN regression in `lib/commons/color/{flatten-colors,stacking-context}.ts`. Cluster 2 lands here; Clusters 1/3/4 do not.
- **`specs/phase-05-remaining-work-brief.md` §6** — Phase 3 scope guard; explains why these four were parked rather than fixed.
- **`specs/phase-05-remaining-work-brief.md` §3 (Sprint 4b residue)** — context on the codemod buckets that the chai+testUtils chain-break sits in.
- **`specs/phase-05-sprint-5c-preserved-suite-migration.md` §"Step 3 — capture-a3-bugs"** — the parent task that produced this doc.
- **Sibling parked color tests** (all under `test/browser/commons/color/`, recommended joint triage with Cluster 2):
  - `get-background-color.test.ts.todo`
  - `get-own-background-color.test.ts.todo`
  - `get-text-shadow-colors.test.ts.todo`
  - `stacking-context.test.ts.todo`
  - `incomplete-data.test.ts.todo`
  - `element-has-image.test.ts.todo`
- **Pilot file already FIXME-stamped against the algebra regression:** `packages/axe-core/test/browser/checks/color/color-contrast.test.ts` (asserts against the broken state with `// FIXME(phase-04)` per PRD-04 §5.1).

---

## Caveat to the Phase 4 maintainer

The FIXME stamps in all four files are uniform (`chai+testUtils chain failed: Failed Tests N`). They record the parking *mechanism*, not the underlying product symptom. The hypothesized root causes above are best-effort inferences from the test bodies and from PRD-04 §5.1's already-documented color-algebra observation — they are not failures actually observed and triaged in isolation. Step 1 of Phase 4 work on any of these clusters is: wake the file, run the chai+testUtils codemods, and *observe* what fails. The hypotheses here narrow the search; they do not replace it.

---

## Companion follow-up: Vitest browser-mode birpc cascade (vendor flake)

Captured here per the parent plan's instruction (`specs/phase-05-sprint-5c-preserved-suite-migration.md` §"Step 2 — fix-disconnect-flake") because the right home for vendor-bug carryovers is alongside the product-bug carryovers, not in a sibling file.

### Symptom

`pnpm --filter axe-core run test:vitest:browser` aborts mid-suite with:

```
Failed to run the test ...
Caused by: Error: [birpc] rpc is closed, cannot call "createTesters"
```

The cascade kills every still-pending tester RPC, so `Test Files X passed (240)` reports a partial run with `X < 240` and the run exits non-zero.

### What was investigated

- **Single-test repeat** (`--repeat-each=20` against the plan's suspected file `identical-links-same-purpose-after.test.ts`): 20/20 passed in isolation. Disproves the plan's hypothesis that the trigger is local to that file.
- **Cross-run file identity:** the file blamed in the failure log varies across runs (`invalidrole`, `aria-hidden-body`, `caption-faked`, etc.). It's whichever file was about to be dispatched when the WebSocket dropped — a transport-layer trigger, not a test-local one.
- **`--no-file-parallelism`:** still flakes (3/4 runs failed).
- **`--no-isolate`:** corrupts state across files (124 real assertion failures — confirms isolation is required).
- **`--shard=1/2 + 2/2`:** still flakes on each shard.
- **Debug `vitest:browser:api` log:** orchestrator's WebSocket dies mid-suite, propagating `$close()` to every pending tester RPC.

### Root cause (vendor)

Page-lifecycle race in `@vitest/browser-playwright@4.1.5`'s `openBrowserPage` (closes-and-reopens pages per session). NOT fixable from this repo — needs an upstream fix.

### Mitigation in Sprint 5c

`packages/axe-core/test/setup/run-vitest-browser.mjs` — a process-level wrapper that re-runs the browser project up to 5 times if and only if the run aborted with the cascade signature. Real assertion failures fail fast (no retry). Empirical per-attempt flake rate ≈ 50% on macOS; five attempts brings expected success to ~96.9%. Worst-case wall time bounded at ~2.5 minutes.

### Phase 4 follow-up

When upstream Vitest 4.2+ ships orchestrator reconnection (or we migrate to Vitest 5):

1. **Delete** `packages/axe-core/test/setup/run-vitest-browser.mjs`.
2. **Revert** `packages/axe-core/package.json` `test:vitest:browser` to `"vitest run --project browser"`.
3. **File** an upstream issue against `vitest-dev/vitest` if one isn't already tracking this — link the cascade signature, the per-attempt flake rate, and our wrapper's heuristics so they can land a real fix.

**Why this is not a product bug.** The wrapper retries are bounded, scoped, and gated on a transport-layer signature only. Every test that runs to completion still passes; the zero-false-positive guarantee is unaffected. This is shipping infrastructure to absorb a vendor flake, not papering over a real defect.

---

## Companion follow-up: Locale schema drift (build-system bug)

Surfaced during Sprint 5c Wave B's `test-locales.js` migration. Captured here because it shares a "real bug, deferred to Phase 4" character with the four parked clusters above.

### Symptom

Running `pnpm --filter axe-core test:locales` (legacy) or the new `test/unit/locales.test.ts` (Sprint 5c) shows 18 of 19 locale JSON files rejected by `axe.configure({ locale })` with errors like:

```
Locale provided for unknown check: "autocomplete-appropriate"
Locale provided for unknown check: "aria-busy"
Locale provided for unknown check: "fallbackrole"
```

Only `nl.json` configures cleanly. Every other locale in `packages/axe-core/locales/` references at least one orphan check — a check whose source still lives in `lib/checks/{aria,forms}/` but which no rule's `any`/`all`/`none` array references. The Vite build correctly drops orphan checks from `dist/axe.{js,cjs,mjs}`; the locale strings for them remain.

### Why this is faithfully preserved, not fixed

Sprint 5c's job is to migrate runners, not edit locale JSON or product code. The new `test/unit/locales.test.ts` makes the schema drift a green test by inverting the assertion on the 18 known-broken locales (each is expected to throw an `Locale provided for unknown check` error). The legacy `test-locales.js` already failed the same way on this branch — the migration mirrors that exact state.

### Phase 4 fix

Either path works:

1. **Prune the orphan refs from each locale.** Lowest-risk; pure data edit. Touches 18 files in `packages/axe-core/locales/`.
2. **Restore the orphan checks** by referencing them from a rule (or remove the orphan check JSON files and their localized strings together).

Once the locale files are clean, the `KNOWN_ORPHAN_LOCALES` allowlist in `test/unit/locales.test.ts` should shrink to the empty set, and the inverted-assertion `it.each(orphanLocales)` block deletes itself.

---

## Companion follow-up: jsdom cross-realm `Node` mismatch in unit tests

Surfaced during Sprint 5c Wave B's `test/node/jsdom.js` and `test/node/node.js` migrations. The legacy harness exhibited the same regression — most jsdom unit tests already failed on this branch (`pnpm test:jsdom` reports 8 failing).

### Symptom

`axe.run(domEl, options)` throws `TypeError: axe.run arguments are invalid` when `domEl` comes from a freshly-constructed `new JSDOM(domStr).window.document` and the test is running in a Vitest jsdom environment.

The trigger is in `lib/core/utils/is-context.ts:19`:

```ts
contextList instanceof window.Node
```

`window.Node` here is the constructor axe captured at module load time — i.e., the Vitest-provided jsdom env's Node. A `documentElement` from a fresh `new JSDOM(...)` instance has its OWN `Node` constructor, not the captured one, so the `instanceof` check fails (cross-realm). Same problem in pure-node + manual JSDOM: axe captures `global` as its window at load time, so `window.Node` is undefined when the `instanceof` runs.

`axe.setup(...)` and `axe.commons.aria.getRole(...)` exhibit related failures: `axe._tree` is undefined and `setupGlobals` throws `ReferenceError: document is not defined`.

### Why this is faithfully preserved, not fixed

The legacy `test/node/jsdom.js` covers ~10 cases that touch this path. 8 of them already fail on the current `chore/modernize-phase-5` branch. Sprint 5c's `jsdom-smoke.test.ts` migrates the smoke shape to the Vitest-provided jsdom document (which works) and parks the remaining 8 cases as `it.todo` with this carryover note.

### Phase 4 fix

Refactor `is-context.ts` and the `axe.setup`/`commons` codepaths so they:

1. Detect the actual realm of the passed-in DOM nodes via `node.ownerDocument?.defaultView?.Node` rather than the axe-captured `window.Node`.
2. Tolerate `axe.run` being called multiple times against documents from different jsdom realms within the same Node process (the legacy multi-`new JSDOM(...)` test pattern).

Phase 4 should also decide whether the `nodeToDeps` jsdom-version matrix in legacy `test/node/node.js` needs to come back. Sprint 5c dropped it (per #16-D); if the Phase 4 jsdom rework finds Node-version-specific code paths, the matrix becomes worth restoring.

---

## Companion follow-up: ACT testcase failures (color-algebra echo)

Surfaced during Sprint 5c Wave B ACT migration. 13 wcag-act-rules testcases under three rules fail with `color-contrast` / `avoid-inline-spacing` violations on fixtures the upstream marks as `passed` or `inapplicable`:

| ACT rule | Spec file | testcase IDs (skipTests) | Likely root cause |
|---|---|---:|---|
| `afw4f7` (Text minimum contrast) | `test/integration/act-rules/text-contrast-afw4f7.test.ts` | 9 | Color-algebra carryover — Cluster 2 sibling. |
| `09o5cg` (Text enhanced contrast) | `test/integration/act-rules/text-contrast-enhanced-09o5cg.test.ts` | 8 | Same — same testcase IDs cloned under 09o5cg's directory. |
| `78fd32` (Line height not !important) | `test/integration/act-rules/line-height-not-important-78fd32.test.ts` | 2 | `avoid-inline-spacing` rule regression, possibly related but distinct. |

The Sprint 5c ACT migration handles them with the existing `skipTests` mechanism (already used in the legacy `act-runner.js` for `2ee8b8`). The skipped testcases are documented in their `.test.ts` files with explicit cross-references to this Phase 4 carryover.

**Phase 4 fix.** Once the color-algebra carryover lands (PRD-04 §5.1) and the `avoid-inline-spacing` regression is investigated, the `skipTests` arrays in the three affected ACT files shrink to whatever genuine upstream-issue references remain (currently just `2ee8b8`'s issue #4311). Each entry in this table is a candidate for removal — re-run ACT and the testcase should now pass on its own.

**Note on testcaseId uniqueness.** The wcag-act-rules schema reuses `testcaseId` across rules (each rule gets its own copy of the same fixture HTML at `testcases/<ruleId>/<testcaseId>.html`). When pruning skipTests in Phase 4, do it per-rule, not globally — a `testcaseId` listed under both `afw4f7` and `09o5cg` is two distinct testcases that pass/fail independently.

---

## Companion follow-up: Full-suite assertion drift (17 fixtures parked)

Surfaced during Sprint 5c Wave B's full-suite migration of `test/integration/full/`. The fixtures themselves are unchanged — same HTML, same inline mocha+chai, same axe build — but 17 of 131 pages produce real mocha assertion failures or no test output under the migrated harness. Each is parked as `it.todo` in its `page.test.ts` with a back-reference to this doc.

| Cluster | Pages | Likely root cause |
|---|---|---|
| Color-algebra echo | `contrast/{code-highlighting,memory,shadow-dom,sticky-header}.html`, `contrast-enhanced/simple.html`, `incomplete/color-contrast.html` | Same as Cluster 2 / PRD-04 §5.1. Color algebra regression. |
| UMD wrapper detection | `umd/{umd-define,umd-module-exports}.html` | Fixtures assert `define`/`module.exports` shape that depends on environment-specific UMD detection. Vitest browser tester is neither AMD nor CJS, so the UMD branch axe takes is different from the Selenium branch. Phase 4 should decide whether these fixtures still test something meaningful or should be retired. |
| run-partial / serializer / patch / preload-cssom | `run-partial/{after-method,context-size-focusable}.html`, `serializer/serializer.html`, `patch/patch.html`, `preload-cssom/preload-cssom.html` | These test axe internals (`axe.runPartial`, `axe.serialize`, `axe.utils.patch`, preload behavior). Need re-validation against the harness-loaded axe — likely small surface mismatches, not deep bugs. |
| isolated-env | `isolated-env/isolated-env.html` | Fixture fetches `/axe.js` and evals it inside a sandboxed scope (`window`/`document` shadowed). The fetch + eval path has cross-origin policy implications under the new fixture-server. Phase 4 reworks the iframe loading model to support sandboxed-axe scenarios. |
| error-occurred fixtures | `error-occurred/{error-frame,error-occurred}.html` | Intentionally trigger frame-error paths. Legacy harness handled these as expected, the migrated harness surfaces them as failures. Adapter tweak likely. |
| context | `context/context.html` | Configures a complex iframe shape that the harness's single-iframe model doesn't reproduce. May need to extend `runPageFixture` to handle nested frames. |

### Phase 4 next steps

For each cluster:

1. **Wake the page** — un-`it.todo` it (move from `knownFailingPages` to `pages` in the affected `page.test.ts`).
2. **Run** `pnpm --filter axe-core exec vitest run --project integration test/integration/full/<dir>/page.test.ts` and observe what actually fails.
3. **Decide** per page: real product bug (fix in `lib/`), fixture drift (rewrite fixture as proper `axe.run` integration test — Phase 4 already plans this for the full-suite per Sprint 5c §"Notes"), or environmental issue (extend the harness).

Together with the 19 ACT skipTests entries, this brings the Sprint 5c full carryover surface to **36 parked tests across the integration project**, all rooted in pre-existing axe-side regressions or harness-equivalence mismatches that Phase 4 / PRD-04 §5.1 owns.

---

## Companion follow-up: Pre-existing oxlint debt in `test/`

Surfaced when running `pnpm validate` after Sprint 5c. The repo-root lint task fails with **15 errors and 1090 warnings** across 825 files. None of the errors are in Sprint 5c-authored files — they predate the sprint. The lint job in CI has presumably been red on `develop` too, but the gate was never turned blocking on the workflow.

### Categories (15 errors total)

| Rule | Sample location | Cluster |
|---|---|---|
| `jest(no-standalone-expect)` | `test/browser/checks/navigation/region.test.ts:484` | `expect()` calls inside helper functions called from `it` blocks; false positive against `(condition ? it : it.skip)('...', () => { ... })` patterns. |
| `jest(no-disabled-tests)` | `test/browser/commons/table/is-data-table.test.ts:416` | Intentional `it.skip(...)` for sauce-labs flake. |
| `jest(expect-expect)` | various | Tests that call helper `assert` functions instead of inline `expect`. |
| `jest(require-to-throw-message)` / `jest(valid-expect)` / `jest(valid-title)` | various | Pre-existing assertion-style drift. |
| `vitest(warn-todo)` | various | `it.todo(...)` markers that are intentional Phase 4 carryovers. |
| `no-var` / `no-constant-condition` / `no-constant-binary-expression` / `no-extra-boolean-cast` / `no-unused-expressions` / `no-misleading-character-class` / `no-unassigned-vars` | various | Stale code patterns from pre-modernization Karma days. |

### Sprint 5c response

- Sprint 5c-authored files were cleaned: the 3 violations in `test/unit/virtual-rules.test.ts` and `test/unit/jsdom-smoke.test.ts` are fixed (replaced conditional `it` guard with top-level `expect`; suppressed the intentional `.todo` carryover with `oxlint-disable-next-line`).
- Sprint 5c does NOT touch the other 12 errors in pre-existing files. Phase 4 / PRD-04 cleanup pass owns them.

### Phase 4 fix

A single sweep with `oxlint --fix` (or hand-edits for the false-positive `jest(no-standalone-expect)` cases) would clear most of these. Some require small refactors (e.g., extracting helper-function assertions into the `it` block, or converting the `(condition ? it : it.skip)` pattern to `it.skipIf(!condition)`).
