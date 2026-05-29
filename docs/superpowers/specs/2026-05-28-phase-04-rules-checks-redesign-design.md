# Phase 4 — Rules & Checks System Redesign

**Status:** Design (pending review)
**Date:** 2026-05-28
**Author:** Tony Kornmeier
**Supersedes constraints in:** `specs/PRD-04-rules-checks-optimization.md`

---

## Context & Constraint Inversion

PRD-04 was written assuming backward compatibility with the existing public API and
the browser-injected execution model. Those constraints are **lifted**. This redesign
targets:

- **No backward-compatibility requirement** for the public API or result shape. A
  legacy-compatibility *reporter* is provided as a migration on-ramp, but the engine's
  native shape is free to change.
- **Node 24 LTS** as the baseline (Node 26 LTS lands 2027). Modern JS/TS only —
  `worker_threads`, `SharedArrayBuffer`, `AbortSignal`, async iterators, `node:sqlite`,
  structured clone, `Intl.*`, ES2022 error causes are all on the table.
- **Maximum type-safety** via Zod schemas as the single source of truth for both
  runtime validation and compile-time types.
- **20-year extensibility horizon** — pluggable hosts, pluggable rule packs, an
  agent-native surface, and an architecture with no global singletons.

The rule logic is sound and hard-won; the *packaging* of that logic — JSON metadata,
generated function maps, a global `axe._audit` singleton, a one-shot Promise API, a
browser-only runtime — is what this redesign replaces.

### Current-state findings (from codebase exploration)

- Engine is **browser-only at runtime**; `engines.node >= 20` is build-time only.
  `axe._audit` is a `window`-scoped singleton; cross-iframe coordination uses a
  `postMessage`-based `frame-messenger`. No `worker_threads` or Web Worker usage exists.
- **Single-flight**: an `axe._running` boolean lock permits only one audit at a time
  per global.
- Public API is wide: `run`, `runPartial`, `configure`, `setup`, `teardown`, `getRules`,
  `runVirtualRule`, `cleanup`, `finishRun`, `plugins`, `reporter`, `frameMessenger`.
- Already ships dual ESM/CJS via package `exports`.
- VTree (`VirtualNode`) wraps a live `Element` plus a memoization cache — browser-coupled,
  non-serializable, cannot cross threads.
- **No** `MutationObserver` / incremental / watch / delta APIs exist anywhere today.

---

## Locked Decisions

These ten decisions were resolved during the brainstorming session and govern the design.

| # | Decision | Choice |
|---|---|---|
| 1 | Execution model | **Node host + browser adapter** as first-class peers |
| 2 | DOM access | **VTree facade + Source + Watcher** — three orthogonal pluggable layers |
| 3 | Run-loop contract | **`AsyncIterable<AuditEvent>` + `AbortSignal`** (stdlib, no RxJS) |
| 4 | Rule shape | **`defineRule({...})` factory** — 3-phase, async, module-imported checks, Zod-typed |
| 5 | Extension model | **`category` field + `extendRule()` + array rulesets**, no central registry |
| 6 | Worker sharding | **`(rule, subtree)` tasks, SAB snapshot, auto-sized pool** |
| 7 | Distribution | **Scoped packages + `axe-core` meta-bundle** |
| 8 | Snapshot format | **CDP `DOMSnapshot` in, ArrayBuffer `FlatTree` internal** |
| 9 | Zod posture | **Tiered** — validate at trust boundaries (rules / snapshot / options), strip from hot paths |
| 10 | Rollout | **Parallel-engine, opt-in v5** (build alongside current; cut over when validated) |

---

## Section 1 — System Architecture

Four layers plus a plugin perimeter. Data flows top-down; events flow bottom-up.

```
CONSUMER
  for await (const event of auditor.audit({signal})) { ... }
        │
LAYER 4 — Auditor (orchestration)
  • Owns the AsyncIterable<AuditEvent> contract
  • Drives the worker pool
  • Threads AbortSignal through every layer
  • Validates trust-boundary inputs via Zod (rules, options)
        │
LAYER 3 — Rule engine (composition + dispatch)
  • Walks the FlatTree
  • matches() filters applicable nodes
  • Dispatches checks via any/all/none semantics
  • Runs after() reducers
  • Emits AuditEvents
        │
LAYER 2 — Facade (host-agnostic DOM read)
  • AxeElement / AxeNode / AxeStyle interface
  • Backed by FlatTree (ArrayBuffer-packed)
  • Lazy accessors; no per-node allocation on hot paths
        │
LAYER 1 — Source + Watcher (host adapters)
  • LiveDomSource (browser) / SnapshotSource (Node)
  • MutationWatcher / PlaywrightWatcher / OneShot
  • Snapshots into FlatTree; emits subtree-dirty for incremental

PLUGIN PERIMETER (exterior npm packages, composed by the consumer)
  • Rule packages (@axe-core/rules-*)   • Check library (@axe-core/checks)
  • Reporters (@axe-core/reporters)     • Standards data (@axe-core/standards)
  • Custom org / Design-System rule packages
```

### Invariants

- **No globals.** No `axe._audit`, no `axe._running`. Each `createAuditor()` returns an
  independent instance. Concurrent audits in one process are first-class.
- **Layers communicate only through typed interfaces.** A check sees only an
  `AxeElement`; it never touches `Source`, `Watcher`, or the `FlatTree` directly.
- **Plugins are separate npm packages**, installed and composed by the consumer (or
  pre-composed in the `axe-core` meta-bundle).
- **Hosts implement Layer 1 only** and inherit Layers 2–4. A new host (Bun, Deno,
  Cloudflare Workers) writes a `Source` + `Watcher` pair.

### Package map

```
@axe-core/engine          Layers 3 + 4 + facade types
@axe-core/schemas         Zod schemas + inferred types (exists; expanded)
@axe-core/checks          Shared check library (pure fns over AxeElement)
@axe-core/standards       ARIA/HTML element data — typed constants
@axe-core/host-browser    LiveDomSource, MutationWatcher
@axe-core/host-node       SnapshotSource (Playwright/CDP), worker pool
@axe-core/rules-wcag22a   Rules by WCAG level
@axe-core/rules-wcag22aa
@axe-core/rules-wcag22aaa
@axe-core/rules-best-practices
@axe-core/rules-section508
@axe-core/rules-experimental
@axe-core/reporters       JSON, NDJSON, SARIF, JUnit, HTML, console, CSV, markdown, agent, legacy-v4
@axe-core/cli             Agent-native CLI (typed exit codes, auto-JSON pipe)
@axe-core/history         SQLite observatory + compound queries
@axe-core/mcp-server      MCP tools exposing audits + history to agents
@axe-core/build-tools     Vite plugins for rule-pack authors (private)
axe-core                  Meta-bundle: engine + host-browser + WCAG 2.2 AA + best-practices + reporters
```

