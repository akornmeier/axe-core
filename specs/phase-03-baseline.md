# Phase 3 — Legacy Karma/Mocha Test Baseline

_Captured: 2026-04-25, branch `chore/modernize-phase-03` at commit `ff3a4190`_

## Environment

- Node version: `v24.14.0`
- pnpm version: `9.15.4`
- Platform: `Darwin 25.4.0 arm64` (macOS)
- Chrome version: Google Chrome `147.0.7727.102` at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (used as `CHROME_BIN`)

## TL;DR

**The legacy Karma + Mocha pipeline does not produce passing test counts against the Phase 2 build at this commit.** Every Karma shard and every Mocha-only suite that depends on the bundled `axe.js` crashes during initialization. This baseline therefore captures *what the pipeline does today*, not a count of green tests. The numbers below are what subsequent migration steps will compare against — both the file-count inventory of legacy specs and the pre-existing failure modes that Sprint 3 must investigate before declaring parity.

Two distinct upstream regressions surface here:

1. **`tsc` no longer compiles** the generated `lib/core/generated/default-config.ts` and `lib/core/index.ts` (missing `node` types after Phase 2 dependency cleanup). `pnpm run test` aborts at the `test:tsc` step before any test runs. We bypassed it by invoking each `test:unit:*` shard directly.
2. **The Phase 2 UMD bundle does not expose `axe._audit` on the global `axe`.** The bundle declares `var axe = {};` at the top and mutates it via `load(default_config_default)` (which sets `axe._audit = new Audit(...)` on the *local* `axe`), but the UMD wrapper finishes with `global.axe = factory()` — overwriting the global with the returned `axeExport` object that lacks `_audit`. Every legacy test (Karma `testutils.js:18` and Mocha `test-locales.js`, `test-virtual-rules.js`, `test/node/jsdom.js`) trips on this immediately.

Sprint 2/3 cannot claim parity until both are addressed (or the affected specs are migrated to consume the ESM build directly, which is the planned post-migration entry point anyway).

## Per-shard results

All numbers below are taken from the per-shard logs at `/tmp/baseline-*.log`.

| Shard                  | Passed | Failed | Pending | Status                                                     | Wall-clock |
| ---------------------- | -----: | -----: | ------: | ---------------------------------------------------------- | ---------: |
| test:unit:core         |      0 |      0 |       0 | Karma ERROR — `Cannot read properties of undefined (reading 'checks')` at `test/testutils.js:18` (0 of 0 executed) | 2.92s |
| test:unit:commons      |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.52s      |
| test:unit:rule-matches |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.47s      |
| test:unit:checks       |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.44s      |
| test:unit:api          |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.47s      |
| test:unit:integration  |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.46s      |
| test:unit:virtual-rules |     0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.42s      |
| **Total Karma unit**   |      0 |      0 |       0 | All 7 shards fail to bootstrap before any spec executes    | **17.7s**  |
| test:locales           |      1 |     18 |       0 | Mocha — locale JSON validation throws on every locale; `assert.doesNotThrow` flips them all to failures. Root cause: `axe.configure({ locale })` rejects every locale because the bundle's `axe._audit.checks` map does not contain the IDs the locale files reference (e.g. `autocomplete-appropriate`, `aria-busy`). | 0.54s |
| test:virtual-rules     |      1 |    340 |       0 | Mocha — `runVirtualRule` crashes inside `getEnvironmentData` → `getOrientation` because `window.screen` is unavailable in the Node mocha host. Pre-existing dependency on a browser-shim. | 0.29s |
| test:rule-help-version |      1 |      0 |       0 | Mocha — single network-driven test passes (verifies axe-core docs URLs for the current major version). | 5.54s |
| test:jsdom             |      0 |      9 |       0 | Mocha — every spec throws `ReferenceError: document is not defined` at `dist/axe.js:31562` (`setupGlobals`). The Phase 2 ESM/CJS build assumes a browser global rather than reading from the JSDOM window passed in. | 0.48s |

### `pnpm --filter=axe-core run test` end-to-end

`pnpm --filter=axe-core run test` aborts at `test:tsc` before launching any shard:

```
lib/core/generated/default-config.ts(3,52381): error TS7006: Parameter 'it' implicitly has an 'any' type.
lib/core/generated/default-config.ts(6,47): error TS7006: Parameter 'it' implicitly has an 'any' type.
lib/core/index.ts(32,10): error TS2591: Cannot find name 'module'. Do you need to install type definitions for node? …
lib/core/utils/uuid.ts(61,14): error TS2591: Cannot find name 'Buffer'. …
```

End-to-end wall-clock for the failing `pnpm run test` invocation: **1.71s**.

## Per-directory test counts (file inventory)

Karma never executed a spec, so the `Tests` column reports the count of legacy `.js` test files (or `.json` for the integration-rules shard) that *would* have been picked up by `karma.conf.js` given each `testDirs=` arg. The `karma.conf.js` glob mappings are:

