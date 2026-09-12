# Foundation validation

Phase 1 only, September 12, 2026. One agent: pi / gpt-6-astra, session
`01a095e0-cd7f-701c-91a3-cf37ea4a0cb5`.

Worktree: `/Users/tk/Code/propellr-greenfield`, branch
`feat/greenfield-foundation`, base
`46df83acde9421908d9b962d39d70b2da203426e`. The initial validation checkpoint used
staged, uncommitted implementation. Subsequent PR delivery is recorded below.

## Environment and installation review

- macOS arm64. Isolated Node 26.8.2 extracted beneath ignored `.tools/`, with its
  official SHA-256 checksum verified:
  `974b6d5fb2fc7c33ff2354db0902b4e91c2de01ec8acc6de48e543c97e18c9e1`
  (`node-v26.8.2-darwin-arm64.tar.gz`). Global Node remains 24.20.0.
- PNPM 12.4.1 executed through `npm exec --yes --package=pnpm@12.4.1 -- pnpm`.
  npm cache isolated beneath `.tools/`; no Corepack or global bootstrap changes.
  Normal content-addressable dependency cache was populated, not upgraded.
- Exact direct pins match the plan. Lockfile reviewed: one application importer,
  PNPM's separate package-manager lock document, registry integrity pins and
  platform-qualified optional native packages. No inherited/workspace/git
  dependencies or axe-core runtime/reference dependency.
- Reviewed Node release notes, PNPM 12.4.1 changes and wrapper installation code,
  TypeScript native-port notes, Vite 8 migration and Vitest 5 migration guidance.
  PNPM's wrapper links a platform-native binary; TypeScript 7 uses native `tsc`.
  Vite uses Rolldown/Oxc. Vitest project-wide `passWithNoTests` belongs at the root.
- Initial and frozen installs keep lifecycle scripts disabled through `.npmrc`.
  Registry/native metadata and installed manifests reviewed before use. Installed
  packages exposed only development `prepare` scripts in lightningcss/tinyexec;
  none were enabled. Native TS, Oxc and Rolldown worked without install scripts.
  This is not a claim to audit binary implementation or execute dependency builds.

## Executed checks

Commands below ran with pinned Node/PNPM in the new worktree:

| Check                                   | Result                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Initial `pnpm install --ignore-scripts` | Passed, generated new lockfile; 67 installed packages                                              |
| `pnpm install --frozen-lockfile`        | Passed with lifecycle scripts disabled                                                             |
| `pnpm typecheck`                        | Passed portable/browser/host/test scopes and positive/negative type examples                       |
| `pnpm build`                            | Passed, emitted ESM and declarations for contracts, schemas and request admission                  |
| `pnpm lint`                             | Passed with warnings denied                                                                        |
| `pnpm format` then `pnpm format:check`  | Passed using Oxfmt 0.67.0 only                                                                     |
| `pnpm test:contracts`                   | Passed: 1 file, 62 tests, no skipped/todo cases                                                    |
| `pnpm validate`                         | Passed combined gate                                                                               |
| Emitted ESM import/assertions           | Passed real decoded command and denied admission; contracts module exports no runtime dependencies |
| Plan validator with pre-edit snapshot   | Passed; append-only metadata and original creation time retained                                   |

Runtime tests cover all seven command shapes, invalid protocol/IDs/JSON,
non-finite numbers, unknown fields/self-granted authority, attached endpoints,
empty/duplicate rule selections, scope, UTF-8 byte and nesting bounds, host-owned
capabilities, session/operation/document access, exact policy/playbook versions,
secret references and non-echoing diagnostics.

## Fresh checkout and preservation

A fresh `git checkout-index` export at
`/tmp/propellr-foundation-verify-01a095e0` contained tracked project files only, with
no copied `node_modules`, build output or local Node installation. Using the
isolated Node executable on PATH, `pnpm install --frozen-lockfile` installed all
67 packages there and `pnpm validate` passed every gate, including all 62 tests.
The frozen checkout's lockfile remained byte-identical to the reviewed source.
This verifies a fresh index checkout, not a committed revision or Linux CI.

`git diff --check` and `git diff --cached --check` passed. Preparation's tracked
diff and full status match their pre-run captures; only the already-untracked
execution plan was edited there. Other worktree branch tips remain unchanged,
canonical axe-core remains clean, and global Node/PNPM remain 24.20.0/9.15.4.
The inherited license is byte-identical to its source. Local requirement/evidence
links resolve. The new index has one private root project and one validation
workflow, no packages directory, workspace manifest or release/deploy workflows.
Large staged deletions remove inherited files in this new worktree only, not
history or any existing checkout.

## Repairs and declared exceptions

Initial typecheck failed on Zod's ambient `URL` declaration in the portable scope,
and Vitest/Vite dependency declarations in the test/tool scope. `skipLibCheck` is
limited to those two scopes; project source and examples remain strict. Host and
browser dependency declarations still receive full checking. No ambient DOM types
were added to host code, and no Node types were added to browser code.

Moved Vitest's `passWithNoTests` to the root after its pinned types rejected it in
an inline project. Removed an unused-expression lint failure in a negative type
example. Formatting moved a negative directive away from its error; relocated it
to the offending property. The same gates were rerun and passed after repairs.

Browser Vitest projects and Vite entry builds are intentionally added with actual
browser implementations, not as empty phase-1 targets. Input schemas/admission are
implemented; output validation, dynamic playbook-specific JSON Schema validation,
origin/action execution policy and transport authentication remain host-phase work.

## Deferred and prohibited work

No browser binaries installed; no browser/UI/a11y pass claimed. No local IPC,
session persistence, playbook execution, parity, reporting/deduplication or
benchmarks run. `test:host`, `test:playbooks`, `test:parity`, `test:reporting` and
`bench:slice` are not yet scripts, rather than empty successes. CI workflow is
written but not dispatched or verified on Linux. The initial phase-1 run made no commits, pushes, PR actions,
merges, publishing, production access or customer-data use.

## PR delivery

Tony subsequently authorized push, a ready PR, CI/review monitoring and merge.
Implementation commit `44bfb559df534285dff1ce20ff6b0815ac04ec03` rebases only
phase 1 onto latest `main@3a9d1ff08d707f3b0a08c8543d0f2584718b7eaf`.
The rebased tree is byte-identical to the validated implementation tree; prior
preparation repair commits are not included as PR ancestors.

Reviewed overlap with PRs #8 and #9. Their inherited CI routing, package-graph
cleanup and contributor guidance are superseded by this private root and its
single main-routed validation workflow. Neither old PR needs to merge first;
merging either afterward would reintroduce obsolete tooling. Both remain open,
with branch history and existing worktrees preserved. No release/deploy workflow
survives in the new root. Phase 2 and publishing remain outside this delivery.