---

## Section 2 — Data Flow

Two lifecycles share one event contract; only the trigger differs.

### 2a. One-shot audit lifecycle

```
createAuditor()  ──Zod(boundary 1: rules+source+watcher)──► Auditor instance
                                                              (frozen ruleset, bound
                                                               source/watcher, lazy
                                                               worker pool, event mux)
audit({signal})  ──Zod(boundary 3: options)──► source.ingest()
                                                  ──Zod(boundary 2: snapshot)──►
                                                  build FlatTree, compute subtree partitions
                                                       │
                                                       ▼
                                                Layer 3 scheduler:
                                                  for each (rule, subtree): enqueue task
                                                       │
                                                       ▼
                                                Worker pool (SAB-shared tree):
                                                  matches → checks → after; emit events
                                                       │
                                                       ▼
                                                Event multiplexer (merge, order by rule)
                                                       │
                                                       ▼
                                                AsyncIterable<AuditEvent> → consumer drains
                                                  signal.aborted? → stop, pool cancels, cleanup
```

### 2b. Continuous watch lifecycle

The iterator returned by `audit()` does **not** terminate until `signal.aborted` when a
watcher is attached. After the initial full cycle (which emits `audit-finished` as a
sync point), the auditor idles with the watcher armed. A DOM mutation → debounced
`subtree-dirty` event → `source.refresh(dirtyNodeIds)` rebuilds only affected FlatTree
ranges → only `(rule, dirty-subtree)` tasks for applicable rules run → another
`audit-finished` marks the incremental cycle end → return to idle.

### 2c. Worked example — one audit on a Playwright fixture

```ts
import { createAuditor, collectResults, OneShot } from '@axe-core/engine';
import { SnapshotSource } from '@axe-core/host-node';
import { wcag22aa } from '@axe-core/rules-wcag22aa';
import { chromium } from 'playwright';

const page = await (await chromium.launch()).newPage();
await page.goto('https://example.com');

const cdp = await page.context().newCDPSession(page);
const snapshot = await cdp.send('DOMSnapshot.captureSnapshot', {
  computedStyles: ['color', 'background-color', 'font-size', 'font-weight'],
  includeDOMRects: true,
});

const auditor = createAuditor({                 // Zod boundary 1
  rules: wcag22aa,
  source: new SnapshotSource(),
  watcher: new OneShot(),
});
await auditor.ingest(snapshot);                 // Zod boundary 2

const ac = new AbortController();
const violations = [];
for await (const event of auditor.audit({ signal: ac.signal })) {  // Zod boundary 3
  if (event.type === 'result' && event.result.status === 'violation') {
    violations.push(event.result);
    if (violations.length >= 100) ac.abort();   // early bail on huge pages
  }
  if (event.type === 'audit-finished') break;
}
await auditor.dispose();                         // release SAB, workers, snapshot
```

### 2d. Notes

- **Event ordering is per-rule, not global.** Within a rule, order is deterministic
  (`rule-started` → check results → `rule-finished`). Across rules, events interleave by
  worker completion. Global ordering requires buffering until `audit-finished`.
- **Backpressure is automatic.** A slow consumer fills the multiplexer buffer, which
  stalls the pool; workers go idle rather than computing ahead.
- **Snapshot lifetime is tied to the auditor.** `dispose()` releases SAB and clears the
  FlatTree. Watcher mode persists the snapshot and partial-refreshes on mutation.
- **Cancellation is cooperative.** Workers check `signal.aborted` between checks;
  worst-case lag is one check execution.

---

## Section 2.5 — Result Schema

### Why the legacy shape is replaced

Today's results use four parallel arrays (`violations`/`passes`/`incomplete`/`inapplicable`)
of deeply nested records (5 levels: `violations[i].nodes[j].any[k].relatedNodes[l]`),
with no stable IDs, overloaded `tags`, embedded raw `html`, no `category`, duplicated
per-frame entries, and a shape designed for a one-shot dump rather than streaming.

### Normalized schema with stable IDs

The result is **two complementary shapes** over one record set: `AuditEvent` (flows
through the iterator) and `AuditResults` (the collected snapshot). Both reference the
same flat record types.

```ts
type AuditId   = string;   // ULID; one per audit() invocation
type FrameId   = string;   // ULID; one per (audit, frame) pair
type ResultId  = string;   // content-hash(ruleId + nodePath + status) — stable across runs
type RuleId    = string;
type CheckId   = string;
type NodeId    = string;   // (frameId + flat-tree index) — stable within an audit

type Status = 'violation' | 'pass' | 'incomplete' | 'inapplicable';
type Impact = 'minor' | 'moderate' | 'serious' | 'critical';

interface Audit {
  id: AuditId; startedAt: string; finishedAt: string; durationMs: number;
  engine: { name: 'axe-core'; version: string };
  runtime: { name: string; version: string };
  // `source` owns capture metadata AND per-capture viewport. Per-page viewport for
  // multi-page audits lives on each Page (Page.viewport), not here. The legacy
  // top-level testEnvironment viewport fields collapse into these two homes.
  source: {
    kind: 'cdp-snapshot' | 'live-dom' | 'playwright';
    capturedAt: string;
    viewport?: { w: number; h: number };   // primary-frame capture viewport
  };
  rules: { id: RuleId; version: string; category: string }[];
  page: Page; frames: Frame[];
  locale: { primary: string; direction: 'ltr' | 'rtl'; fallbacks: string[] };
  summary: {
    counts: Record<Status, number>;
    byCategory: Record<string, Record<Status, number>>;
    byImpact: Record<Impact, number>;
  };
  errors: ErrorLedger;        // see Section 8j
}

interface Page  { id: FrameId; url: string; title: string; viewport: {w:number;h:number} }
interface Frame { id: FrameId; parentFrameId: FrameId | null; url: string;
                  origin: string; isOOPIF: boolean; shadowDepth: number }

interface AuditNode {
  id: NodeId; frameId: FrameId;
  selector: string;            // canonical CSS selector
  ancestry: string[];          // one entry per shadow/iframe boundary crossed
  xpath: string;
  role: string | null; accessibleName: string | null;
  outerHtmlHash: string;       // hash, not the HTML itself
  originSource?: OriginSource; // optional source attribution; see Section 7.5
}

interface OriginSource {
  file: string; line?: number; column?: number; component?: string;
  attributedBy: 'sourcemap' | 'framework-instrumentation' | 'storybook' | 'data-attr';
  confidence: 'exact' | 'heuristic';
}

interface Result {
  id: ResultId; status: Status; auditId: AuditId;
  ruleId: RuleId; category: string; impact: Impact;
  node: NodeId;                // reference, not nested object
  checks: CheckOutcome[];
  ruleSatisfaction: {
    any:  { satisfied: boolean; checkIds: CheckId[] };
    all:  { satisfied: boolean; checkIds: CheckId[] };
    none: { satisfied: boolean; checkIds: CheckId[] };
  };
  message: string; helpUrl: string; tags: string[];
  relatedNodes: NodeId[];      // references
  occurredAt: string;
  fingerprints: Fingerprints;  // see Section 2.6
  rootCauseResultId?: ResultId;
  cascadeDepth: number;
}

interface CheckOutcome {
  checkId: CheckId; passed: boolean | 'incomplete';
  data: unknown; message: string; relatedNodes: NodeId[];
}

interface AuditResults {
  audit: Audit;
  pages: Record<FrameId, Page | Frame>;
  nodes: Record<NodeId, AuditNode>;
  results: Result[];                       // single flat array
  byStatus: Record<Status, ResultId[]>;
  byRule: Record<RuleId, ResultId[]>;
  byNode: Record<NodeId, ResultId[]>;
  byFrame: Record<FrameId, ResultId[]>;
  byFingerprint: { strict: Record<string, ResultId[]>;
                   loose: Record<string, ResultId[]>;
                   component: Record<string, ResultId[]> };
  rootCauses: ResultId[];
  errors: ErrorLedger;
  rollupBy(strategy: string): Map<string, RollupGroup>;
}
```

