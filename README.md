# Propellr

Private greenfield accessibility engine. Phase 2 adds a single-user local session
host, typed SDK/CLI and trusted `dialog-open-close@1` playbook. Sessions survive
client disconnects. **Browser analysis is unavailable:** dialog observations are
real, but scan checkpoints remain blocked. No accessibility parity or performance
claim. Phase 3 is not implemented.

## Development

Use Node **26.8.2** and project-scoped PNPM **12.4.1**. Do not replace global tools
or use the inherited migration workspace. `.node-version` records the Node pin;
activate an isolated Node installation before running commands.

```sh
node --version # v26.8.2
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/browsers"
npm exec --yes --package=pnpm@12.4.1 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@12.4.1 -- pnpm exec playwright install chromium firefox webkit
npm exec --yes --package=pnpm@12.4.1 -- pnpm validate
```

On supported CI Linux, provision browsers with `--with-deps`. `validate` runs
build, strict source/type examples, lint, required Oxfmt, contract tests, real Unix
IPC tests and browser playbook tests in Chromium/Firefox/WebKit. `test:host` builds
first because its CLI integration test runs emitted ESM. `format` is `oxfmt .`;
`format:check` is `oxfmt --check .`. Lifecycle scripts remain disabled by `.npmrc`.
No dependency pins changed in phase 2.

## Local use

macOS/Linux only. Start the built daemon with an explicit private directory whose
parent exists and is trusted. Directory must be user-owned 0700; socket is 0600.
Existing sockets/files are never taken over or deleted at startup. No TCP control
listener. Keep the browser-cache environment above when starting the daemon.

```sh
node dist/host/daemon.js /tmp/propellr-local-$UID
# Another terminal, same user:
printf '%s\n' '{"command":"open","input":{"protocol":"propellr/0.1","requestId":"open-1","policy":{"id":"local-fixture","version":"1"},"target":{"kind":"managed","browser":"chromium"}}}' \
  | node dist/host/cli.js /tmp/propellr-local-$UID/host.sock
```

CLI accepts one command envelope on stdin, returns `{lease, reply}` as JSON, and
exits nonzero for a rejected command. Pass the returned lease as its second
argument on later calls. Subscriptions emit JSON lines until disconnected.
Protect lease-bearing output as local session metadata. SIGINT/SIGTERM on the
daemon ends owned sessions; client exit does not. Command acceptance is not
operation completion or accessibility success.

SDK exports `LocalClient` from `dist/host/client.js`:

```ts
const client = await LocalClient.connect(socketPath); // save client.lease for reconnect
const opened = await client.open({
  protocol: "propellr/0.1",
  requestId: "open-1",
  policy: { id: "local-fixture", version: "1" },
  target: { kind: "managed", browser: "chromium" },
});
if (!opened.ok) throw new Error(opened.diagnostic.code);
const session = opened.value;
const document = session.documents[0];
if (!document) throw new Error("No live document");
const accepted = await client.runPlaybook({
  protocol: "propellr/0.1",
  requestId: "dialog-1",
  sessionId: session.id,
  playbook: { id: "dialog-open-close", version: "1" },
  inputs: { timeoutMs: 2000 },
  bindings: { document: { ...document, path: [] } },
  secretRefs: {},
});
// Inspect accepted.value.id or subscribe for the actual terminal outcome.
client.close(); // does not end session or replay any command
```

All seven methods share schema-inferred inputs: `open`, `inspect`, `scan`,
`runPlaybook`, `subscribe`, `cancel`, `end`. Use a fresh request ID for each new
inspection. Reconnect with `LocalClient.connect(socketPath, savedLease)`; never
blindly repeat an uncertain browser action. Same lease/request ID/content returns
the original acknowledgment, not a fresh operation snapshot. Changed content is
rejected. Reconnect subscriptions use a fresh request ID and last event cursor.
Breaking a subscription iterator closes that client's connection.

Embedding hosts use `SessionHost` and `startLocalServer` from `src/host/`. Borrowed
targets are host-provided `Map<string, Page>` registrations, never client-provided
endpoints. Ending one removes host listeners without closing its Page, context,
browser or owner connection. Hosts configure allowed browsers, origins/actions,
commands and immutable policy at startup. Registered borrowed Pages must already
show the controlled fixture. No arbitrary website journeys or secret inputs.

## Boundaries and limits

- `src/contracts.ts`: portable public types; verdicts, coverage, groups and gate
  policy remain separate. Current session document IDs support safe bindings.
- `src/validation.ts`, `src/host/requests.ts`: schema-inferred input decoding and
  host-owned grants. Unknown fields rejected; diagnostics never echo payloads.
- `src/host/`: private Unix IPC, bounded replay/events/audit, owned/borrowed browser
  lifecycle and fixed, reviewed dialog interactions. Managed browsers intercept
  the synthetic fixture URL and abort other network requests.
- `test/host/`, `test/playbooks/`: actual IPC and browser interactions, not a DOM
  emulator. Test fixture source lives in `src/host/fixture.ts` for daemon use too.
- Browser analysis/Vite builds, parity, reporting and benchmarks wait for phase 3.

Request frames: 65,536 UTF-8 bytes, 32 nested containers including framing.
Replies: 1 MiB. Tokens: 128 characters; distinct `session_`, `operation_`, `page_`
prefixes. Limits: 32 connections/boot-local leases, 256 requests per lease,
8 retained sessions, 32 operations and 64 events per session, 128 audit entries.
Operation eviction/event gaps are explicit. Leases and session slots are not
reclaimed in this first implementation: capacity exhaustion requires deliberate
host restart, not silent replay-history loss. End sessions before restarting.

Filesystem access is single-user authentication, not multi-tenant isolation.
Borrowed contexts keep their owner's network policy. No hostile-code sandbox,
durable crash recovery, hosted account, remote listener, enterprise secret store
or raw page/credential capture. SDK validates host envelopes and correlation;
full result schemas remain deferred. See [protocol and fixture contract](specs/local-host-protocol.md).

## TypeScript scopes

ESM/declarations emit to `dist/`. Portable/browser/host/test scopes have explicit
libraries and ambient types. Host source has no DOM globals; browser source has
no Node imports. Browser dependency declarations remain fully checked.

Dependency-only `skipLibCheck` exceptions:

- Portable: Zod 4.6.2 declares unused URL helpers requiring ambient web types.
- Host/build: Playwright 1.63.0 declarations reference DOM names (`Node`,
  `HTMLElementTagNameMap`, `SVGElement`) even for its Node adapter. Phase 2 exposed
  this on first import. No DOM library or fake globals added to host source.
- Test/tool: Vitest 5 declarations reference browser types and absent
  `@vitest/expect`; Vite/Vitest config declarations conflict under
  `exactOptionalPropertyTypes`.

Own source and negative type examples remain strict in every scope. These
exceptions do not suppress project errors or change tool pins.

## Requirements and provenance

- [Product direction](specs/propellr-product-brief.md)
- [Acceptance contract](specs/propellr-acceptance-contract.md)
- [Execution plan](specs/propellr-greenfield-foundation.html)
- [Phase 1 evidence](specs/foundation-validation.md)
- [Phase 2 evidence](specs/local-host-validation.md)
- [Provenance](PROVENANCE.md)

Canonical axe-core remains independent and untouched, never a dependency or the
Propellr implementation. No release, deploy or publishing automation exists.
