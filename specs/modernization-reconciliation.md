# Modernization reconciliation

Captured September 11, 2026. Preparation only; no engine, test or CI implementation changes in the preparation commit.

**Subsequent repository transition:** PR #7 merged as `3a9d1ff0`. The repository was renamed to Propellr, then transferred to [asbury-labs/propellr](https://github.com/asbury-labs/propellr); `develop` was renamed to protected `main` without rewriting history. New execution branches start from latest `main`. The branch names and measurements below remain the original preparation record, not current routing instructions. Package names are unchanged.

## Authoritative starting point

- Preparation branch: `chore/reconcile-modernization`.
- Base: `origin/develop` at `b9da71e28e3b7193632f2a57fe28a800d242a433` (merged PR #4).
- Worktree: `/Users/tk/Code/axe-core-preparation`.
- Preserved original: `/Users/tk/Code/axe-core`, `chore/modernize-phase-03`, `eb2ef403c4d1d12aed9e7cc711af37c1bfcc9f32`.
- Additional backup reference: `backup/modernize-phase-03-20260911` at that original commit.
- The original untracked HTML plan remains untouched in the original checkout. The refreshed plan is committed on the preparation branch.
- Active execution plan: [streamlined-modernization-plan.html](streamlined-modernization-plan.html). This report supplies evidence and decisions, not a parallel task list.
- Machine-readable observations: [modernization-baseline.json](modernization-baseline.json).

GitHub comparison found 59 commits only on current `develop` and three only on the original local branch. Fetch confirmed the remote Phase 3 branch had been force-updated. Do not push the original branch over it or rebase its bulk migration blindly.

## Disposition of the three local-only commits

| Commit     | Review                                                                                                                                                                        | Disposition                                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `845b0998` | Bulk Vitest conversion, test relocation, old runner removal. Current `develop` contains a different, staged migration with explicit source aliases and helper infrastructure. | Preserve as history. Do not cherry-pick the competing migration. Compare individual behaviors if the inventory identifies a missing test.                              |
| `e5f24b63` | Mixed test relocation, helper changes, generator/global shims and Node detection changes. Adds duck-typed `isNode` and imports commons from core utility code.                | No whole-commit reuse. Retest cross-realm/context behavior before selecting any individual fix; duck typing is not automatically a correct cross-realm solution.       |
| `eb2ef403` | Deletes 470 legacy JS tests and strips shadow-support guards. It also leaves the local UUID constant-reassignment regression, already absent on current `develop`.            | No wholesale deletion replay. Remove tests only after case-level replacement evidence. Current direct compiler check no longer reproduces the original 18 diagnostics. |

No local commit was cherry-picked. Preservation is not endorsement of its implementation.

## PR #5: evaluate components, do not merge wholesale

Reviewed source: [PR #5](https://github.com/akornmeier/axe-core/pull/5), head `c10315ab273eb846094934f42dd09c05b8918fd8`.

The full diff is larger than GitHub's initial file preview suggested: **1,896 paths with rename detection disabled**, including **1,087 generated coverage-report paths**. With Git rename detection enabled, this is 1,864 changes (777 outside coverage). It contains substantive migration work as well as design documents and CI cleanup. No `lib/` implementation changes appear in the merge-base diff.

Both the 1,244-line redesign and 884-line critical-path plan were read in full. They are design inputs, not independently authorized execution instructions for this run.

### Reuse candidates for Phase 1

| Area                                     | Source commits         | Review before adoption                                                                                               |
| ---------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Browser/test migration completion        | `dcd6ea66`, `29c08c44` | Account for remaining `.test.ts.todo` files, assertions, fixture lifecycle and suppressed cases.                     |
| Full-document fixture server and harness | `ad4f1edf`             | Preserve resource loading, origins, iframe injection, timeout/cleanup and assertion propagation.                     |
| Node/locales/virtual-rule suites         | `17dc68ce`             | Verify expected outcomes rather than importing passing-but-inverted assertions. Preserve jsdom cross-realm coverage. |
| APG and ACT migration                    | `c4ef6935`, `75690506` | Compare testcase IDs and exclusions to the legacy corpus. Do not accept skipped color/spacing checks as solved.      |
| Full-page fixtures                       | `e1662269`             | Review every parked page; retain in-page Mocha/Chai/Sinon dependencies until actual fixtures stop using them.        |
| CI and docs wiring                       | `81a40f4a`, `734cd45f` | Adopt only after scripts and migrated suites exist. Preserve examples, SRI and other surviving consumers.            |

Selection is dependency-aware file/hunk review, not a promise each listed commit can be cherry-picked independently. Keep source commit attribution when adopting work.

Do not import generated coverage, blanket deletion from `efe02d2f`, the five-attempt browser wrapper from `72854228`, or broad lint/format sweeps without verifying their need. Inspect the actual failure signature before calling a problem a vendor flake. CI browser/integration runs recorded on PR #5 were cancelled; lint, typecheck and examples failed. Those old runs and the PR's results document are not a fresh green baseline.

### Architecture reconciliation

| Topic                                                                             | Decision for the active plan                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Independent engine state, explicit rule/check context, typed boundaries           | Carry forward. These align with the new platform goal.                                                                                                                                                                                                                                                                                                                                                                    |
| Immutable rule composition, categorized structured evidence, fail-explicit errors | Carry forward the concepts. Validate concrete semantics against current checks and enterprise fixtures.                                                                                                                                                                                                                                                                                                                   |
| Reviewed verdict parity and known-good/known-bad corpora                          | Carry forward. Never let generation update its own oracle automatically; intentional rule improvements require reviewed expectations.                                                                                                                                                                                                                                                                                     |
| Public API and result compatibility                                               | **Owner decision needed before Phase 3.** PR #5 lifts API/result compatibility; the newer HTML plan assumed a facade. Recommendation: preserve the existing `axe-core` surface during a parallel, opt-in pilot; let the new API/result model evolve, with a scoped output adapter where useful. A reporter adapter does not provide full API compatibility. No new package naming or replacement release authorized here. |
| Snapshot-first CDP engine, packed FlatTree and mandatory SAB worker pool          | Keep as experiments, not prerequisites. Prove required style/layout/relationship data, protocol support and capture cost before locking representation. Firefox/WebKit are not CDP equivalents.                                                                                                                                                                                                                           |
| `(rule, subtree)` scheduling                                                      | Require correct document/frame-wide aggregation and after-function behavior. Worker partitioning must not change verdicts or omit cross-subtree dependencies.                                                                                                                                                                                                                                                             |
| Fingerprinting and cascade/root-cause claims                                      | Optional reporting experiment. An ancestor and descendant failure do not alone establish causality; never suppress findings on that assumption.                                                                                                                                                                                                                                                                           |
| Many scoped packages, ten reporters, SQLite history and MCP server                | Defer until an end-to-end pilot demonstrates demand. A small authoring CLI/schema contract remains in scope; no speculative distribution explosion.                                                                                                                                                                                                                                                                       |
| Closed shadow roots, OOPIF access and snapshot style completeness                 | Verify against actual host/protocol capabilities. Do not copy design prose as a capability guarantee. Missing evidence is explicit, never a pass.                                                                                                                                                                                                                                                                         |
| Speed, payload size, token savings and timelines                                  | Hypotheses only until measured. PR #5's summed job-minutes are not directly comparable to parallel CI wall-clock latency.                                                                                                                                                                                                                                                                                                 |

PR #5 remains open and untouched. Recommended eventual disposition: port validated migration fixes to focused Phase 1 PRs, retain useful design provenance, then supersede/close the old PR with an explanation. Do not lose its work or merge its coverage artifacts merely to clear the queue.

## Fresh baseline on `b9da71e2`

Environment: macOS arm64, Node `v24.20.0`, PNPM `9.15.4`, installed TypeScript `6.0.3`, Vitest/provider `4.1.5`, Playwright `1.59.1`. Versions are the current lockfile, not the future toolchain targets.

1. `pnpm install --frozen-lockfile --ignore-scripts` succeeded in the preparation worktree. Lifecycle scripts were deliberately disabled; PNPM warned that git-hosted ACT/APG packages have build scripts that were not run. Do not call this a normal lifecycle-complete installation.
2. Reviewed and explicitly applied the checked-in color patch with `pnpm --filter axe-core exec patch-package`; succeeded. No package versions or lockfile changes.
3. `pnpm --filter @axe-core/schemas build` returned success but emitted no `dist` on the fresh worktree. `packages/schemas/tsconfig.tsbuildinfo` is tracked. Initial engine typecheck failed with missing schema declarations and downstream errors.
4. `pnpm --filter @axe-core/schemas exec tsc -b --force` produced outputs; subsequent `pnpm --filter axe-core exec tsc --noEmit --pretty false` passed. This is a preparation workaround, not a committed fix for fresh builds or type safety. The generated config still uses `@ts-nocheck`.
5. `pnpm --filter axe-core build` passed. It invoked generation and produced all four formats. No tracked source/doc differences remained after the run. No runtime artifact-parity claim follows from build success.
6. `pnpm --filter axe-core exec vitest list --filesOnly --json` discovered 277 project/file entries: 61 unit, 212 Chromium browser, two integration files each in Chromium and Firefox. This is file discovery, not executed case coverage. There are also 148 `.test.ts.todo` files under `test/browser` outside the active include glob.
7. `pnpm --filter axe-core exec vitest run --project unit --maxWorkers 2` exited 0. Reporter: `Test Files 30 passed | 31 skipped (61)` and `Tests 207 passed | 1 skipped | 60 todo (336)`. Nested parked suites mean these displayed status counts are not a simple complete partition of the headline total; preserve the raw summary rather than asserting every case ran.
8. Focused browser `is-node` and integration `image-alt` invocations both failed before test execution because the pinned Chromium headless-shell revision 1217 is absent. The shared cache contains a different revision; no substitute browser was used. Full browser/integration suites, Firefox, ACT/APG, examples, packed consumers and timing benchmarks remain unverified. Browser provisioning belongs in the first implementation run.
9. `pnpm --filter axe-core lint` exited 0 with **902 warnings and 0 errors**. Warnings and parked tests are not a clean correctness bill.
10. `pnpm exec turbo run typecheck --dry=json` still reports `axe-core#typecheck` as `<NONEXISTENT>`. Root typecheck is not the direct engine check performed above.

The old local 18-error report, jsdom-default unit project, locale control run, duplicate documentation-only workspace config and package scripts are historical observations of `eb2ef403`, not the current starting state. Current `vitest.workspace.ts` actively defines projects and must not be deleted as a documentation stub.

## Handoff

Preparation establishes the source of truth; it does not mark Phase 1 complete. Run Phase 1 in a new implementation branch based on the preparation commit, with the current lockfile, explicit browser provisioning, tested migration reuse and one plan writer. Resolve the public-API/parallel-engine decision before Phase 3 architecture work. Tool Node policy, formatter promotion, customer-data use and release channels keep their explicit approval gates.

Kernel/Stagehand remain a separate optional investigation in [issue #6](https://github.com/akornmeier/axe-core/issues/6), not a prerequisite or added dependency.

Authored with pi / gpt-6-astra. Earlier branch and PR #5 results are attributed historical evidence; only commands listed in the fresh baseline were executed during preparation.