### Wins

- Single flat `results` array → one-pass filtering by status/category/rule.
- Stable `id` → cross-run diffing, ticket references, acknowledge workflows.
- Nodes referenced, not embedded → 40–60% smaller payloads on multi-node violations.
- `category` first-class → a11y / Design-System / org-policy interleave with clean filtering.
- Multi-frame/page native → `frames[]` and `pages` are top-level entities.
- Streaming-compatible → every `Result` is emittable as a `{type:'result'}` event.
- Normalized → maps directly to SQL tables / GraphQL types for analytics.
- No raw HTML → `outerHtmlHash` for dedup/diff; raw HTML via opt-in `snapshotNode()`.

### Selector strategy

`selector` is a single canonical CSS selector (id > unique class chain > nth-child).
`ancestry` is the boundary-crossing chain (replaces legacy `target[]`). `xpath` is kept
for tooling but is not authoritative. Boundary syntax: `>>` enters an iframe, `>>>`
enters an open shadow root (see Section 7).

### Source attribution (planned, not guaranteed)

`originSource` is optional and populated only when a host can attribute a DOM node to
source (Storybook story metadata, framework build-time instrumentation, source-map +
CDP stack capture, or a `data-source-*` attribute). When present, SARIF gets true
file/line locations enabling inline PR annotation. When absent, SARIF falls back to
logical locations and PR checks show browsable summaries without inline annotation.
**This is a planned capability, not delivered in the base Phase 4.**

### Cuts

- `failureSummary` → replaced by structured `message` + reporter-side formatting.
- `html` field → replaced by `outerHtmlHash` + opt-in lookup.
- Top-level `testEnvironment` viewport fields → moved into `Audit.source.viewport`
  (primary capture) and `Page.viewport` (per-page, multi-page audits).
- Four parallel arrays → one `results[]` with a `status` field.

---

## Section 2.6 — Dedup & Fingerprinting

### Six duplication patterns

| Pattern | Example | Today |
|---|---|---|
| 1. Identical re-runs | Same page audited twice | Two unlinked blobs |
| 2. Component instances | `<Button>` w/o label appears 50× | 50 unlinked violations |
| 3. Iframe replication | Same nav bar in 12 iframes | 12 unlinked violations |
| 4. Cross-page repetition | Site-wide footer over 100 pages | 100 unlinked violations |
| 5. Cascade failures | Hidden ancestor → 100 descendants | 100 unlinked violations |
| 6. Watcher re-audits | MutationObserver re-emits same bug | Continuous redundancy |

### Two-level identity (Sentry/Bugsnag model)

- **`ResultId`** — identity of *this occurrence* (audit × node × rule). Stable across re-runs.
- **`FingerprintId`** — identity of *the underlying defect*. Multiple results sharing a
  fingerprint are the same bug observed in different places.

**Cross-run stability invariant:** neither `ResultId` nor any `FingerprintId` may depend
on the audit-scoped `NodeId` (which encodes a flat-tree index and is stable only *within*
one audit). `ResultId` hashes the canonical node *path* (`selector` + `ancestry`), and
fingerprints hash canonical structural patterns + check-data projections. NodeId is never
an input to cross-run identity. This is load-bearing for diffing, `priorResults`, and the
history observatory (Section 7.6).

### Three default fingerprint dimensions

```ts
interface Fingerprints {
  strict: string;            // rule + canonical element pattern + check-data projection
  loose: string;             // rule + element role/tag only
  component: string | null;  // rule + nearest component marker (null if none detected)
  custom: Record<string, string>;
}
```

- **strict** — same defect in identical structural contexts. Excludes instance bits
  (`id`, `data-testid`, free text). Handles patterns 2 & 3.
- **loose** — same *kind* of bug regardless of context. Site-wide rule rollups.
- **component** — same defect within the same component marker (custom element tag,
  `data-component`, framework attrs, nearest stable identifier). `null` when no marker
  found — explicit absence beats a misleading fingerprint. Handles pattern 4.

### Check-supplied projections

Each check exports `fingerprintProjection(data) => unknown` that collapses
instance-specific values into structural equivalence classes (e.g. color-contrast
`{ratio:4.2, fg:'#777', …}` → `{contrastBand:'sub-4.5-normal', fontSizeBucket:'normal'}`).
The `strict` fingerprint hashes this projection. Checks without a projection fall back to
the raw `data` field (less aggressive grouping).

### Cascade detection

During `after()`, the engine builds an ancestor index of a rule's violating nodes. A
violation whose ancestor is also in the violation set gets `cascadeDepth = parent+1` and
`rootCauseResultId = nearest ancestor violation`. Consumers collapse cascades via
`results.filter(r => r.cascadeDepth === 0)` ("1 hidden ancestor, 99 descendants").

### Query surface

