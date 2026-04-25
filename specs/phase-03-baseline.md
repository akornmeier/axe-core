# Phase 3 — Legacy Karma/Mocha Test Baseline

_Re-baselined: 2026-04-25, branch `chore/modernize-phase-03` at commit `ac498904` (after Phase 2 regression remediation)._
_Original broken baseline: 2026-04-25, commit `79d43278` — see addendum at bottom._

## Environment

- Node version: `v24.14.0`
- pnpm version: `9.15.4`
- Platform: `Darwin 25.4.0 arm64` (macOS)
- Chrome version: Google Chrome `147.0.7727.102` at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (used as `CHROME_BIN`)

## TL;DR

After landing the three Phase 2 regression fixes (`tsc` typecheck, UMD `_audit` exposure, and Karma path patch), the legacy Karma + Mocha pipeline produces real, comparable test counts. The Karma shards aggregate to **6,649 passing / 354 failing / 101 pending** specs in roughly **44 wall-clock seconds**. These are the numbers Sprint 3 will use as the parity floor for the Vitest port.

The remaining 354 Karma failures and the Mocha-only suite breakages are pre-existing issues introduced during the broader Phase 0–2 modernization (DOM API drift, `aria-busy`/locale check-id renames, JSDOM-based tests assuming a browser global, Mocha-only suites still requiring `../axe` at the package root). They are **not** in scope for this baseline; Sprint 3 / Sprint 4 will either fix or quarantine each before declaring parity.

## Per-shard Karma results (post-fix)

All numbers below are taken from a fresh sequential run of each `pnpm run test:unit:<shard>` from `packages/axe-core/` after `pnpm --filter=axe-core run build`.

| Shard                   | Passed | Failed | Pending | Status                                  | Wall-clock |
| ----------------------- | -----: | -----: | ------: | --------------------------------------- | ---------: |
| test:unit:core          |   1520 |     16 |      26 | Real failures — see notes below         |       24 s |
| test:unit:commons       |   2104 |     15 |      35 | Real failures — see notes below         |        3 s |
| test:unit:rule-matches  |    403 |      4 |       0 | Real failures — see notes below         |        3 s |
| test:unit:checks        |   1253 |     94 |       0 | Real failures — see notes below         |        4 s |
| test:unit:api           |     12 |      0 |       0 | All green                               |        2 s |
| test:unit:integration   |   2016 |    225 |      40 | Real failures — see notes below         |        6 s |
| test:unit:virtual-rules |    341 |      0 |       0 | All green                               |        2 s |
| **Total Karma unit**    | **6649** | **354** | **101** | Pipeline executes; failure backlog open | **~44 s**  |

### Notes on the remaining Karma failures

The 354 surviving failures cluster into a small number of pre-existing root causes that are **out of scope for this remediation** (per Phase 3 scope guard: no edits to `lib/checks/`, `lib/rules/`, `lib/commons/`, `lib/standards/`):

- **`isValidLang`** (`test/core/utils/valid-langs.js`) — "expected true to be false" on a 4-character lang code. Looks like an upstream `iso-639` data-set update that flipped a value; not a Phase 2 build regression.
- **`finishRun frames`** (`test/core/public/finish-run.js`) — assertions like "expected `[ 'h2' ]` to deeply equal `[ 'h1' ]`" suggest virtual-tree ordering changed somewhere in the fixture/DOM-snapshot pipeline. Pre-existing.
- **`getStyleSheetFactory`** — `expected { ... } to have keys 'sheet', 'isCrossOrigin', 'shadowId', 'root', 'priority'` (object is missing `shadowId`). Schema drift in the helper return shape.
- **`nodeSerializer.dqElmToSpec`** — multiple cases where the new bundle returns `xpath: ['//div[…]']` (array) where the spec expects `xpath: '/'` (string). Looks like a serialization-format regression.
- **`collectResultsFromFrames`** — `Timeout of 4000ms exceeded` on the ping-timeout test pair. Possibly flaky; possibly a real timer regression. Sprint 3 will retry under Vitest before drawing conclusions.
- The bulk of `test:unit:checks` and `test:unit:integration` failures appear to be locale/check-id drift (the same root cause that fails the Mocha `test:locales` suite — the bundle no longer registers checks like `aria-busy`, `autocomplete-appropriate`).

These are tracked for Sprint 3 / 4 follow-up, not for this remediation.

## Mocha-only suites (post-fix)

| File                                | Passed | Failed | Pending | Status                                                      | Wall-clock |
| ----------------------------------- | -----: | -----: | ------: | ----------------------------------------------------------- | ---------: |
| test/test-locales.js                |      0 |      0 |       0 | `MODULE_NOT_FOUND` — `require('../axe')` (package-root path) — see footer | < 1 s |
| test/test-virtual-rules.js          |      0 |      0 |       0 | `MODULE_NOT_FOUND` — same root cause                        | < 1 s      |
| test/test-rule-help-version.js      |      1 |      0 |       0 | All green                                                   | ~5.6 s     |
| test/node/jsdom.js                  |      0 |      9 |       0 | `ReferenceError: document is not defined` at `dist/axe.js:31562` (`setupGlobals`). The Phase 2 ESM/CJS build assumes a browser global rather than reading from the JSDOM window passed in. Pre-existing. | < 1 s |

## Per-directory test-file inventory

Spec-file counts (used as a no-regression sanity check against the Vitest port):

