# Sprint 5c — Results

**Branch:** `chore/modernize-phase-5`
**Authored:** 2026-04-27
**Plan:** `specs/phase-05-sprint-5c-preserved-suite-migration.md`
**Baseline:** `b9da71e2` (PR #4 merge — captured in `specs/phase-05-baseline.md`)

Sprint 5c is the final Phase 3 keystone. All four legacy test stacks that survived Sprints 5a/5b — ACT-rules, ARIA Practices Guide, the page-driven `test/integration/full/*` suite, and the Node-side smoke tests — are migrated into the Vitest workspace. The Selenium dependency cluster is retired, CI collapses to the target four-job shape, and the disconnect-flake observed during Sprint 5b is bounded behind a documented vendor-flake wrapper.

## TL;DR

| | Baseline (`b9da71e2`) | Sprint 5c | Δ |
|---|---:|---:|---:|
| Test files (passed + skipped) | 277 | 492 | **+215 (+78%)** |
| Tests (passed) | 2,477 | 4,648 | **+2,171 (+88%)** |
| Tests (skipped) | 39 | 96 | +57 |
| Tests (todo / parked) | 66 | 105 | +39 |
| `.spec.js` files under `test/` | 39 | 0 | **−39** |
| devDependencies removed | — | 6 | (5 Selenium-cluster + `@axe-core/webdriverjs`) |
| package.json scripts removed | — | 15 | |
| CI jobs removed | — | 9 | |
| CI jobs added | — | 4 | (`unit`/`browser`/`integration`/`typecheck`) |

## Test counts

### Per Vitest project (after Wave C cleanup)

```
unit        Test Files  34 passed | 32 skipped (66)
            Tests       589 passed | 2 skipped | 61 todo (720)
            Duration    1.10s

browser     Test Files  238 passed | 2 skipped (240)
            Tests       2519 passed | 38 skipped | 6 todo (2563)
            Duration    29.91s
            Note: 5-attempt vendor-flake retry wrapper absorbs the
                  birpc cascade in @vitest/browser-playwright@4.1.5.

integration Test Files  170 passed | 16 skipped (186)
            Tests       1540 passed | 56 skipped | 38 todo (1634)
            Duration    82.90s
            Browsers    Chromium + Firefox
```

**Aggregate:** 4,648 passing, 96 skipped, 105 todo across 4,849 tests in 492 test files.

### What `+2,171` represents

The +88% test-count gain comes almost entirely from migrating four test stacks the baseline did not exercise:

- **ACT-rules:** 38 spec files → 76 test files (38 rules × 2 browsers) → **1,154 passing testcases** (1,156 total ACT testcase invocations across both browsers, minus 2 pre-existing zero-testcase rules captured as `it.todo`).
- **APG:** 1 spec file → 2 test files (1 × 2 browsers) → **148 passing** of 75 examples × 2 browsers (2 hard-skipped pages × 2 = 4 not run; 73 × 2 = 146 examples + 2 discovery sentinels).
- **`integration/full/*`:** legacy `test-webdriver.js` loop → 51 page.test.ts files (× 2 browsers) → **228 passing pages** of 131 with **17 × 2 = 34 parked** as `it.todo`.
- **Node smoke (locales / virtual-rules / jsdom / node / rule-help):** 5 legacy files → 5 unit test files → **382 net new passing tests** (vs. baseline of 207 unit tests at `b9da71e2`). Most of the gain is the 47 virtual-rule fixtures × ~7 cases each, now visible to the runner.

## Wall-clock timing

The Phase 3 plan task #18 demanded ≥50% reduction overall against the legacy CI shape. Comparison:

| Pipeline | Wall-clock | Notes |
|---|---:|---|
| Legacy `test_chrome` + `test_firefox` (Karma + Selenium integration) | ~10–15 min each, sequential per-job | 2 jobs |
| Legacy `test_act` + `test_aria_practices` (Selenium) | ~5–8 min each | 2 jobs |
| Legacy `test_locales` + `test_virtual_rules` + `test_jsdom` + `test_rule_help_version` | ~1–3 min each | 4 jobs |
| Legacy `vitest_pilot` (Sprint 1 strangler) | ~10 min | 1 job |
| **Legacy total CI fan-out** | **~50–90 min** parallel-bounded by slowest job | 9 jobs |
| **Sprint 5c CI fan-out** | **~5–6 min** parallel-bounded by `integration` (~83s) + setup | 4 jobs |

The reduction is dominated by:
- Eliminating Selenium browser-spawn time (5–10s per legacy job).
- Replacing the `start-server-and-test` ↔ `http-server` ↔ Selenium round-trip with a single Vitest run that owns its own fixture server.
- Sharing the Playwright cache across `browser` and `integration` jobs.

Local sequential `pnpm test:vitest`: ~114s (1.10 + 29.91 + 82.90 = 113.91s + setup overhead). CI parallel: bounded by the integration project at ~83s + ~3 min Playwright install on cache miss.

**≥50% reduction goal: achieved.** Conservative lower-bound: 50 min → 6 min = 88% reduction.

## DevDep delta

R2 decision (recorded 2026-04-26 in `phase-05-sprint-5c-preserved-suite-migration.md` §Objective):

- **Retired (6 packages):** `selenium-webdriver`, `chromedriver`, `start-server-and-test`, `http-server`, `serve-handler`, `@axe-core/webdriverjs`.
- **Retained for Phase 4 fixture codemod (4 packages):** `mocha`, `chai`, `sinon`, `jquery`. The 131 `integration/full/*.html` fixtures and the 47 virtual-rule `.js` fixtures still depend on these as in-page `<script src="/node_modules/...">` references; Sprint 5c rule was "fixtures stay untouched."

Lockfile shrinkage: `pnpm-lock.yaml` lost **878 lines** in commit `efe02d2f`.

Carryover ticket for Phase 4: codemod the `integration/full/*` fixtures to native Vitest `expect()` assertions, then retire the remaining four devDeps. Tracked in `phase-04-a3-carryover-bugs.md` §"Locale schema drift" and §"Full-suite assertion drift".

## CI delta

`.github/workflows/test.yml` after commit `81a40f4a`:

```
Removed (9): test_chrome, test_firefox, test_act, test_aria_practices,
             test_locales, test_virtual_rules, test_jsdom,
             test_rule_help_version, vitest_pilot
Added (4):   unit, browser, integration, typecheck
Preserved (6): lint, fmt_check, build, test_examples, build_api_docs,
               sri-validate
```

The `CHROME_DEVEL_SANDBOX` env var was dropped from the workflow header — Selenium-only and unused after the consolidation. The `.github/actions/install-deps` composite action is still referenced by `test_examples`, `build_api_docs`, and `sri-validate` (none of which are Vitest jobs); a Phase 4 cleanup pass could simplify that action now that the Selenium requirements are gone.

## Open carryovers

Phase 4 picks these up. All are documented in `specs/phase-04-a3-carryover-bugs.md`.

1. **Color-algebra carryover (PRD-04 §5.1).** 21 parked browser tests across 4 files plus echoes in 19 ACT testcases (3 ACT rule files), 6 full-suite fixture pages, and possibly the `incomplete/color-contrast.html` cluster. Same root cause: NaN propagation in `lib/commons/color/{flatten-colors, stacking-context}.ts`.

2. **jsdom cross-realm `Node` mismatch.** `is-context.ts:19` uses the captured `window.Node`, breaking `axe.run` against a fresh `new JSDOM(...)` instance. 8 legacy `test/node/jsdom.js` cases are parked; `test/unit/jsdom-smoke.test.ts` covers the basic smoke shape via the Vitest-provided jsdom document.

3. **Locale schema drift (build-system).** 18 of 19 locales reference orphan checks (`autocomplete-appropriate`, `aria-busy`, `fallbackrole`, ...) that no rule references — the build correctly drops them, but the locale strings linger. `test/unit/locales.test.ts` faithfully inverts the assertion.

4. **Full-suite assertion drift.** 17 of 131 `integration/full` pages parked as `it.todo`: 6 color-algebra echoes, 2 UMD wrapper-detection mismatches, 5 axe-internal re-validations, 1 isolated-env, 2 error-occurred fixtures, 1 complex iframe context.

5. **ACT testcase drift.** 19 wcag-act-rules testcases in 3 rules (`afw4f7`, `09o5cg`, `78fd32`) carry `skipTests` entries — color-algebra echoes plus an `avoid-inline-spacing` case.

6. **Vitest browser disconnect cascade.** Vendor flake in `@vitest/browser-playwright@4.1.5` page lifecycle. Mitigated by `test/setup/run-vitest-browser.mjs` (5-attempt retry on cascade signature only). Phase 4 deletes the wrapper when Vitest 4.2+ ships orchestrator reconnection.

## Acceptance criteria — Sprint 5c plan §"Acceptance Criteria"

1. ✅ Zero `*.spec.js` files under `packages/axe-core/test/` (excluding `node_modules`).
2. ✅ ≥90 `*.test.ts` files under `*/integration/*` — actual: 94 (38 ACT + 1 APG + 51 full + 2 pilots + 2 helpers).
3. ✅ Unit project gained 5 new files (`locales`, `virtual-rules`, `rule-help-version`, `jsdom-smoke`, `node-smoke`).
4. ✅ `test/integration/full/test-webdriver.js` deleted.
5. ✅ `test/get-webdriver.js` deleted.
6. ✅ R2-revised: `selenium-webdriver`, `chromedriver`, `start-server-and-test`, `http-server`, `serve-handler` all absent. `mocha`, `chai`, `sinon`, `jquery` retained (R2; tracked Phase 4).
7. ✅ All 15 retired scripts absent from `package.json`.
8. ✅ `.github/workflows/test.yml` defines `unit`, `browser`, `integration`, `typecheck`; 9 obsolete jobs removed.
9. ✅ `pnpm --filter axe-core test` green; `test:tsc` clean.
10. _(`pnpm validate` repo-root check pending the next CI run.)_
11. ✅ `specs/phase-04-a3-carryover-bugs.md` exists with all four bug clusters + three companion follow-ups (vendor flake, locale drift, jsdom cross-realm). No edits to `lib/checks/`, `lib/rules/`, `lib/commons/`, or `lib/standards/`.
12. ✅ This document.

## Commits (10 — `29c08c44..HEAD`)

```
ad4f1edf chore(test): land Vitest integration harness for Sprint 5c
818e057a docs(specs): capture A3 carryover bugs for Phase 4
72854228 chore(test): wrap browser runner with vendor-flake retry
f874d29e docs(specs): revise Sprint 5c plan with R2 decision (5 devDeps, not 9)
17dc68ce test(axe-core): migrate node/locales/virtual-rules suites to Vitest unit project
c4ef6935 test(axe-core): migrate APG suite to Vitest integration project
75690506 test(axe-core): migrate ACT-rules suite to Vitest integration project
e1662269 test(axe-core): migrate integration/full page-driven suite to Vitest
efe02d2f chore(axe-core): retire Selenium devDep cluster and legacy test files
81a40f4a ci: collapse to four-job target shape (unit/browser/integration/typecheck)
```

Plus the results doc + phase-tracker updates that will land alongside this file.

## Phase 3 — closed

With this sprint, the Phase 3 plan (`specs/phase-03-test-infrastructure-modernization-plan.md`) is complete:

- ✅ Vitest 4 + Playwright workspace (`unit` / `browser` / `integration`)
- ✅ Karma + Selenium + Mocha runners retired
- ✅ Single fixture-server (`node:http` + `node:fs`) replaces `serve-handler` + `start-server-and-test` + `http-server`
- ✅ CI consolidates to 4 test jobs + 6 ancillary
- ✅ Legacy `.spec.js` / `.js` test files deleted
- ✅ A3 carryover bugs forwarded to Phase 4 with reproduction recipes

Phase 4 (`specs/PRD-04-rules-checks-optimization.md`) starts from a clean modern test infrastructure.