`AuditResults.rollupBy(strategy)` returns `Map<FingerprintId, RollupGroup>` where each
group carries an exemplar `Result`, occurrence `ResultId[]`, count, and affected
nodes/frames/pages. `byFingerprint` and `rootCauses` are pre-computed indexes.

### Frame-boundary policies

| Fingerprint | Frame-spanning default | Rationale |
|---|---|---|
| strict | Frame-scoped | Different frames may have legitimately different contexts |
| loose | Frame-spanning | Rule + role + tag is frame-agnostic |
| component | Frame-spanning when marker present | Same web component across iframes IS one defect |

Override via `audit({ fingerprintPolicy: { strict: { frameAgnostic: true } } })` — the
Storybook "same component in N iframes" rollup.

### Watcher-mode dedup

`audit({ dedup: 'fingerprint:strict' })` maintains a session seen-set: first occurrence
emits a full `result`; subsequent occurrences emit a lightweight `result-occurrence`
delta; when occurrence count hits zero, emit `result-resolved`.

### Cross-audit diff (CI)

`audit({ priorResults })` diffs by `strict` fingerprint, emitting `result-new`,
`result-persists`, `result-resolved`, `result-changed`. Enables "this PR introduces 3
new violations and resolves 2."

### Performance

`strict` ≈ 50µs/result, `component` ≈ 20µs (lazy on first access), `loose` ≈ 5µs.
Default computes strict+loose eagerly. `audit({ fingerprints: 'loose-only' })` opts out
for hot streaming paths. ~700ms total on a 10K-result page.

### Cuts

- No single forced canonical fingerprint — consumers need different rollups.
- No engine-side persistence — consumers supply `priorResults`; persistence belongs in
  `@axe-core/history` (Section 7.6). Engine stays stateless between audits.

---

## Section 3 — Public API Surface

### Consumer surface (`@axe-core/engine`)

```ts
export function createAuditor(opts: AuditorOptions): Auditor;

interface AuditorOptions {
  rules: Rule[];
  source: Source;
  watcher?: Watcher;                       // default OneShot
  workerPool?: WorkerPoolOptions | false;  // false = main thread only
  trustedInput?: boolean;                  // skip Zod boundary 2 (snapshot)
  defaultCategory?: string;                // 'a11y' if a rule omits its own
  defaultDedup?: DedupStrategy;
  reporter?: Reporter | Reporter[];
  locale?: LocaleBundle;
}

interface Auditor {
  readonly id: AuditId;
  readonly rules: ReadonlyArray<Rule>;
  ingest(snapshot: DomSnapshot): Promise<void>;          // Node host
  attach(root: Document | ShadowRoot): Promise<void>;    // Browser host
  audit(opts?: AuditOptions): AsyncIterable<AuditEvent>;
  refresh(nodeIds?: NodeId[]): Promise<void>;
  setLocale(bundle: LocaleBundle): void;
  dispose(): Promise<void>;
}

// PRECONDITION: audit() rejects (AxeStateError) if neither ingest() nor attach()
// has completed for this auditor. There is no implicit snapshot — the consumer
// must supply one before auditing.

interface AuditOptions {
  signal?: AbortSignal;
  include?: string[]; exclude?: string[];
  runOnly?: { type: 'tag' | 'rule' | 'category'; values: string[] };
  fingerprints?: 'all' | 'loose-only' | 'none';
  fingerprintPolicy?: Record<string, { frameAgnostic?: boolean }>;
  dedup?: DedupStrategy;
  priorResults?: AuditResults | string;
  reporters?: Reporter[];
}

type DedupStrategy = 'none' | 'fingerprint:strict' | 'fingerprint:loose'
                   | 'fingerprint:component' | { custom: string };

export async function collectResults(events: AsyncIterable<AuditEvent>): Promise<AuditResults>;
```

### Rule authoring

```ts
export function defineRule<TCheckData = unknown>(def: RuleDefinitionInput<TCheckData>): Rule<TCheckData>;

interface RuleDefinitionInput<TCheckData> {
  id: string; category?: string; impact: Impact;
  tags: string[]; actIds?: string[]; metadata: RuleMetadata;
  matches?: Matches;
  checks: { any: CheckRef<TCheckData>[]; all: CheckRef<TCheckData>[]; none: CheckRef<TCheckData>[] };
  after?: After<TCheckData>;
  excludeHidden?: boolean; pageLevel?: boolean; enabled?: boolean;
  deprecated?: DeprecationInfo; experimentalUntil?: string;
  fixHint?: (result: Result, node: AxeElement) => FixHint | null;   // see Section 7.5
  examples?: RuleExample[];
}

type Matches = (node: AxeElement, ctx: RuleContext, signal: AbortSignal) => boolean | Promise<boolean>;
type After<T> = (results: PreliminaryResult<T>[], ctx: RuleContext, signal: AbortSignal) => Promise<Result[]>;

export function defineCheck<TData = unknown>(def: CheckDefinitionInput<TData>): Check<TData>;

interface CheckDefinitionInput<TData> {
  id: string;
  evaluate: (node: AxeElement, opts: CheckOptions, ctx: CheckContext, signal: AbortSignal)
            => Promise<CheckEvaluation<TData>>;
  options?: Record<string, unknown>;
  optionsSchema?: ZodSchema; dataSchema?: ZodSchema<TData>;
  fingerprintProjection?: (data: TData) => unknown;
  messages: CheckMessages; metadata: CheckMetadata;
}

type CheckEvaluation<TData> =
  | { passed: true; data?: TData }
  | { passed: false; data?: TData; reason?: string }
  | { passed: 'incomplete'; data?: TData; reason: string };

export function extendRule<T>(base: Rule<T>, overrides: Partial<RuleDefinitionInput<T>>): Rule<T>;
// id MUST be supplied in overrides. checks arrays are FULL REPLACEMENT (to extend, spread
// the base: [...base.checks.any, newCheck]). metadata is shallow-merged. Returns a frozen
// new rule; base is untouched.
```

### Host implementer surface

```ts
export interface Source {
  readonly kind: string;
  ingest(input: unknown): Promise<FlatTree>;
  refresh(tree: FlatTree, nodeIds: NodeId[]): Promise<void>;
  snapshotNode(nodeId: NodeId): Promise<string>;
  serialize(tree: FlatTree): unknown;
  attachFrameCollector?(collector: FrameCollector): void;   // see Section 7
  dispose(): Promise<void>;
}

export interface Watcher {
  readonly kind: string;
  start(emit: (event: WatcherEvent) => void, signal: AbortSignal): Promise<void>;
  pause(): void; resume(): void; dispose(): Promise<void>;
}

type WatcherEvent =
  | { type: 'subtree-dirty'; nodeIds: NodeId[]; mutationKind: string }
  | { type: 'full-rescan'; reason: string }
  | { type: 'document-replaced' }
  | { type: 'idle' };
```

