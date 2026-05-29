# Plan: Sprint 5c — Preserved-Suite Migration (Karma/Mocha → Vitest+Playwright)

## Task Description

Sprint 5c is the final Phase 3 keystone: the remaining Mocha/Selenium-driven test suites that survived Sprints 5a and 5b — ACT-rules, ARIA Practices (APG), the `test/integration/full/*` page-driven suite, and the Node-side smoke tests (`test/node/*`, `test-locales.js`, `test-virtual-rules.js`, `test-rule-help-version.js`) — must move into the Vitest workspace projects already established by Sprints 3–5b. Once they are migrated and green, the Selenium dependency cluster (5 devDeps under R2) is retired, the seven legacy test jobs in `.github/workflows/test.yml` are deleted, and CI collapses to the target four-job shape (`unit` / `browser` / `integration` / `typecheck`). The remaining Mocha/Chai/Sinon/jQuery quartet stays for Phase 4 to retire via fixture codemod (R2 decision, 2026-04-26).

Two side concerns ride along:
- **Disconnect-flake fix** — the birpc `rpc is closed` cascade observed on `test/browser/checks/navigation/identical-links-same-purpose-after.test.ts`. Likely a Playwright page-lifecycle race; needs investigation, not a guess-fix.
- **A3 carryover bugs** — four real product issues surfaced by Sprint 5a/b (in `color-contrast-matches`, `get-foreground-color`, `dq-element`, `get-selector`). Per the Phase 3 scope guard (`feedback_flag_better_approaches` memory + `phase-05-remaining-work-brief.md` §6), Sprint 5c does NOT fix these — it captures them in a Phase 4 brief so the PRD-04 §5.1 work has a clean intake.

## Objective

When this sprint is complete:

1. Zero `*.spec.js` Mocha files remain under `packages/axe-core/test/` (excluding `node_modules`).
2. `test/integration/full/test-webdriver.js`, `test/get-webdriver.js`, `test/aria-practices/apg.spec.js`, every `test/act-rules/*.spec.js`, the act-rules `act-runner.js`, `test/test-locales.js`, `test/test-virtual-rules.js`, `test/test-rule-help-version.js`, `test/node/node.js`, and `test/node/jsdom.js` are deleted.
3. Equivalent coverage runs under Vitest in three places: `test/integration/act-rules/*.test.ts`, `test/integration/aria-practices.test.ts`, `test/integration/full/**/*.test.ts`, plus `test/unit/{locales,virtual-rules,rule-help-version,jsdom-smoke,node-smoke}.test.ts`.
4. `packages/axe-core/package.json` no longer lists `selenium-webdriver`, `chromedriver`, `start-server-and-test`, `http-server`, or `serve-handler` in `devDependencies`. **R2 decision (2026-04-26):** `mocha`, `chai`, `sinon`, and `jquery` STAY as devDeps for Sprint 5c — 131 of 207 fixture HTMLs in `test/integration/full/` reference `/node_modules/{mocha,chai}/...` at page-load time, and Sprint 5c's "fixtures stay untouched" rule precludes deleting them. Phase 4 retires the four via fixture codemod; tracked in `phase-04-a3-carryover-bugs.md`. The matching scripts (`integration`, `integration:apg`, `integration:chrome`, `integration:firefox`, `test:integration*`, `test:act`, `test:apg`, `test:locales`, `test:virtual-rules`, `test:rule-help-version`, `test:node`, `test:jsdom`, `start`) are deleted.
5. `.github/workflows/test.yml` runs the four-job target shape: `unit`, `browser`, `integration`, `typecheck` — with `lint`, `fmt_check`, `build`, `test_examples`, `build_api_docs`, and `sri-validate` retained as their own jobs (they are not in the consolidation scope). The seven jobs `test_chrome`, `test_firefox`, `test_act`, `test_aria_practices`, `test_locales`, `test_virtual_rules`, `test_jsdom`, plus the `vitest_pilot` placeholder, are deleted.
6. The `identical-links-same-purpose-after` flake is either fixed at root cause OR isolated behind a documented retry/timeout knob with a Phase 4 follow-up ticket.
7. The four A3 bugs are captured in `specs/phase-04-a3-carryover-bugs.md` with reproduction steps, current FIXME locations, and a recommended Phase 4 sprint slot — but no product-code change is made in this sprint.
8. `pnpm validate` is green; `pnpm test` runs only Vitest; the test count delta vs. `b9da71e2` baseline is fully accounted for in `specs/phase-05-sprint-5c-results.md`.

## Problem Statement

Even after Sprints 5a and 5b cleared the bulk of `test/browser/**`, four legacy stacks remain:

