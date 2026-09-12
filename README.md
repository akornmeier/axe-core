# Propellr

Private greenfield accessibility engine. Phase 1 implements typed contracts,
bounded JSON request decoding and host-supplied permission admission. No session
host, browser scanner, playbook executor, parity result or performance claim yet.

## Development

Use Node **26.8.2** and project-scoped PNPM **12.4.1**. Do not replace global tools
or use the inherited migration workspace. `.node-version` records the Node pin;
activate an isolated Node installation before running commands.

```sh
node --version # v26.8.2
npm exec --yes --package=pnpm@12.4.1 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@12.4.1 -- pnpm validate
npm exec --yes --package=pnpm@12.4.1 -- pnpm format
```

`validate` runs build, strict source/type examples, lint, required Oxfmt formatting
and real contract tests. `format` is `oxfmt .`; `format:check` is `oxfmt --check .`.
Lifecycle scripts remain disabled by `.npmrc`, including during frozen installs.
The pinned tools use published native optional dependencies without build scripts.
Review any dependency change before allowing lifecycle execution.

## Boundaries

- `src/contracts.ts`: portable public types. Inputs inferred from schemas; output
  unions retain incomplete/coverage, ownership and operation/result distinctions.
- `src/validation.ts`: input schemas used at the host boundary, not in browser
  analysis or per-node evaluation. IDs have distinct wire prefixes.
- `src/host/requests.ts`: decoder and caller-specific admission. No transport,
  listener or browser ownership implementation.
- `test/types/`: positive and negative contract and environment examples.
- `test/contracts/`: runtime decoder and permission tests under Vitest's Node project.

TypeScript emits ESM and declarations into `dist/`, including real validation and
admission code. Browser entry/Vite builds and browser Vitest projects are added
when browser implementations exist, under this same runner. They are not empty
or conditional success targets. Playwright and its matching Vitest provider are
pinned now; browser binaries are not provisioned by phase 1.

Portable, browser, host and test configurations have explicit libraries and
ambient types. Host/browser dependency declarations are checked. Portable checking
uses `skipLibCheck` because Zod 4.6.2 declares unused `URL` helpers requiring ambient
web types. Test/tool checking also uses it: Vitest 5 declarations reference browser
types and an absent `@vitest/expect` entry; Vite/Vitest's resolved config declarations
conflict under `exactOptionalPropertyTypes`. These exceptions skip dependency
`.d.ts` checks, not project source or negative examples. No fake DOM globals or
extra dependencies were added to hide these upstream declaration issues.

## Request boundary

Wire envelope: `{ "command": "end", "input": { "protocol": "propellr/0.1",
"requestId": "request-1", "sessionId": "session_one" } }`.

`decodeRequest(text)` returns a discriminated `Reply<Request>`. `admitRequest(text,
access)` additionally checks a **trusted host-owned** caller permission snapshot.
Never accept that snapshot from a client. The seven commands share schema-inferred
inputs. Selecting a policy, attached target, playbook version, secret reference,
operation or document does not grant access to it. Unknown fields are rejected.
Diagnostics do not echo submitted values or secrets.

Limits before JSON/schema recursion: 65,536 UTF-8 bytes and 32 nested containers.
Tokens are bounded to 128 characters. Session/operation/page IDs use `session_`,
`operation_` and `page_` followed by ASCII letters, digits or hyphens. Paths allow
64 steps, selectors 4,096 characters, scope 256 includes/excludes and explicit
rule selections 1,024 unique IDs. JSON values must be finite and serializable.

This is admission, **not complete execution authorization**. The future host must
resolve immutable manifests, validate playbook-specific inputs and required
origin/action permissions, recheck live documents/epochs, authenticate callers,
frame and limit incoming bytes before decoding, correlate/deduplicate requests,
authorize event cursors and preserve borrowed-browser ownership. Output validation,
reporting invariants, replay/cancellation and browser behavior remain later work.
TypeScript readonly is not a recursive runtime freeze or a security boundary.

## Requirements and provenance

- [Product direction](specs/propellr-product-brief.md)
- [Acceptance contract](specs/propellr-acceptance-contract.md)
- [Execution plan](specs/propellr-greenfield-foundation.html)
- [Phase 1 evidence](specs/foundation-validation.md)
- [Provenance](PROVENANCE.md)

Canonical axe-core is an independent comparison source, never a dependency or
Propellr implementation. No release, deploy or publishing automation exists.