### Not exported (internal)

`FlatTree` class, `WorkerPool`, `MessagePort`/`Worker` primitives, fingerprint hash
internals. The `metadata-function-map` codegen is **deleted** — rule packs import their
checks directly (tree-shakeable).

### Meta-bundle (`axe-core`) surface

```ts
export { createAuditor, collectResults, defineRule, defineCheck, extendRule } from '@axe-core/engine';
export { LiveDomSource, MutationWatcher } from '@axe-core/host-browser';
export { wcag22aa, bestPractices } from './bundled-rules';
export type * from '@axe-core/schemas';
```

---

## Section 4 — Concurrency Model

Three tiers.

### Tier C — process-level (multiple auditors)

No module-level state exists in `@axe-core/engine`. Each `Auditor` owns its FlatTree
(separate SAB), worker pool (or shared, see below), event multiplexer, dedup seen-set,
and `AbortController` chain. `Promise.all` over many auditors runs truly concurrently —
the `_running` global lock is gone. Unlocks parallel CI URL audits, hosted audit
services, MCP servers serving multiple agents, parallel Jest tests.

### Tier B — intra-auditor (worker pool)

```
audit() → Scheduler:
  ① partition FlatTree into subtrees (balance node count, ~500 nodes each)
  ② produce (rule, subtree) task list
  ③ enqueue into pool queue
→ WorkerPool:
  • auto-sized: min(availableParallelism()|hardwareConcurrency, rules.length*4)
  • SAB-broadcast snapshot once; workers pull tasks via Atomics.wait/notify
  • each task result → postMessage → multiplexer
→ Multiplexer:
  • merge worker streams, order by (ruleId, completion)
  • backpressure: slow consumer stalls the pool
```

SAB transport when `SharedArrayBuffer` exists and (browser) `crossOriginIsolated`;
otherwise `structuredClone` fallback (logged once at audit start). Browser +
`LiveDomSource` → workers disabled, main-thread sequential, same code path
(`poolSize === 0`).

### Tier A — intra-task (cooperative cancellation)

Each task runs `matches → checks → after` for one `(rule, subtree)`, checking
`signal.aborted` between checks. Cancellation chain: consumer `ac.abort()` → auditor
signal → pool stops dispatch → task signal → check `evaluate(_,_,_,signal)`. Checks
promise to inspect `signal.aborted` at least every ~10ms. Force-abort (reason `'force'`)
escalates to `Worker.terminate()` after a 50ms grace period.

### Cross-auditor pool sharing (opt-in)

`new SharedWorkerPool({ size: 16 })` passed as `workerPool` lets N auditors share M
workers. Tasks carry their own `(snapshotHandle, ruleId, options, signal)` envelope;
auditor A's signal can't cancel auditor B's tasks; workers cache per `snapshotHandle.id`.
Default: each auditor gets its own pool.

### Backpressure

Consumer `for await` speed drives the system. Slow consumer → multiplexer buffer fills →
pool queue fills → scheduler pauses → workers idle → CPU drops to zero. Resume unblocks
the chain. Default buffers: multiplexer outbound 64 events, pool queue `poolSize*4`.

### Single-flight per FlatTree, not per auditor

A tree is read-only during a cycle, so concurrent audits against the same tree are safe.
`ingest()` during an active audit is queued; tree hot-swap mid-audit is unsupported —
`refresh()` is the partial-update path.

### Not built

Per-rule worker isolation, distributed cross-machine audits, mid-audit pool resize, GPU
offload.

---

## Section 5 — Iframes & Shadow DOM

### Unified FlatTree across boundaries

One contiguous structure spans all reachable frames and shadow roots. Per-node metadata:
`frameId`, `shadowDepth`, `shadowMode` (light/open/closed), `composedParentIdx` (slotted
content). Facade traversal modes — rules choose what they see:

```ts
node.children()        // light-DOM children
node.shadowChildren()  // own open shadow root's children
node.composedChildren()// flattened composed tree (default — what users perceive)
node.descendants({ crossShadow: true, crossIframe: false })
node.ancestors({ crossShadow: true })
```

Default is `composedChildren`; encapsulation-sensitive rules opt into `shadowChildren`.

### Shadow DOM

- **Open**: captured by CDP `includeShadowDOM:true` or `element.shadowRoot`; first-class
  subtrees with `shadowDepth > 0`.
- **Closed**: invisible to CDP/JS. Engine emits `closed-shadow-detected` with the host
  `NodeId`; rules that would match inside return `incomplete` (reason `closed-shadow`).
  Hosts with a `ClosedShadowAccessor` (e.g. a browser extension using
  `chrome.dom.openOrClosedShadowRoot()`) can opt in.
- **Slotted/composed**: FlatTree stores both ownership and composed views. Facade
  defaults to composed; `node.ownChildren()` opts into ownership.

### Same-origin iframes

Appear as additional `documents` in the CDP `DOMSnapshot`. Each becomes a `Frame` with a
unique `FrameId`; the iframe host element carries `contentFrameId`. One audit covers all
same-origin frames in one pass. `NodeId` encodes the frame (`f0:n42`, `f1:n7`).

### Cross-origin iframes (OOPIFs)

- **Node host**: per-frame CDP sessions pulled in parallel and stitched into one
  FlatTree. Cross-origin iframes are first-class — the main upgrade over today's
  `runPartial`/`finishRun` imperative merge.
- **Browser host with cross-origin permissions** (extension): content scripts run a
  `FrameAgent` per frame, posting each frame's FlatTree portion to the main script.
- **Browser host without permissions** (page-injected): cross-origin frames are
  unreachable; engine emits `frame-unreachable` and rules return `incomplete` on the
  host. Honest about the gap.

Hosts implement the optional `FrameCollector` hook to supply cross-frame access.

### Selector syntax

`'iframe#docs >> #main >>> button.submit'` — `>>` enters an iframe, `>>>` enters an open
shadow root. `ancestry[]` carries one entry per boundary. Deterministic generation.

### Watcher at boundaries

`new MutationWatcher({ observeFrames: 'same-origin'|'all-cross-origin'|'none',
observeShadows: 'open'|'open-and-closed'|'none' })`. Dirty events carry boundary-aware
NodeIds for targeted incremental re-audit.

### Boundary events

`frame-discovered`, `frame-unreachable`, `shadow-discovered`, `closed-shadow-skipped` —
so reporters can state coverage gaps explicitly.