- **ACT-rules (`test/act-rules/`, 38 spec files + `act-runner.js`):** Each spec calls into `act-runner.js`, which spins up a `serve-handler` HTTP server on port 9898, launches a Selenium WebDriver against `wcag-act-rules` HTML fixtures, injects the built `dist/axe.js`, runs `AxeBuilder.analyze()`, and asserts violation counts against the testcases JSON. Mocha + Chai + Selenium + http-server.
- **APG (`test/aria-practices/apg.spec.js`):** Same shape — Selenium + Mocha + Chai + AxeBuilder against `aria-practices` HTML fixtures.
- **`test/integration/full/` (122 inline `*.js` + 207 HTML fixtures):** Driven by `test-webdriver.js`, which globs every `*.html` under `test/integration/full/`, loads each in Selenium, and waits for `window.mochaResults` to populate. Each HTML file has inline `<script>` blocks running Mocha tests against the in-page `axe` global. This is the largest chunk by file count and the most distinctive in shape — the page itself is the test runner.
- **Node smoke tests (`test/node/*.js`, `test/test-locales.js`, `test/test-virtual-rules.js`, `test/test-rule-help-version.js`):** A mix of bare `node` execution (`test/node/node.js` literally bypasses Mocha and uses `assert`), Mocha+Chai (`jsdom.js`, `test-virtual-rules.js`), Mocha+`assert` (`test-locales.js`), and a one-shot HTTP smoke test (`test-rule-help-version.js`).

These four stacks together carry 5 retirable devDeps (Selenium cluster) plus 4 deferred-to-Phase-4 devDeps (mocha/chai/sinon/jquery — see R2 decision in §Objective), 7 CI jobs that bloat the test matrix, and ~250 Mocha tests that need to merge into the Vitest count for accurate coverage and timing baselines.

The blocker is harness shape: the existing `test/integration/{aria-hidden-body,image-alt}/*.test.ts` pilots prove that Vitest browser mode can host inline-axe.run integration tests, but the per-fixture page-loading pattern that `full/test-webdriver.js` uses (load HTML → wait for `window.mochaResults`) has no equivalent helper yet. That harness is what Sprint 5c needs to build first.

## Solution Approach

Strangler-fig in three waves, in this order:

**Wave A — Harness.** Build `test/integration/_helpers/load-fixture.ts` that, in Vitest browser mode, navigates the Playwright page to a fixture URL (or sets `document.body.innerHTML` for inline fixtures), waits for `window.axe` plus optional in-page completion signals, runs `axe.run()` with a caller-supplied config, and returns the results. Pair it with a `axe-fixture-server.ts` Vitest globalSetup that starts a static file server (using `node:http` + `node:fs` — no `http-server`, no `serve-handler`) on a random ephemeral port, so the integration project can fetch `wcag-act-rules`, `aria-practices`, and the in-tree `test/integration/full/**/*.html` fixtures over real HTTP. The server's URL gets exposed via `process.env.AXE_FIXTURE_URL` for tests to pick up.

**Wave B — Migrate the four suites in parallel** off the same harness:
- ACT-rules: rewrite `act-runner.js` as a typed factory `createActSuite({ id, title, axeRules, skipTests })` under `test/integration/act-rules/_act-runner.ts`. Each `*.spec.js` becomes a one-line `.test.ts` that calls the factory, just like today's act-runner.js delegation. The factory reads `wcag-act-rules/content-assets/wcag-act-rules/testcases.json`, drives Playwright via the harness, and uses Vitest's `it.each(testcases)` to generate one test per testcase with retries.
- APG: single `aria-practices.test.ts` using `it.each` over the globbed HTML examples.
- `integration/full/`: this is the biggest delta. Two-step: (B1) build a one-shot driver `_run-page-fixture.ts` that loads a fixture HTML and harvests its in-page Mocha results into Vitest assertions (preserves the inline tests as fixtures); (B2) generate one `*.test.ts` per top-level fixture directory (`all-rules.test.ts`, `bypass.test.ts`, etc.) that drives its corresponding HTML page. The inline `*.js` files stay on disk as fixture content — they are not rewritten in Sprint 5c. Phase 4 can rewrite them as proper `axe.run` integration tests.
- Node: convert each file to a Vitest `unit` test using either node-environment Vitest (direct `axe-core` ESM import) or jsdom-environment Vitest (for `jsdom.js`). `test-rule-help-version.js` becomes a CI-gated test (it hits a live URL).

**Wave C — Cleanup.** Once Wave B is fully green: delete the legacy files, retire the 5 Selenium-cluster devDeps (R2 decision keeps mocha/chai/sinon/jquery for Phase 4), rewrite `package.json` scripts, prune CI to four jobs, run final validation, capture the A3 carryover bugs in a Phase 4 brief, and commit.

The disconnect-flake fix is investigated in parallel as a Wave A side task (it does not block harness work).

The four A3 bugs are deliberately not fixed here — only documented. This honors the Phase 3 scope guard: Phase 3 does not edit `lib/checks/`, `lib/rules/`, `lib/commons/`, or `lib/standards/`. The bugs surface real product issues that Phase 4 / PRD-04 §5.1 (color-algebra carryover) is the right home for.

## Relevant Files

Use these files to complete the task:

### Existing — Must Read

