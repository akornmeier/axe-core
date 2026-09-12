# Local stateful host and one playbook: phase 2 evidence

September 12, 2026. One agent: pi / gpt-6-astra, session
`01a0962e-071f-7681-98bc-26b90fd97297`. Current worktree only:
`/Users/tk/Code/propellr-greenfield`, branch `feat/local-session-host`, base
`519f0c0bb04d38edfc68597b07dec56fae1b0a86`. Work was uncommitted at this validation stop.

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

## PR delivery and review update

Tony subsequently authorized filing, monitoring and merging [PR #11](https://github.com/asbury-labs/propellr/pull/11).
Phase 2 was committed at `df9f63b5`, rebased onto current `main`, and pushed as a
ready PR. Ubuntu 24.04 CI passed all 84 tests and static checks on that revision.
This extends the earlier local-only evidence; no publishing or phase 3 work.

Verified review findings prompted these repairs:

- Admission now uses the session's advertised document grants. Lost/ending sessions
  have none; later navigation cannot restore a lost session's grants.
- Confirmed dialog observations survive cancellation delivered during the browser
  await. Current-document/origin checks still reject stale observations.
- Failed subscriptions replay their original denial, including concurrent copies
  and reconnect. A successful subscription is established only once.
- Audit entries correlate applicable session/operation IDs, including request-ID
  conflicts, accepted scans/playbooks and inspect/cancel decisions.

The alleged early-loss shutdown deadlock was a false positive: the early return is
inside the async IIFE, so its attached `.finally()` still clears `record.active`
and resolves `done`. Added deterministic crash-event injection before deferred
startup on a real borrowed Page; ending the session completes and preserves the
lost operation. This fault-injection case is separate from real browser-close tests.

Focused review verification passed 15 host and 11 playbook cases. Two new real-browser
cases cancel exactly after visible/hidden observations. Cancellation now reports
confirmed rather than uncertain effects when those observations exist. One combined
host/playbook run had a WebKit journey failure; the documented serial commands
passed on rerun. The failure reason was not established, so no infrastructure cause
is claimed. Full `pnpm validate` then passed: build, all type scopes, lint,
Oxfmt, 62 contract tests, 15 host tests and 11 playbook tests. Latest-head CI and
bot review are recorded on the PR rather than asserted in advance here.

## Stop boundary

Phase 2 complete; phase 3 unstarted. Existing worktree tips and clean starting
state were inspected; no pre-existing edits needed reconciliation. Canonical
axe-core, other worktrees and global installations remain untouched. No staging,
commit, push, merge, PR action, publishing or live-channel work performed.