### Retires

`frame-messenger.ts`, `axe.runPartial`/`axe.finishRun` cross-frame stitching,
`respondable.ts`, `getFlattenedTree.ts` — ~2000 lines of distributed async coordination
centralized into the snapshot model.

### Not solved (honest limits)

Cross-origin iframes without host access; closed shadow roots without an accessor;
sandboxed iframes with `allow-same-origin` revoked; `<object>`/`<embed>` HTML payloads
(deferred).

---

## Section 6 — Locales

### Principles

- **Per-auditor locale, not global.** Concurrent auditors with different locales work.
- **Locales ship with their rule pack** at subpath exports — locale and rule version
  stay in lockstep.
- **ICU MessageFormat subset** via `Intl.PluralRules` / `Intl.NumberFormat` — no doT.
- **Lazy / tree-shakable** — only requested locales for configured rules load.
- **Reporters render; engine emits structured data** — `Result.message` is rendered, but
  `checks[].data` is locale-agnostic so any consumer can re-render in any locale.

### Locale data shape

```ts
interface RuleLocaleData {
  language: string;            // BCP 47
  direction: 'ltr' | 'rtl';
  rules: Record<RuleId, { description?: string; help?: string; helpUrl?: string }>;
  checks: Record<CheckId, { pass?: string; fail?: string; incomplete?: Record<string,string> }>;
  phrases?: Record<string, string>;
}
```

### Distribution

Each rule pack exposes `./locales/<lang>` subpath exports. Org packs do the same —
localizing a custom rule pack is identical to a first-party one.

### Configuration

```ts
// Static (bundler-friendly):
import wcag22aaDe from '@axe-core/rules-wcag22aa/locales/de';
createAuditor({ rules, locale: { primary: 'de-DE', fallbacks: ['de','en'], data: [wcag22aaDe] } });

// Dynamic (runtime switch):
const locale = await collectLocales({ language: navigator.language, fallbacks: ['en'],
  rulePacks: ['@axe-core/rules-wcag22aa'] });

// Hot-swap (live preview): auditor.setLocale(bundle) — affects subsequent rendering only.
```

### Minimal ICU runtime

~150-line renderer supporting `{name}`, `{name, number, :: .##}`, `{name, plural, …}`,
`{name, select, …}` (~95% of a11y messages). `setMessageFormatter()` plugs in
`@formatjs/intl-messageformat` for the rest. Swaps to TC39 `Intl.MessageFormat` when it
stabilizes.

### Fallback chain

Per-key resolution `primary → fallbacks[] → en`. Merged at construction; per-event
rendering is a hash lookup. Throws at construction if no chain resolves a key.

### Bidi/RTL

`direction` carried on each bundle and on `Audit.locale`. Bidi-sensitive content wrapped
in Unicode isolates by the renderer where the template marks `{name, bidi}`.

### Validation

At construction (Zod boundary 1), missing message keys emit warnings (rule, key, lang)
listing fallthroughs — pre-prod can fail on warnings.

### Retires

Flat `packages/axe-core/locales/*.json`, `applyLocale` singleton mutation, doT, runtime
message compilation.

### Not built

Translation tooling/TMS integration, pseudo-locales (easy to add later), machine
translation (hard no — legal exposure).

---

## Section 7 — Reporters

### Unified interface (streaming + collecting)

```ts
export interface Reporter {
  readonly id: string; readonly format: string;
  onAuditStarted?(audit: Pick<Audit,'id'|'startedAt'|'rules'|'page'>): void;
  onEvent?(event: AuditEvent): void;                  // streaming
  onAuditFinished(audit: Audit, results: AuditResults): Promise<void>;  // collecting
  dispose?(): Promise<void>;
}
```

Dispatch lives in Layer 4: each consumed event forks to every reporter's `onEvent`
before yielding to the consumer; a reporter returning a promise applies backpressure.

### Multi-reporter

`reporter: [consoleReporter(...), sarifReporter(...), junitReporter(...), htmlReporter(...)]`.
Each sees the full stream/results independently. One throwing → disabled for the rest,
`reporter-errored` emitted, others continue.

### Bundled reporters

| Reporter | Format | Mode | Use |
|---|---|---|---|
| jsonReporter | JSON | collecting | full `AuditResults` |
| ndjsonReporter | NDJSON | streaming | one event/line; logs, replay |
| sarifReporter | SARIF 2.1.0 | collecting | GitHub/Azure/GitLab code scanning |
| junitReporter | JUnit XML | collecting | Jenkins/CircleCI/GitLab |
| htmlReporter | static HTML | collecting | standalone dashboard |
| consoleReporter | ANSI | streaming | CLI live output |
| csvReporter | CSV | collecting | spreadsheets/BI |
| markdownReporter | Markdown | collecting | PR comments |
| agentReporter | NDJSON (compact) | streaming | LLM/agent (see 7.5) |
| legacyV4Reporter | legacy v4 blob | collecting | downstream-tool compatibility |

Each tree-shakeable.

### SARIF specifics

`tool.driver` = engine; `results[]` = violations; native `fingerprints` /
`partialFingerprints` from `Result.fingerprints`; `baselineState` from `priorResults`
diff; `artifacts[]` per page/frame. With `originSource` present, real file/line; without,
logical locations.

### HTML reporter

Single self-contained file (inline CSS/JS/data). Tree-view grouped by fingerprint,
filters, per-result drill-down, embedded snapshot viewer, diff mode. 200–800KB typical.

### Legacy v4 bridge

Faithful 1:1 down-conversion (status → four arrays, node denormalized, `target` ←
`ancestry`, `failureSummary` ← `message`). Lossy by design (drops fingerprints/category/
frame metadata). Ships with v5, available indefinitely. The migration on-ramp for
downstream wrappers.

### Custom reporters & output

`defineReporter({...})` for type inference + Zod validation. Reporters accept
`outputPath` or `output: WritableStream` (Node Streams / Web Streams, backpressure-aware).
Each declares a `version` so engine majors can ship new reporter versions without
breaking pinned consumers.

### Retires

`axe._audit.reporter` global, the five legacy built-ins (`v2` reproduced by
legacyV4Reporter), `setReporter()`.

### Not built

Server-rendered dashboards, direct JIRA/Linear/GitHub-Issues writers, PDF (pipe HTML
through Playwright `pdf()`).

---

## Section 7.5 — LLM-Native Reporter & MCP Integration

### Honest scope on PR annotation