| Directory (Karma `testDirs`)    | Legacy spec files |
| ------------------------------- | ----------------: |
| test/core                       |               119 |
| test/commons                    |               145 |
| test/rule-matches               |                44 |
| test/checks                     |               112 |
| test/integration (rules JSON)   |                96 |
| test/integration/virtual-rules  |                47 |
| test/integration/api            |                 1 |
| **Total Karma-bound specs**     |           **564** |

Mocha-only suites:

| File                                | `it()` blocks |
| ----------------------------------- | ------------: |
| test/test-locales.js                | 1 dynamic block per locale × 19 locale files = 19 |
| test/test-virtual-rules.js          | 341 |
| test/test-rule-help-version.js      | 1 |
| test/node/jsdom.js                  | 9 |

These file/spec totals are the *floor* against which Sprint 3 / Sprint 4 must prove no count regression once the Vitest port lands. Failing-but-counted specs need to be either fixed or explicitly quarantined before the migration proceeds.

## Total wall-clock (locally measured)

- Combined Karma unit suite (all 7 shards, sequential): **~44 s**
- Mocha scripts combined (locales + virtual-rules + rule-help-version + jsdom): **~7 s** (most of which is `test:rule-help-version`'s network round-trip)
- **Grand total of attempted invocations**: **~51 s**

This is the post-fix wall-clock baseline against which Vitest comparisons will be drawn in Sprint 3.

## Coverage

No coverage instrumentation existed in the legacy pipeline (no `nyc`/`c8`/`istanbul` config, no `--coverage` plumbing in `karma.conf.js` or in any `mocha` invocation). Sprint 4 will set v8 thresholds at **85/80/85/85** (statements/branches/functions/lines) using Vitest's built-in v8 provider.

## Not measured at baseline

- `test:act` — Selenium-driven against `wcag-act-rules`; rerun under Vitest in Sprint 3 conformance migration.
- `test:apg` — Selenium + `start-server-and-test`; replaced by Playwright in Sprint 3.
- `test:integration:chrome` / `test:integration:firefox` — Selenium WebDriver; replaced by Playwright in Sprint 3.
- `test:examples` and `test:node` — out of scope for unit-baseline comparison.

## Build prerequisite

Karma now serves `axe.js` / `axe.min.js` from `packages/axe-core/dist/` (per the transitional `karma.conf.js` patch landed in commit `ac498904`). Run `pnpm --filter=axe-core run build` once before invoking any Karma shard. Karma is being deleted in Phase 3 Sprint 4, so the path patch is intentionally minimal.

## Action items handed off to Sprint 2 / 3

1. **Karma `test:unit:checks` (94 fails) and `test:unit:integration` (225 fails)** — investigate locale/check-id drift; many failures correlate with checks the bundle no longer registers (`aria-busy`, `autocomplete-appropriate`, etc).
2. **`test/node/jsdom.js`** — bundle's `setupGlobals` assumes a browser-global `document`; rework to read from the JSDOM window passed in.
3. **Mocha `test-locales.js` / `test-virtual-rules.js`** — both `require('../axe')` from the package root; either restore a root-level shim, port them to read from `dist/`, or migrate them to Vitest as part of the Sprint 3 unit-suite port.
4. **`finishRun frames` / `nodeSerializer` failures** — assertions reflect a virtual-tree-shape change somewhere in the Phase 0–2 refactors; needs a rule-engine-level investigation, intentionally deferred until Phase 3 lands a Vitest baseline.

---

## Addendum — Initial broken-baseline (commit `79d43278`)

Prior to the Phase 2 regression fixes (commits `844785fc` … `ac498904`), the same pipeline produced the following numbers, captured for traceability:

| Shard                  | Passed | Failed | Pending | Status                                                     | Wall-clock |
| ---------------------- | -----: | -----: | ------: | ---------------------------------------------------------- | ---------: |
| test:unit:core         |      0 |      0 |       0 | Karma ERROR — `Cannot read properties of undefined (reading 'checks')` at `test/testutils.js:18` (0 of 0 executed) | 2.92 s |
| test:unit:commons      |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.52 s |
| test:unit:rule-matches |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.47 s |
| test:unit:checks       |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.44 s |
| test:unit:api          |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.47 s |
| test:unit:integration  |      0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.46 s |
| test:unit:virtual-rules |     0 |      0 |       0 | Karma ERROR — same `_audit` failure                        | 2.42 s |
| **Total Karma unit**   |      0 |      0 |       0 | All 7 shards aborted before any spec executed              | **17.7 s** |

Three upstream regressions were responsible:

1. **`tsc` would not compile** the generated `lib/core/generated/default-config.ts` (TS7006 on doT-compiled function literals) and `lib/core/index.ts` / `lib/core/utils/uuid.ts` (TS2591 for `module` and `Buffer`, because `@types/node` was pinned to `^4.9.5` and never pulled in via `tsconfig` `types`).
2. **The Phase 2 UMD bundle did not expose `axe._audit`** on the global `axe` — the wrapper did `global.axe = factory()`, replacing the shim that source code had mutated `_audit` onto.
3. **`karma.conf.js` looked for `axe.js` at the package root** — the legacy Grunt output location — rather than under `dist/`, so every shard 404'd on bundle load.

All three are resolved in the commit chain landing on `ac498904`; the post-fix numbers above are now the canonical Phase 3 baseline.