- `packages/axe-core/test/act-rules/act-runner.js` — current ACT factory; gets rewritten as `_act-runner.ts`.
- `packages/axe-core/test/act-rules/*.spec.js` (38 files) — one-line factory calls; become `.test.ts`.
- `packages/axe-core/test/aria-practices/apg.spec.js` — single APG runner.
- `packages/axe-core/test/integration/full/test-webdriver.js` — the page-driven runner (220 lines); deleted, replaced by per-page `.test.ts`.
- `packages/axe-core/test/integration/full/*/page.html` + `page.js` — 122 inline-Mocha fixtures; preserved as fixtures, not rewritten.
- `packages/axe-core/test/get-webdriver.js` — Selenium wiring; deleted.
- `packages/axe-core/test/test-locales.js`, `test/test-virtual-rules.js`, `test/test-rule-help-version.js` — Mocha+assert smoke tests.
- `packages/axe-core/test/node/node.js`, `test/node/jsdom.js` — Node smoke + jsdom smoke.
- `packages/axe-core/test/integration/{aria-hidden-body,image-alt}/*.test.ts` — pilot integration tests; reference shape for Wave B.
- `packages/axe-core/test/browser/checks/navigation/identical-links-same-purpose-after.test.ts` — flake-fix target.
- `packages/axe-core/test/browser/{checks,commons,core,rule-matches}/...` — locations of the four A3 bugs (already stamped FIXME-todo).
- `packages/axe-core/vitest.config.ts` and `packages/axe-core/vitest.workspace.ts` — workspace projects (already wired for `unit`, `browser`, `integration`).
- `packages/axe-core/package.json` — devDeps and scripts to delete.
- `.github/workflows/test.yml` — CI consolidation target.
- `specs/phase-05-remaining-work-brief.md` — defines Sprint 5 scope; Sprint 5c is the third leg of #16-A.
- `specs/phase-03-test-infrastructure-modernization-plan.md` — original Phase 3 plan §2.3 / task #11 (the JSON-driver harness Sprint 5c finally lands).
- `specs/PRD-03-test-infrastructure-modernization.md` — PRD-level acceptance criteria.
- `specs/PRD-04-rules-checks-optimization.md` §5.1 — color-algebra carryover (where A3 bugs go).
- `CLAUDE.md` — phase-status table; gets a Phase-3-complete bump on land.
- Memory file: `feedback_flag_better_approaches.md` — scope guard for `lib/` edits.

### New Files