True line-level PR annotation (ESLint/CodeQL-style) requires source attribution axe-core
does not inherently have — it analyzes rendered DOM, not source files. The
`originSource` field (Section 2.5) leaves room for it via Storybook metadata, framework
build-time instrumentation, or source-map + CDP stack capture. Without attribution,
SARIF still yields a GitHub check with browsable summaries — just not inline annotations.
**Planned capability, not delivered in base Phase 4.**

### `agentReporter`

NDJSON, one Result per line, schema-pinned (`$schema` URL on line one). Compact field
names (`fp`, `sev`, `cat`, `sel`, `data`, `ground`, `fix`), exemplar+`occurrenceOf`
rollup, structured `data` (not prose), `ground` (codebase-grounding signals: tag,
classes, dataAttrs, component marker), `fix` (applied `fixHint`). Profiles:
`compact`/`expanded`/`minimal`. ~100 tokens/exemplar vs ~220 for legacy v4.

### Rule-level fix hints & examples

```ts
fixHint: (result, node) => ({
  pattern: 'contrast-adjust',
  suggestion: `darken foreground to reach ${result.checks[0].data.required}:1`,
  minRatio: result.checks[0].data.required,
  affectsProperties: ['color','background-color'], cssLevel: true,
}),
examples: [{ label, before, after, explanation }, …],
```

