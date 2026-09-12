# Local stateful host and one playbook: phase 2 evidence

September 12, 2026. One agent: pi / gpt-6-astra, session
`01a0962e-071f-7681-98bc-26b90fd97297`. Current worktree only:
`/Users/tk/Code/propellr-greenfield`, branch `feat/local-session-host`, base
`519f0c0bb04d38edfc68597b07dec56fae1b0a86`. Work remains uncommitted.

## Implemented

- Private user-owned 0700 Unix IPC directory, 0600 socket, bounded length-prefixed
  frames, handshake leases, request correlation/digests and bounded non-evicting
  replay ledger. No control TCP/HTTP listener. Existing sockets are not taken over.
- SDK and stdin/JSON CLI share all seven commands. Client disconnect leaves live
  sessions/operations intact. Reconnection never automatically replays an action.
- Host-configured owned browsers and exclusive borrowed Page registrations.
  Borrowed end detaches host listeners without closing customer resources.
- Serialized conflicting operations, cooperative cancellation, explicit lost state,
  current document bindings, operation retention diagnostics and event replay gaps.
- One versioned, schema-validated dialog playbook. Fixed element handles cannot
  rebind in-flight actions to a navigated document. Actual open/close/focus
  observations, skipped prerequisites, partial coverage, cleanup failures and
  checkpoint retention on interruption are recorded.
- Host-owned grants and bounded metadata-only audit. No credential expansion or
  arbitrary playbook/code loading. Controlled synthetic fixture is routed inside
  Playwright, not served through a new HTTP listener. Owned contexts block other
  HTTP/WebSocket requests, service workers and downloads.

Transport limits and fixture expectations were specified in
[local-host-protocol.md](local-host-protocol.md) before implementation/tests.

## Executed checks

Environment: macOS 26.6.2 (25G83), arm64; isolated Node 26.8.2;
project-scoped PNPM 12.4.1; Playwright 1.63.0. Browser binaries provisioned with
`pnpm exec playwright install chromium firefox webkit` into this worktree's
ignored `.tools/browsers` cache:

| Engine                    | Provisioned version/revision |
| ------------------------- | ---------------------------- |
| Chromium / headless shell | 153.0.8010.12 / 1243         |
| Firefox                   | 155.0 / 1543                 |
| WebKit                    | 26.6 / 2359                  |

All commands ran under pinned Node/PNPM with `PLAYWRIGHT_BROWSERS_PATH` set to
that cache. Global tools and other worktrees were not changed.

- `pnpm install --frozen-lockfile`: passed, existing lockfile unchanged; lifecycle
  scripts remain disabled. No dependency pin or global tool upgrades.
- `pnpm validate`: build, all four strict source/type scopes, warning-free lint,
  required Oxfmt formatting, **62 contract tests, 13 host tests and 9 playbook
  tests passed**. CLI integration executes the built ESM through a child process.
- `pnpm test:host`: rerun after repairing loss/end race; 13 passed. Ending a lost
  session must not overwrite its lost operation with cancelled/completed state.
- `git diff --check`, `git diff --cached --check`: passed.
- Plan validator: passed before execution; append-only metadata checked against
  pre-edit snapshot after updating phase status/evidence.

Host cases cover actual Unix framing, disconnect/reconnect, replay/conflicting ID
reuse, bounded leases/requests/sessions/operations/events, event gaps, unauthorized
policy/target/session/secret access, redacted denial audit, concurrent operations,
cancellation and cleanup, borrowed ownership, cross-session document/operation
boundaries, browser loss/checkpoint retention, host restart, unsafe path refusal,
stream overflow and emitted CLI denial behavior.

Playbook cases execute Chromium, Firefox and WebKit with observed dialog visibility
and returned focus; each engine also executes a blocked prerequisite. Additional
Chromium cases exercise failed cleanup, navigation/stale bindings and invalid
playbook inputs/versions. Test pages are purpose-built local fixtures, not customer
pages. No screenshot, visual review or accessibility pass is claimed.

## Repairs and explicit limits

Initial runtime tests exposed an invalid Zod discriminated union with two `hello`
variants sharing the same discriminator. Replaced with a normal union and reran
real IPC tests. Cancellation test initially cancelled before side effects began;
it now waits for an actual open dialog and verifies eventual cancellation/cleanup.
Final source review identified the loss/end race; operation-terminal loss now
survives session lifecycle changes, verified by inspecting again after end.

First Playwright import exposed DOM names in its Node-facing dependency
`.d.ts` files. Added a documented **host/build dependency-only `skipLibCheck`**
exception. Host source still has no ambient DOM; negative examples remain checked.
No fake globals, DOM library, compiler fallback or dependency changes. Existing
portable/test declaration exceptions remain; browser declarations stay checked.

Scan requests terminate as `failed` with `scan-unavailable`. Observed playbook
checkpoints are `blocked`, never synthetic scan successes. Completed journeys
remain partial. No rule evaluator, reporting/grouping/gate implementation,
canonical comparison, parity suite or benchmark was built or executed.

Local single-user filesystem authority is not production multi-tenant isolation.
Borrowed Pages retain their owner's network policy. Full output schemas, arbitrary
site bindings, secret stores, remote/Windows transport, durable crash recovery,
forced-termination guarantees and enterprise identity remain deferred. Graceful
host restart and real browser loss were tested; host SIGKILL recovery was not.
Leases/session slots have explicit lifetime capacity limits, documented in README.
No memory benchmark or general network-security certification is claimed.

CI now provisions pinned browser revisions with Linux dependencies and runs the
same validation. CI was edited, **not dispatched or observed** for this phase.
Linux execution remains unverified here. No fresh disposable-checkout validation
was repeated in phase 2; phase 1's evidence remains historical.

## Stop boundary

Phase 2 complete; phase 3 unstarted. Existing worktree tips and clean starting
state were inspected; no pre-existing edits needed reconciliation. Canonical
axe-core, other worktrees and global installations remain untouched. No staging,
commit, push, merge, PR action, publishing or live-channel work performed.