- `packages/axe-core/test/integration/_helpers/load-fixture.ts` — Wave A harness: navigate page, wait for axe, run, return results.
- `packages/axe-core/test/integration/_helpers/fixture-server.ts` — `node:http`-backed static file server. Started by globalSetup, exposes URL via env var.
- `packages/axe-core/test/integration/_helpers/global-setup.ts` — Vitest `globalSetup` entry that owns the fixture server lifecycle.
- `packages/axe-core/test/integration/_helpers/page-fixture-runner.ts` — Wave B1 driver: load an `integration/full/*.html` page, harvest in-page Mocha results, translate to Vitest expects.
- `packages/axe-core/test/integration/act-rules/_act-runner.ts` — typed factory replacing `act-runner.js`.
- `packages/axe-core/test/integration/act-rules/*.test.ts` (38 files, one per ACT rule).
- `packages/axe-core/test/integration/aria-practices.test.ts` — APG suite.
- `packages/axe-core/test/integration/full/*/page.test.ts` (~50 files, one per top-level fixture directory).
- `packages/axe-core/test/unit/locales.test.ts` — replaces `test-locales.js`.
- `packages/axe-core/test/unit/virtual-rules.test.ts` — replaces `test-virtual-rules.js`.
- `packages/axe-core/test/unit/rule-help-version.test.ts` — replaces `test-rule-help-version.js`. Network-gated via `process.env.CI` or skip when offline.
- `packages/axe-core/test/unit/jsdom-smoke.test.ts` — replaces `test/node/jsdom.js`.
- `packages/axe-core/test/unit/node-smoke.test.ts` — replaces `test/node/node.js`. The legacy multi-Node-version jsdom matrix is dropped (not Phase-3 valuable; #16-D agreed).
- `specs/phase-04-a3-carryover-bugs.md` — A3 bug brief: 4 product bugs with repro + recommended Phase 4 slot.
- `specs/phase-05-sprint-5c-results.md` — sprint outcome doc with test-count delta, timing comparison vs. baseline, devDep / CI deltas.

## Implementation Phases

### Phase 1: Foundation (Wave A)

Build the harness without touching any of the four legacy suites yet. Land it as a standalone commit so harness regressions are bisectable.

- Build `fixture-server.ts` using only `node:http`, `node:fs`, `node:path`. No `serve-handler` (deleted in Wave C). Mirror the rewrite the legacy `act-runner.js` did (`/WAI/content-assets/wcag-act-rules/...` → `/node_modules/wcag-act-rules/...`) using a configurable rewrite map.
- Wire the server through Vitest's integration project `globalSetup`. Verify with the existing `image-alt.test.ts` pilot — it should still pass.
- Build `load-fixture.ts` and `page-fixture-runner.ts`. Smoke-test each against one ACT testcase and one `integration/full/*` page from the test runner before opening Wave B.

### Phase 2: Core Implementation (Wave B — four parallel streams)

All four streams depend only on Wave A. They share no state and can land in any order.

1. **ACT-rules stream.** Write `_act-runner.ts`. Generate the 38 `.test.ts` mechanically from the existing `.spec.js` filenames + `axeRules` arrays. Verify under `pnpm test:vitest:integration`. Retry semantics: `{ retry: 2, timeout: 50000 }` matching today's Mocha config.
2. **APG stream.** Single file. Same shape as ACT but enumerates `aria-practices` HTML examples. Reuse the `disabledRules` and `skippedPages` lists verbatim from today's `apg.spec.js`.
3. **`integration/full/` stream.** For each of the ~50 top-level subdirectories under `test/integration/full/`, generate one `page.test.ts` that drives the corresponding HTML through `page-fixture-runner.ts`. The inline `*.js` files in those subdirectories stay as fixture content — Sprint 5c does not rewrite them.
4. **Node-smoke stream.** Five small `.test.ts` files under `test/unit/`. The `test-rule-help-version.js` migration gets a `it.skipIf(!process.env.CI)` guard since it depends on live network access.

### Phase 3: Integration & Polish (Wave C)

- Delete the legacy files (the 38 spec files, `act-runner.js`, `apg.spec.js`, `test-webdriver.js`, `get-webdriver.js`, `node/{node,jsdom}.js`, `test-locales.js`, `test-virtual-rules.js`, `test-rule-help-version.js`).
- Retire the 5 Selenium-cluster devDeps from `packages/axe-core/package.json`. (R2 keeps mocha/chai/sinon/jquery for Phase 4.)
- Delete the 12 obsolete scripts from `package.json` (`integration*`, `test:integration*`, `test:act`, `test:apg`, `test:locales`, `test:virtual-rules`, `test:rule-help-version`, `test:node`, `test:jsdom`, `start`).
- Rewrite `.github/workflows/test.yml` to the four-job shape. Delete `test_chrome`, `test_firefox`, `test_act`, `test_aria_practices`, `test_locales`, `test_virtual_rules`, `test_jsdom`, and the `vitest_pilot` placeholder. Keep `lint`, `fmt_check`, `build`, `test_examples`, `build_api_docs`, `sri-validate`.
- Land the disconnect-flake fix.
- Author `phase-04-a3-carryover-bugs.md` and `phase-05-sprint-5c-results.md`.
- Update `CLAUDE.md` Phase-3 status to "complete" and `phase-05-remaining-work-brief.md` to reflect Sprint 5c closure.
- Run final validation gate.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to the building, validating, testing, deploying, and other tasks.
  - This is critical. Your job is to act as a high-level director of the team, not a builder.
  - Your role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: `harness-builder`
  - Role: Build Wave A harness — `fixture-server.ts`, `global-setup.ts`, `load-fixture.ts`, `page-fixture-runner.ts`. Wire into `vitest.workspace.ts` integration project. Smoke-test against the existing pilots.
  - Agent Type: `ts-builder`
  - Resume: true

- Builder
  - Name: `flake-investigator`
  - Role: Reproduce and root-cause the birpc `rpc is closed` cascade on `identical-links-same-purpose-after.test.ts`. Land either a real fix or an isolating workaround (`{ retry: 2, timeout: ... }`) plus a Phase 4 follow-up note. No guess-fixes — use `superpowers:systematic-debugging`.
  - Agent Type: `compound-engineering:ce-debug`
  - Resume: true

- Builder
  - Name: `act-migrator`
  - Role: Rewrite ACT-rules suite — `_act-runner.ts` factory + 38 `.test.ts` files under `test/integration/act-rules/`. Verify all testcases pass against the harness.
  - Agent Type: `ts-builder`
  - Resume: true

- Builder
  - Name: `apg-migrator`
  - Role: Migrate APG — single `test/integration/aria-practices.test.ts` driving `aria-practices` HTML examples through the harness.
  - Agent Type: `ts-builder`
  - Resume: true

- Builder
  - Name: `full-suite-migrator`
  - Role: Migrate `test/integration/full/` — generate one `page.test.ts` per top-level fixture directory using `page-fixture-runner.ts`. Inline `*.js` files stay as fixture content.
  - Agent Type: `ts-builder`
  - Resume: true

- Builder
  - Name: `node-suite-migrator`
  - Role: Migrate `test/node/{node,jsdom}.js`, `test-locales.js`, `test-virtual-rules.js`, `test-rule-help-version.js` to Vitest unit project. Drop the multi-Node-version jsdom matrix (out of Phase 3 scope).
  - Agent Type: `ts-builder`
  - Resume: true

- Builder
  - Name: `cleanup-builder`
  - Role: Delete 13+ legacy test files, retire 5 devDeps (Selenium cluster — R2), prune 12 scripts from `package.json`, run `pnpm install` to update lockfile.
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `ci-consolidator`
  - Role: Rewrite `.github/workflows/test.yml` to the four-job shape. Delete the seven obsolete jobs plus `vitest_pilot`. Keep ancillary jobs (`lint`, `fmt_check`, `build`, `test_examples`, `build_api_docs`, `sri-validate`).
  - Agent Type: `engineering-devops-automator`
  - Resume: true

- Builder
  - Name: `a3-bug-curator`
  - Role: Author `specs/phase-04-a3-carryover-bugs.md` documenting the four A3 bugs (`color-contrast-matches`, `get-foreground-color`, `dq-element`, `get-selector`) with repro steps, current FIXME locations, and a recommended Phase 4 slot. NO product-code edits.
  - Agent Type: `general-purpose`
  - Resume: true

- Builder
  - Name: `results-author`
  - Role: Write `specs/phase-05-sprint-5c-results.md` with test-count delta vs. `b9da71e2`, timing comparison vs. `phase-03-baseline.md`, devDep deltas, CI deltas. Bump `CLAUDE.md` Phase-3 status to complete; mark Sprint 5c done in `phase-05-remaining-work-brief.md`.
  - Agent Type: `general-purpose`
  - Resume: true

- Reviewer
  - Name: `pre-merge-reviewer`
  - Role: Run the `compound-engineering:ce-review` pipeline — pattern compliance, fixture-isolation hazards, no `karma|mocha|chai|sinon|jquery|selenium|chromedriver|http-server` strings outside CHANGELOG, no `assert.*` regressions.
  - Agent Type: `code-review`
  - Resume: true

- Validator
  - Name: `final-validator`
  - Role: Run validation gate (Validation Commands below). Verify all Acceptance Criteria. Read-only — never modifies code.
  - Agent Type: `validator`
  - Resume: true

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Build the Wave A integration harness

- **Task ID**: `build-integration-harness`
- **Depends On**: none
- **Assigned To**: `harness-builder`
- **Agent Type**: `ts-builder`
- **Parallel**: false (Wave B depends on this)
- Implement `test/integration/_helpers/fixture-server.ts` using `node:http` + `node:fs` only (no `serve-handler`). Support a configurable rewrite map (`/WAI/content-assets/wcag-act-rules/*` → `/node_modules/wcag-act-rules/content-assets/wcag-act-rules/*`, `/aria-practices/*` → `/node_modules/aria-practices/*`, plus root → `packages/axe-core/`). Listen on an ephemeral port (port 0); expose URL via `process.env.AXE_FIXTURE_URL`.
- Implement `test/integration/_helpers/global-setup.ts` as the Vitest `globalSetup` entry. Start the server in setup, close it in teardown.
- Wire `globalSetup` into the `integration` project in `vitest.workspace.ts`.
- Implement `test/integration/_helpers/load-fixture.ts`: `loadFixture(page, url, opts)` navigates, waits for `window.axe`, optionally awaits `awaitNestedLoad`-style readiness, returns a typed handle.
- Implement `test/integration/_helpers/page-fixture-runner.ts`: loads an `integration/full/*` HTML page, exposes hooks to harvest the inline `mochaResults` shape (or fail fast if the page never finishes).
- Smoke-test against the existing `image-alt.test.ts` and `aria-hidden-body.test.ts` pilots — both must still pass.
- Refactor those two pilots to use the new harness instead of `import '../../../dist/axe.js'` once the harness is proven (this also closes Sprint 5 #16-A's UMD dependency in the integration project).
- Commit as `chore(test): land Vitest integration harness for Sprint 5c`.

### 2. Investigate and fix the disconnect-flake

- **Task ID**: `fix-disconnect-flake`
- **Depends On**: none
- **Assigned To**: `flake-investigator`
- **Agent Type**: `compound-engineering:ce-debug`
- **Parallel**: true (independent of harness)
- Reproduce locally on `identical-links-same-purpose-after.test.ts`. Run with `--repeat-each=20` to confirm intermittence.
- Use `superpowers:systematic-debugging`. Iron Law: no fixes without a documented root cause.
- Investigate hypotheses in order: (a) Playwright page closed mid-test, (b) Vitest browser-mode birpc race on test boundary, (c) iframe disconnection in the `awaitNestedLoad` path, (d) timeout shorter than fixture load.
- Land either a real root-cause fix OR an isolation workaround (`{ retry: 2, timeout: 30000 }` on the affected test only) plus a Phase 4 follow-up note in `phase-04-a3-carryover-bugs.md`. Do NOT widen retries globally — that masks future flakes.
- Commit as `fix(test): stabilize identical-links-same-purpose-after disconnect cascade`.

### 3. Document the A3 carryover bugs

- **Task ID**: `capture-a3-bugs`
- **Depends On**: none
- **Assigned To**: `a3-bug-curator`
- **Agent Type**: `general-purpose`
- **Parallel**: true (independent of code work)
- Locate the four bug clusters and read their current FIXME stamps:
  - `test/browser/rule-matches/color-contrast-matches.test.ts` — 3 tests
  - `test/browser/commons/color/get-foreground-color.test.ts.todo` — 15 tests
  - `test/browser/core/utils/dq-element.test.ts.todo` — 2 tests
  - `test/browser/core/utils/get-selector.test.ts.todo` — 1 test
- Author `specs/phase-04-a3-carryover-bugs.md` with: per-bug minimal repro, FIXME location + line, hypothesized root cause (color-algebra NaN regression for the first two; selector-generation drift for the latter two), and a recommended Phase 4 slot (PRD-04 §5.1 for color, PRD-04 Sprint 1 ancillary for selector).
- NO edits to `lib/`. This is a documentation deliverable only.
- Commit as `docs(specs): capture A3 carryover bugs for Phase 4`.

### 4. Migrate ACT-rules suite

- **Task ID**: `migrate-act-rules`
- **Depends On**: `build-integration-harness`
- **Assigned To**: `act-migrator`
- **Agent Type**: `ts-builder`
- **Parallel**: true (with tasks 5, 6, 7)
- Port `test/act-rules/act-runner.js` to `test/integration/act-rules/_act-runner.ts` as a typed factory: `createActSuite({ id, title, axeRules, skipTests })`. Use `it.each(testcases)` over the testcases JSON. Set `{ retry: 2, timeout: 50_000 }` matching today's Mocha config.
- Generate one `.test.ts` per `*.spec.js` file. The mapping is mechanical (each spec is `require('./act-runner.js')({ id, title, axeRules })` — extract the args, write the matching `createActSuite(...)` call).
- Verify with `pnpm --filter axe-core run test:vitest:integration -- act-rules/`. All testcases must pass against the same testcase JSON the legacy suite uses.
- Do not delete the `.spec.js` files yet — Wave C handles deletion.
- Commit as `test(axe-core): migrate ACT-rules suite to Vitest integration project`.

### 5. Migrate APG suite

- **Task ID**: `migrate-apg`
- **Depends On**: `build-integration-harness`
- **Assigned To**: `apg-migrator`
- **Agent Type**: `ts-builder`
- **Parallel**: true (with tasks 4, 6, 7)
- Author `test/integration/aria-practices.test.ts`. Use `it.each` over the globbed HTML example list. Preserve the existing `disabledRules` map and `skippedPages` list verbatim.
- Use the harness `loadFixture` helper; drop direct AxeBuilder dependency.
- `{ retry: 3, timeout: 50_000 }` matching today.
- Verify with `pnpm --filter axe-core run test:vitest:integration -- aria-practices`.
- Commit as `test(axe-core): migrate APG suite to Vitest integration project`.

### 6. Migrate `integration/full/` page-driven suite

- **Task ID**: `migrate-full-suite`
- **Depends On**: `build-integration-harness`
- **Assigned To**: `full-suite-migrator`
- **Agent Type**: `ts-builder`
- **Parallel**: true (with tasks 4, 5, 7)
- For each top-level subdirectory under `test/integration/full/` (~50 dirs), generate one `page.test.ts` that uses `pageFixtureRunner` to load the corresponding HTML and assert mochaResults success.
- Inline `*.js` fixture content stays untouched. Sprint 5c does NOT rewrite them as proper Vitest tests — that is a Phase 4 cleanup.
- Some pages need browser-specific behavior (Firefox-only, Chromium-only). Use `it.runIf(process.env.AXE_BROWSER === 'firefox')` etc. — the integration project already runs both browsers.
- Verify with `pnpm --filter axe-core run test:vitest:integration -- full/`. Test count must match (or document deltas in the results doc).
- Commit as `test(axe-core): migrate integration/full page-driven suite to Vitest`.

### 7. Migrate Node smoke / locale / virtual-rules / rule-help suites

- **Task ID**: `migrate-node-suite`
- **Depends On**: none (uses unit project which already exists)
- **Assigned To**: `node-suite-migrator`
- **Agent Type**: `ts-builder`
- **Parallel**: true (with tasks 4, 5, 6)
- `test/unit/locales.test.ts` — globs `locales/*.json`, asserts each parses + `axe.configure({ locale })` does not throw. Use Vitest `expect(() => ...).not.toThrow()`.
- `test/unit/virtual-rules.test.ts` — globs `test/integration/virtual-rules/*.js` and `require()`s each. Set `globalThis.axe` and `globalThis.assert` in `beforeAll`/`afterAll`. (The fixture `.js` files use `assert.*` — they stay on Chai-compat for Sprint 5c. Phase 4 codemods can flip them.)
- `test/unit/rule-help-version.test.ts` — single network test; `it.skipIf(!process.env.CI)` so local runs are fast and offline.
- `test/unit/jsdom-smoke.test.ts` — replaces `test/node/jsdom.js`. Use `environment: 'jsdom'` directive at file level (or `// @vitest-environment jsdom`).
- `test/unit/node-smoke.test.ts` — replaces `test/node/node.js`. Drop the multi-Node-version `nodeToDeps` matrix (axe-core has no Node-version-specific code paths; #16-D agreed).
- Verify with `pnpm --filter axe-core run test:vitest:unit`.
- Commit as `test(axe-core): migrate node/locales/virtual-rules suites to Vitest unit project`.

### 8. Retire 5 devDeps + delete 12 scripts + delete legacy files

- **Task ID**: `cleanup-deps-and-scripts`
- **Depends On**: `migrate-act-rules`, `migrate-apg`, `migrate-full-suite`, `migrate-node-suite`, `fix-disconnect-flake`
- **Assigned To**: `cleanup-builder`
- **Agent Type**: `builder`
- **Parallel**: false
- Delete legacy files:
  - `packages/axe-core/test/act-rules/` (entire dir)
  - `packages/axe-core/test/aria-practices/` (entire dir, except keep README.md if it's still useful — author judgment)
  - `packages/axe-core/test/integration/full/test-webdriver.js`
  - `packages/axe-core/test/get-webdriver.js`
  - `packages/axe-core/test/test-locales.js`, `test/test-virtual-rules.js`, `test/test-rule-help-version.js`
  - `packages/axe-core/test/node/node.js`, `test/node/jsdom.js` (keep `package.json` if used; verify)
- Remove from `packages/axe-core/package.json` `devDependencies`: `selenium-webdriver`, `chromedriver`, `start-server-and-test`, `http-server`, `serve-handler`. **R2 decision:** `mocha`, `chai`, `sinon`, `jquery` STAY (the `integration/full/` fixture HTMLs depend on them); their retirement is a Phase 4 deliverable tracked in `phase-04-a3-carryover-bugs.md`.
- Remove these scripts: `start`, `integration`, `integration:apg`, `integration:chrome`, `integration:firefox`, `test:integration`, `test:integration:chrome`, `test:integration:firefox`, `test:act`, `test:apg`, `test:locales`, `test:virtual-rules`, `test:rule-help-version`, `test:node`, `test:jsdom`.
- Run `pnpm install` to update the lockfile.
- Run `pnpm --filter axe-core test` to confirm green.
- Commit as `chore(axe-core): retire mocha/chai/selenium devDep cluster and legacy scripts`.

### 9. Consolidate CI to four-job target shape

- **Task ID**: `consolidate-ci`
- **Depends On**: `cleanup-deps-and-scripts`
- **Assigned To**: `ci-consolidator`
- **Agent Type**: `engineering-devops-automator`
- **Parallel**: false
- Edit `.github/workflows/test.yml`:
  - Delete jobs: `test_chrome`, `test_firefox`, `test_act`, `test_aria_practices`, `test_locales`, `test_virtual_rules`, `test_jsdom`, `vitest_pilot`.
  - Add jobs: `unit` (`pnpm --filter axe-core run test:vitest:unit`), `browser` (`pnpm --filter axe-core run test:vitest:browser`), `integration` (`pnpm --filter axe-core run test:vitest:integration`), `typecheck` (`pnpm --filter axe-core run test:tsc`).
  - All four use the existing Playwright-cache action pattern from the deleted `vitest_pilot` job. The `unit` and `typecheck` jobs do not need Playwright; the `browser` and `integration` jobs do.
  - Preserve: `lint`, `fmt_check`, `build`, `test_examples`, `build_api_docs`, `sri-validate`.
- Verify with `gh workflow view test.yml --yaml` (post-push) and one full PR run.
- Commit as `ci: collapse to four-job target shape (unit/browser/integration/typecheck)`.

### 10. Author results doc and update phase trackers

- **Task ID**: `author-results-doc`
- **Depends On**: `consolidate-ci`
- **Assigned To**: `results-author`
- **Agent Type**: `general-purpose`
- **Parallel**: false
- Write `specs/phase-05-sprint-5c-results.md` with:
  - Test-count delta vs. `b9da71e2` baseline (`244 passed | 33 skipped (277)` files; `2475 passed | 39 skipped | 66 todo (2648)` tests).
  - Wall-clock comparison vs. `phase-03-baseline.md`. Demand ≥50% reduction overall (per Phase 3 plan task #18).
  - DevDep delta (5 packages removed under R2; lockfile diff summary). Note that mocha/chai/sinon/jquery are retained for Phase 4.
  - CI delta (jobs removed, jobs added, before/after run-time).
  - Open carryovers: link to `phase-04-a3-carryover-bugs.md`, link to flake follow-up if applicable.
- Update `CLAUDE.md` phase-status table: Phase 3 → complete.
- Update `specs/phase-05-remaining-work-brief.md`: mark Sprint 5c done; collapse §2 (#16-A residual concerns now closed).
- Commit as `docs(specs): document Sprint 5c outcomes; mark Phase 3 complete`.

### 11. Pre-merge code review

- **Task ID**: `pre-merge-review`
- **Depends On**: `author-results-doc`
- **Assigned To**: `pre-merge-reviewer`
- **Agent Type**: `code-review`
- **Parallel**: false
- Run `compound-engineering:ce-review` over the full Sprint 5c diff vs. `develop`.
- Pattern compliance: every migrated test uses `expect()`, no `assert.*` outside Wave 7's intentional virtual-rules fixture compat (which is documented).
- No `karma|mocha|chai|sinon|jquery|selenium|chromedriver|http-server|serve-handler` strings remain in `packages/axe-core/{lib,test,package.json}` or in `pnpm-lock.yaml` outside transitive deps.
- Spot-check 5 random integration tests for fixture-isolation hazards (no module-scope state, every test cleans `document.body`).
- Verify the Playwright trace upload still fires on a deliberate failing test by running CI with one test forced to fail and confirming the artifact uploads.

### 12. Final validation

- **Task ID**: `validate-all`
- **Depends On**: `pre-merge-review`
- **Assigned To**: `final-validator`
- **Agent Type**: `validator`
- **Parallel**: false
- Run all commands in §`Validation Commands`.
- Verify all 12 items in §`Acceptance Criteria`.
- Confirm test-count delta is fully accounted for in `phase-05-sprint-5c-results.md`.
- Confirm zero `.spec.js` files remain under `packages/axe-core/test/` (excluding `node_modules`).
- Confirm CI run on the PR is green for all four target jobs.

## Acceptance Criteria

1. `find packages/axe-core/test -name '*.spec.js' -not -path '*/node_modules/*'` returns zero files.
2. `find packages/axe-core/test -name '*.test.ts' -path '*/integration/*'` returns ≥90 files (38 ACT + 1 APG + ~50 full + 2 pilots).
3. `find packages/axe-core/test/unit -name '*.test.ts'` returns the existing unit tests plus 5 new files (locales, virtual-rules, rule-help-version, jsdom-smoke, node-smoke).
4. `packages/axe-core/test/integration/full/test-webdriver.js` does not exist.
5. `packages/axe-core/test/get-webdriver.js` does not exist.
6. `packages/axe-core/package.json` `devDependencies` contains none of: `selenium-webdriver`, `chromedriver`, `start-server-and-test`, `http-server`, `serve-handler`. (Per R2 decision, `mocha`, `chai`, `sinon`, `jquery` remain — Phase 4 retires them.)
7. `packages/axe-core/package.json` `scripts` contains none of: `start`, `integration`, `integration:apg`, `integration:chrome`, `integration:firefox`, `test:integration`, `test:integration:chrome`, `test:integration:firefox`, `test:act`, `test:apg`, `test:locales`, `test:virtual-rules`, `test:rule-help-version`, `test:node`, `test:jsdom`.
8. `.github/workflows/test.yml` defines `unit`, `browser`, `integration`, `typecheck` jobs and does not define `test_chrome`, `test_firefox`, `test_act`, `test_aria_practices`, `test_locales`, `test_virtual_rules`, `test_jsdom`, or `vitest_pilot`.
9. `pnpm --filter axe-core test` is green; `pnpm --filter axe-core run test:tsc` is clean.
10. `pnpm validate` is green at repo root.
11. `specs/phase-04-a3-carryover-bugs.md` exists and documents all four bug clusters with repro + recommended Phase 4 slot. No edits to `lib/checks/`, `lib/rules/`, `lib/commons/`, or `lib/standards/` shipped in this sprint.
12. `specs/phase-05-sprint-5c-results.md` exists with test-count delta, timing comparison, devDep delta, and CI delta vs. baseline.

## Validation Commands

Execute these commands to validate the task is complete:

```bash
# Repo-root validation gate
pnpm validate

# Per-package
pnpm --filter axe-core run test:tsc
pnpm --filter axe-core run test:vitest:unit
pnpm --filter axe-core run test:vitest:browser
pnpm --filter axe-core run test:vitest:integration
pnpm --filter axe-core test --coverage

# Build-tools sanity (no Phase 3 regression)
pnpm --filter @axe-core/build-tools run typecheck
pnpm --filter @axe-core/build-tools test

# Source hygiene — must return EMPTY (mocha/chai/sinon/jquery deferred to Phase 4 per R2)
grep -rn 'karma\|selenium\|chromedriver\|http-server\|serve-handler' \
  packages/axe-core --include='*.{ts,js,json,yaml,yml}' \
  | grep -v CHANGELOG | grep -v node_modules | grep -v dist
find packages/axe-core/test -name '*.spec.js' -not -path '*/node_modules/*'
find packages/axe-core/test -name 'test-webdriver.js'
find packages/axe-core/test -name 'get-webdriver.js'

# CI shape — must list exactly the four target jobs plus ancillary
yq '.jobs | keys' .github/workflows/test.yml

# Spec-file presence
test -f specs/phase-04-a3-carryover-bugs.md
test -f specs/phase-05-sprint-5c-results.md

# Disconnect-flake stability — repeat 20×; expect zero failures
pnpm --filter axe-core exec vitest run test/browser/checks/navigation/identical-links-same-purpose-after.test.ts --repeat-each=20
```

## Notes

- **Phase 3 scope guard is in force.** No edits to `lib/checks/`, `lib/rules/`, `lib/commons/`, or `lib/standards/`. The four A3 bugs and any color-algebra observations are captured for Phase 4 in `phase-04-a3-carryover-bugs.md`. (Memory: `feedback_flag_better_approaches.md`.)
- **Karma is gone after Sprint 5b.** This sprint does not need to keep the Karma stack green — that gate already lifted with PR #4.
- **Inline `integration/full/*.js` fixture content stays as-is.** Sprint 5c migrates the runner, not the fixtures. Phase 4 will rewrite each as a proper `axe.run`-asserting Vitest test if/when it adds value.
- **`test-rule-help-version` is network-dependent.** Gate with `it.skipIf(!process.env.CI)` so local runs are fast and offline-safe. CI keeps the gate (it currently only runs on `master` — preserve that filter).
- **Node-version matrix is dropped.** axe-core has no Node-version-specific code paths, and the legacy `test/node/node.js` matrix added no signal. Carries the Sprint 4b decision forward.
- **No new libraries needed.** Everything required (`vitest@4`, `@vitest/browser-playwright`, `playwright`, `glob`, `jsdom`, `tsx`) is already a devDep. The harness uses Node built-ins (`node:http`, `node:fs`).
- **Disconnect-flake decision tree:** prefer root-cause fix; fall back to scoped retry only with a Phase 4 follow-up note. Do not widen retries globally — that hides future regressions.
- **Branch:** continue on `chore/modernize-phase-5`. PR target is `develop`.
- **Recommended commit cadence:** one commit per task ID. The cleanup task can split into 2–3 commits if the diff is large.
