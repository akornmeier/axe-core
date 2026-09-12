# Local host protocol, phase 2

Single-user macOS/Linux host. Filesystem access is authentication: owned directory
0700, Unix socket 0600, no control TCP/HTTP listener. Every local connection has
the same configured user authority. This is not tenant isolation or a sandbox for
hostile pages/code. The host accepts only its configured policies, browsers and
borrowed Page registrations. No client endpoints, scripts or credentials.

## Framing and correlation

Before implementation: unsigned 32-bit big-endian byte length followed by UTF-8
JSON. Request frames at most 65,536 bytes, responses at most 1,048,576 bytes;
request nesting remains limited to 32. Invalid framing closes the connection.
A connection starts with `{kind:"hello"}` or `{kind:"hello", lease:"..."}`.
Host issues an opaque, boot-local lease. Unknown leases are rejected, never recreated.
After hello: `{kind:"request", request:{command,input}}`; replies use
`{kind:"reply", requestId, reply}`. Subscription deliveries use
`{kind:"delivery", requestId, delivery}` after an accepted subscription reply.
One active subscription per connection; disconnect ends delivery, not the session.
Explicit iterator return discards queued deliveries; natural completion drains them.
After the final end/cleanup event, `{kind:"complete", requestId}` completes the
subscription iterator without dropping other command replies. A subscription to an
ended session replays retained events and then completes. Browser loss alone does
not end the session's delivery; the client can still request end/cleanup.

Each lease retains at most 256 request IDs with payload digests and pending/final
replies. Same ID + same content returns the original reply, never repeats actions;
different content is rejected. No eviction: a full ledger rejects new requests.
At most 32 leases per host boot; restart loses live state and invalidates leases.
A fresh lease is a new caller correlation scope, not a license to retry uncertain
actions. SDK never automatically retries requests. Reconnect, inspect, then decide.
Re-establishing a successful subscription requires a fresh request ID and an event
cursor. Denied subscription requests replay their original diagnostic.

Limits: 32 connections, 8 in-flight requests per connection, 8 retained sessions,
32 retained operations per session, 64 events per session, 65 queued subscription
deliveries (64 events plus one replay gap). Limits are host configurable downward for tests. Session slots and
lease ledgers are not reclaimed in this first bounded host. Capacity exhaustion
is explicit; restart requires ending sessions, not invisible history eviction.
Slow consumers disconnect rather than grow queues. Partial frames time out.
Every request frame, including a replay attempt, counts against the per-connection
in-flight cap. Overflow closes the connection without deleting the lease ledger or
ending operations: reconnect with the same lease to inspect or replay admitted IDs.
Duplicate flooding cannot create unbounded reply waiters. Host shutdown waits for
in-flight browser initialization and its cleanup before returning. Rejected handshakes are
terminal; later frames cannot allocate a replacement lease on that connection.

Cursors contain session ID and monotonic sequence. Cross-session/future cursors
are rejected. Replaying before retention produces a gap then retained events.
Unknown/evicted operation inspection returns `operation-not-retained`, not empty
success. A retained operation belonging to another session is `permission-denied`.
Conflicting session actions are rejected. Browser/page loss marks active operations
lost with uncertain side effects; no action replay or live crash recovery.

## Trusted dialog fixture contract

Only `dialog-open-close@1` is registered. Host serves a repository-owned synthetic
fixture through Playwright routing at `http://propellr.invalid/dialog`, without
opening a network listener. Managed contexts block other HTTP/WebSocket requests, downloads and service
workers. Borrowed targets are explicit host-provided Pages, exclusively leased,
not arbitrary endpoints. Open rejects them unless they already display the configured
fixture URL.
Borrowed contexts retain their owner's network policy; this slice does not install
a customer-network firewall.

Input schema: optional `timeoutMs`, integer 100..10,000, default 2,000. No secret
references. Binding: one document target named `document`, empty path, current
host page/document IDs. Required actions: `dialog.open`, `dialog.close`. Required
origin: exact fixture origin. Prerequisite: exact fixture URL, one marked fixture,
visible opener, closed dialog. Checkpoints `opened` and `closed` observe actual
visibility; closed additionally checks returned focus. Each checkpoint records
observation but remains blocked by `scan-unavailable` until phase 3. Never emit
an accessibility pass, scan ID or completed scan. Failed setup skips checkpoints
with explicit reasons. Cleanup closes an open dialog if still authorized; failure
is explicit and cancellation preserves checkpoints. Navigation invalidates document
IDs; a changed document cannot commit an old checkpoint. Page scripts and external
browser users are not locked out, so this does not claim atomic DOM observation.

Audit retains only command, decision code, session/operation IDs and timestamp,
bounded to 128 entries. No payloads, URLs, selectors, browser error text, secrets
or lease tokens. Playbook records only its validated timeout input. Host policy is
copied on creation. No durable logs, remote identity or secret-store integration.