- `core`, `commons`, `rule-matches`, `checks` → `test/<dir>/**/*.js`
- `integration`            → `test/integration/**/*.json`
- `virtual-rules`          → `test/integration/virtual-rules/**/*.js`
- `api`                    → `test/integration/api/**/*.js`

| Directory (Karma `testDirs`) | Legacy spec files |
| ---------------------------- | ----------------: |
| test/core                    |               119 |
| test/commons                 |               145 |
| test/rule-matches            |                44 |
| test/checks                  |               112 |
| test/integration (rules JSON) |               96 |
| test/integration/virtual-rules |              47 |
| test/integration/api         |                 1 |
| **Total Karma-bound specs**  |           **564** |

Mocha-only suites (out of band of `karma.conf.js`):

| File                                | `it()` blocks |
| ----------------------------------- | ------------: |
| test/test-locales.js                | 1 dynamic block per locale × 19 locale files = 19 |
| test/test-virtual-rules.js          | 341 (1 passed + 340 failed before crashes prevent further) |
| test/test-rule-help-version.js      | 1 |
| test/node/jsdom.js                  | 9 |

These file/spec totals are the *floor* against which Sprint 3 / Sprint 4 must prove no count regression once the Vitest port lands. Failing-but-counted specs (e.g. `test:virtual-rules`'s 341) need to be either fixed or explicitly quarantined before the migration proceeds.

## Total wall-clock (locally measured)

- Combined Karma unit suite (all 7 shards, all aborting): **~17.7s**
- Mocha scripts combined (locales + virtual-rules + rule-help-version + jsdom): **~6.85s**
- **Grand total of attempted invocations**: **~24.6s**

These numbers reflect the abort-before-running behavior; they are not a meaningful runtime baseline. Once the upstream `_audit`/`document` regressions are resolved (Sprint 2 build-fix work), wall-clock should be recaptured against a green run before Vitest comparisons begin.

## Coverage

No coverage instrumentation existed in the legacy pipeline (no `nyc`/`c8`/`istanbul` config, no `--coverage` plumbing in `karma.conf.js` or in any `mocha` invocation). Sprint 4 will set v8 thresholds at **85/80/85/85** (statements/branches/functions/lines) using Vitest's built-in v8 provider.

## Not measured at baseline

- `test:act` — Selenium-driven against `wcag-act-rules`; rerun under Vitest in Sprint 3 conformance migration.
- `test:apg` — Selenium + `start-server-and-test`; replaced by Playwright in Sprint 3.
- `test:integration:chrome` / `test:integration:firefox` — Selenium WebDriver; replaced by Playwright in Sprint 3.
- `test:examples` and `test:node` — out of scope for unit-baseline comparison.

## Build prerequisite

Karma serves `axe.js` from `packages/axe-core/` (per `karma.conf.js` `basePath: '../'` and `files: [..., 'axe.js', ...]`). The Phase 2 Vite build emits artifacts to `packages/axe-core/dist/`. To make Karma find them, this baseline run copied:

```
cp dist/axe.js     ./axe.js
cp dist/axe.min.js ./axe.min.js
```

inside `packages/axe-core/` before running. Sprint 2 should either update `karma.conf.js` paths or formalize a pre-test copy step until the test infrastructure is migrated and the legacy paths are retired.

## Raw logs

Saved at `/tmp/baseline-*.log` on the run host (not committed):

- `/tmp/baseline-unit.log` — output of the failing `pnpm --filter=axe-core run test` invocation
- `/tmp/baseline-unit-core.log`, `/tmp/baseline-unit-commons.log`, `/tmp/baseline-unit-rule-matches.log`, `/tmp/baseline-unit-checks.log`, `/tmp/baseline-unit-api.log`, `/tmp/baseline-unit-integration.log`, `/tmp/baseline-unit-vrules.log`
- `/tmp/baseline-locales.log`, `/tmp/baseline-virtual-rules.log`, `/tmp/baseline-rule-help.log`, `/tmp/baseline-jsdom.log`

## Action items handed off to Sprint 2 / 3

1. Fix `tsc` errors in `lib/core/generated/default-config.ts` (param `it` typed as `any`) and the `lib/core/index.ts` / `lib/core/utils/uuid.ts` `module`/`Buffer` references (re-add `@types/node` + `"types": ["node"]` for the Node-targeted entry, or split tsconfigs).
2. Fix the Phase 2 UMD wrapper so that `_audit` (and the Node-environment shims used by `setupGlobals`) survive on the exported global. Without this, neither the legacy Karma pipeline nor the upcoming Vitest-browser pipeline can consume `axe.js` end-to-end.
3. Resolve the locale-vs-bundle check-id drift (locale files name checks like `autocomplete-appropriate` and `aria-busy` that the new bundle no longer registers — either restore them or update the locale files).
4. Ensure `karma.conf.js` `axe.js` lookup is taken care of (relocate, copy, or update paths) so a parity dual-run is possible during Sprint 2.