`fixHint` is per-result (uses this violation's values); returns `null` when no clean
canonical fix exists. `examples` are static, served via MCP (too verbose per result).

### `@axe-core/mcp-server`

MCP tools: `audit_url`, `audit_html`, `audit_storybook`, `get_audit`, `get_violations`,
`get_violation`, `get_fix_hint`, `get_rule_examples`, `get_rule_metadata`,
`get_grounding`, `get_node_html` (opt-in), `get_rollup`, `diff_audits`,
`list_categories`, `list_components`. Agent loop: audit → rollup by component → pick
worst → get violation/fix/examples → grep codebase via grounding → fix → re-audit →
diff confirms resolved.

### Schema publishing

Versioned static JSON Schemas at `schema.axe-core.org/agent/v1.json`, CDN-hosted,
content-addressable. `$schema` field makes validation trivial.

### Token economics

agentReporter compact ≈ 100 tokens/exemplar, 40/occurrence; 200-violation audit with
rollup ≈ 8.6K tokens (vs ~44K legacy v4); MCP paginated often <2K to act.

### Privacy & safety

`get_node_html` opt-in (PII); fix hints are guidance not commands and never reference
the user's codebase; examples are sanitized fixtures; MCP `audit_url` enforces
allowlist/same-origin (anti-SSRF, default-deny).

### Additive only

agentReporter + MCP are additions; all human/CI reporters stay unchanged.

---

## Section 7.6 — Agent-Native CLI + History Observatory

Three packages **above** the stateless engine. Engine purity preserved; `@axe-core/history`
imports engine *types* only, never vice versa.

### `@axe-core/cli`

```
axe audit <url|file|->  [options]
axe diff <runA> <runB>
axe history <query>
axe rules [--category] [--tag]
axe explain <rule-id>
```

Auto-JSON on pipe (TTY → human tables, piped → NDJSON), `--compact`, `--select <jsonpath>`,
`--dry-run`, `--stdin`, `--no-input`.

### Typed exit codes

```
0 clean   2 violations   3 usage error   4 target error
5 config error   6 incomplete (ran but coverage degraded)   7 internal error
```

Stderr carries a structured JSON error envelope (`problemFlag`, `suggestion`,
`validValues`) on non-zero exit for mechanical self-correction.

### `@axe-core/history`

SQLite via `node:sqlite` (Node 24, no native dep). Schema mirrors the Section 2.5
normalized shape — ingestion is a straight insert because the engine already emits stable
`ResultId`/`FingerprintId`. Compound queries (the "transcendence commands"):
`chronic-offenders`, `fix-velocity`, `timeline <fp>`, `regressions --base --head`,
`hotspots --group-by component`.

### History-aware MCP tools

`get_chronic_offenders`, `get_fix_velocity`, `get_fingerprint_timeline`,
`get_regressions`, `get_hotspots`, `ingest_run`. Full compounding agent workflow:
audit → regressions → prioritize chronic → fix → re-audit → timeline confirms resolved.

### State-boundary invariant

Engine: stateless, no SQLite/fs, pure, concurrent-safe (unchanged). CLI/history: all
persistence, one-directional dependency on engine types. Browser-only engine consumers
never touch SQLite.

### Not adopted from cli-printing-press

The Go generator pipeline, ecosystem-absorption phases, auto-published per-API libraries.

---

## Section 8 — Error Handling

### Governing principle — fail honest, never fail silent

Two unacceptable modes: **silent drop** (errored rule vanishes, report shows undeserved
clean → false negative) and **total abort** (one bad rule kills the audit). Answer: every
error becomes a typed event scoped to the narrowest recoverable unit, and a failed check
degrades to **`incomplete`** — never `pass`, never nothing. This is the zero-false-positive
guarantee in code.

### Five error scopes

| Scope | Blast radius | Event | Continues? |
|---|---|---|---|
| Check error | one (node, check) | check-errored | yes |
| Rule error | one (rule, subtree) | rule-errored | yes (other rules) |
| Source error | one frame/subtree | frame-unreachable | yes (other frames) |
| Worker crash | one worker's tasks | worker-crashed | yes (tasks requeued) |
| Fatal error | whole audit | audit-aborted | no (terminal) |

### Check errors

`runCheck` wraps `evaluate`; a throw (other than cancellation) emits `check-errored` and
returns `{ passed: 'incomplete', reason: 'check-threw', cause }`. A crashed check
**cannot assert pass or fail** — only `incomplete`.

### Rule errors

`matches` throwing does **not** mark the subtree inapplicable (would hide violations) —
it emits `rule-errored` (phase `matches`) and marks affected nodes `incomplete` for that
rule. `after` throwing emits and returns prelim unreduced. A rule-level throw contributes
nothing but the audit lives.

### Worker crashes

Pool detects exit/error, requeues lost tasks on a fresh worker, emits `worker-crashed`. A
task crashing a worker **twice** is quarantined (`task-quarantined`, results →
`incomplete`, no third requeue) — poison-task backstop. If >half the pool crashes in one
audit, drain → main-thread fallback (`pool-degraded`), audit completes slower.

### Source errors

Whole-snapshot malformed → fail fast at `ingest()` (rejected promise, `AxeIngestError`,
CLI exit 4) — nothing to audit. Per-frame failure → `frame-unreachable`, partial
coverage, audit continues.

### Cancellation is not an error

`if (err === signal.reason) throw err;` in every catch. Abort emits terminal
`audit-aborted { reason, partial: AuditResults }` carrying completed results; no
`*-errored` events fire for the abort itself.

### SerializedError

```ts
interface SerializedError {
  name: string; message: string; stack?: string;   // stack stripped in prod
  code?: string; ruleId?: RuleId; checkId?: CheckId; nodeId?: NodeId;
  cause?: SerializedError;   // ES2022 cause chain, recursively serialized
}
```

Safe to `postMessage` and `JSON.stringify`; surfaces `code`/`ruleId`/`checkId` to agents.

### Error events

`check-errored`, `rule-errored`, `frame-unreachable`, `worker-crashed`,
`task-quarantined`, `pool-degraded`, `reporter-errored`, `audit-aborted` (terminal).

### Error ledger in results

```ts
interface ErrorLedger {
  checkErrors: {ruleId;checkId;nodeId;code}[];
  ruleErrors: {ruleId;phase;code}[];
  unreachable: {hostNodeId;reason}[];
  quarantined: {ruleId;subtreeId;reason}[];
  degraded: boolean;
  incompleteFromErrors: number;   // headline integrity metric
}
```

`incompleteFromErrors > 0` → CLI exit 6 ("ran but untrustworthy") — the defense against
silent false negatives.

### Custom-rule isolation

Third-party org/DS rules are the likeliest error source and least trusted. The boundaries
guarantee a buggy pack can't produce a false `pass`, can't take down the audit or other
rules, and can't hide its own failure — every misbehavior degrades to `incomplete` + an
event.

### Not done

No check retry on throw (deterministic — retry wastes time; workers retry on *crash*
only). No swallow-without-event. No error → pass/fail conversion. No process-level
handlers (engine is a library; resilience is structural).

---

## Section 9 — Testing Strategy

### Primary goal — prove verdict-parity

The rewrite must produce the same accessibility verdicts as the current engine. A
regression that passes an inaccessible page is a legal/ethical failure.

### The parity corpus (the existential gate)

1. Assemble fixtures: existing `test/integration/**`, the public ACT corpus
   (act-rules.github.io), frozen real-world snapshots, adversarial edge cases (shadow,
   nested iframes, SVG, MathML, custom elements).
2. Run the **current** engine → freeze golden JSON in `test/parity/golden/` (committed).
3. Run the **new** engine → compare at **verdict level** (not byte level — schema
   changed). New output pipes through `legacyV4Reporter`, diffed against golden by
   `(fixture, rule, node) → status`.

| Diff class | Gate |
|---|---|
| Identical verdict | pass |
| Intentional divergence | requires reviewed entry in `parity-divergences.md` with rationale |
| Regression | hard fail, blocks merge |

Golden regeneration is explicit/reviewed only (`pnpm parity:regenerate`) — never
automatic, so a regression can't rewrite its own oracle.

### Zero-false-positive verification (dedicated)

A curated KNOWN-GOOD corpus (WCAG passing examples, ARIA APG patterns, expert-reviewed
canonical components) must produce **zero** violations. `incomplete` acceptable;
`violation` fails unconditionally — no allowlist.

### Rule/check unit tests (per package)

`@axe-core/test-utils` `fixtureElement(html)` builds a minimal FlatTree + facade for one
element — check tests run in Node without a browser. Every check gets an explicit
"indeterminate input → incomplete (never false)" test enforcing the Section 8 discipline.

### Primitive tests

FlatTree (CDP round-trip, composed traversal, cross-frame NodeId, SAB/clone fallback),
facade (string-interning reads, composed vs own children, zero hot-path allocation),
fingerprinting (shared strict, null component, cascade linkage).

### Integration (real hosts + workers)

Live Playwright Chromium + real `worker_threads`. **The concurrency-correctness gate:**
the full parity corpus run through worker-mode AND main-thread mode must yield identical
verdicts.

### Determinism & ordering

Verdict set deterministic across 100 runs; within-rule event order stable (cross-rule
order may vary).

### Cancellation & error paths

Abort → partial results, no error events; throwing check → incomplete + others
unaffected; worker-crash quarantine; accurate `incompleteFromErrors`.

### Locale, reporter, observatory, CLI tests

Locale plurals/fallback/concurrent-isolation; reporter output validates against published
SARIF 2.1.0 and legacy-v4 JSON schemas; observatory fix-velocity/chronic-offenders/
regressions; CLI exit-code mapping and pipe detection.

### Performance budgets

A **single committed reference fixture** (`test/parity/fixtures/perf-10k.html`, a
DOM of ~10,000 nodes) anchors all perf assertions so node-count and result-count units
are reconciled against one artifact. Budgets: audit under target (worker mode);
meta-bundle ≤220KB gz (PRD target); engine tree-shakes with one rule; FlatTree build
O(n) (2× nodes ≤ 2.2× build time). Benchmarked against the current engine on identical
hardware; order-of-magnitude slowdown is a regression. The Section 2.6 "~700ms on a
10K-*result* page" figure is fingerprint overhead specifically and is measured against
this same fixture's result set, not its node count.

### CI gate composition

Extends the Phase 3 four-job shape:
`unit | browser | integration | typecheck | **parity** (blocks on unexplained divergence) | **perf** (advisory until baselined)`.
`parity` is what makes incremental merging (Decision 10, Approach B) safe.

### Not tested

Cross-rule event timing (nondeterministic by design), old-engine internals (it's the
oracle), third-party rule-pack contents (we test isolation, not their correctness),
exhaustive browser-vendor CDP quirks (Chromium primary; others smoke-level).

---

## Rollout (Decision 10 — Approach B)

Build `@axe-core/engine` and the scoped packages **alongside** the current `axe-core`,
which keeps shipping from `packages/axe-core/lib/`. New packages publish independently;
early adopters (axe DevTools, Deque internal tools) validate on real workloads; org/DS
rule packs can build against `@axe-core/engine` before `axe-core` v5 ships. When
validated, `axe-core` becomes a thin re-export of the new engine and the old engine is
deleted. First `@axe-core/engine` release ~3 months; `axe-core` v5 cutover ~12–18 months.
The `parity` CI gate runs on every PR touching the new engine, so partial progress lands
without verdict-regression risk.

---

## Open Questions / Deferred

- True source-level PR annotation depends on `originSource` population strategy
  (Storybook / framework instrumentation / source-map+CDP). Planned, not base Phase 4.
- `<object>`/`<embed>` HTML payload auditing — deferred pending real-world demand.
- TC39 `Intl.MessageFormat` swap-in once stable.
- Firefox/WebKit CDP-bridge coverage expansion driven by demand.
