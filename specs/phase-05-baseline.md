# Phase 5 — Pre-Sprint-5 Baseline

Captured 2026-04-25 at branch `chore/modernize-phase-5`, HEAD SHA `b9da71e2` (also the Phase 3 merge SHA — PR #4).

This snapshot is the reference point against which the Sprint 5 deletion (#16-A) and the regression validation (#19) compare.

## Vitest test counts (`pnpm --filter axe-core run test:vitest`)

```
Test Files  244 passed | 33 skipped (277)
     Tests  2477 passed | 39 skipped | 66 todo (2650)
   Duration 15.39s (transform 5.78s, setup 2.11s, import 8.91s, tests 936ms, environment 2.55s)
```

The 33 skipped files are predominantly `.test.ts.todo` rename-protected stubs and the two `.skip` blocks (`link-in-text-block.test.ts` × 13, `heading-order.test.ts` × 24) tracked as PRD-04 §5.1 carryovers.

## `.test.ts.todo` count by directory

```
Total: 148 (all under packages/axe-core/test/browser/)

  66 browser/core
  58 browser/commons
  24 browser/rule-matches
```

(No `.test.ts.todo` files under `browser/checks/` — the 74 check tests still on the UMD-hybrid path are `.test.ts` files using `getCheckEvaluate(id)`; they flip to `getCheckEvaluateESM` mechanically once #16-A removes the bundle.)

## TypeScript

`pnpm --filter axe-core run test:tsc` — clean (exit 0).

## Karma smoke

The `b9da71e2` merge commit (PR #4) is the last green Karma run on `develop`. Karma is required to remain green until task #5 (#16-A) deletes it; per the plan, the deletion itself is the only operation allowed to break Karma. No fresh Karma run is captured here because the merge SHA is authoritative.

## Dependency snapshot

`pnpm --filter axe-core list --depth=0` written to `specs/phase-05-deps-before.txt` (60 lines). Diff against `phase-05-deps-after.txt` after #16-A to confirm the 17 removals.

The 17 devDependencies slated for removal in #16-A:

```
karma, karma-chai, karma-chrome-launcher, karma-firefox-launcher,
karma-ie-launcher, karma-mocha, karma-sinon, karma-spec-reporter,
mocha, chai, sinon, http-server, jquery, start-server-and-test,
selenium-webdriver, chromedriver, serve-handler
```

## CI workflow snapshot

`.github/workflows/test.yml` currently runs (per commit `62f4baaf` + `0d788eeb`):

- `vitest_pilot` / unit / browser / integration / typecheck — Vitest-driven jobs (target shape per PRD-03 §2.6)
- `test_node` — legacy Node matrix (`[20, 22, 24]`) — slated for removal in #16-D

Playwright cache key references the **root** `pnpm-lock.yaml` (verified during Sprint 4).

## Notes on this baseline

- The 2477 passing tests count is the integrity floor for Sprint 5: any drop after #16-A must be explained in `specs/phase-03-results.md`.
- `.test.ts.todo` count of 148 is the input set for the two Sprint 4b codemods (Tasks 2 & 3 of `phase-05-execution-plan.md`). Combined coverage of both codemods is ~72 files (~64 testUtils + ~8 fixture). The remainder breaks down per the brief §3 table.
- Vitest wall-clock of 15.39s is much faster than the Karma baseline (recorded in `specs/phase-03-baseline.md`) — this baseline is for *regression* purposes, not the §18 perf comparison.
