# Phase 4 Critical-Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the redesigned engine produces *identical accessibility verdicts* to the current axe-core engine — for a small ladder of ported rules, across the parity corpus, in both worker-mode and main-thread mode.

**Architecture:** New scoped packages (`@axe-core/engine`, `@axe-core/host-node`, `@axe-core/rules-wcag22aa`) built **alongside** the current `axe-core` package (Decision 10 / Approach B — parallel-engine, opt-in v5). The current engine is untouched and remains the parity oracle. The new engine consumes a CDP `DOMSnapshot`, builds an ArrayBuffer-backed `FlatTree`, exposes a host-agnostic `AxeElement` facade, dispatches `(rule, subtree)` tasks through a `worker_threads` pool (with main-thread fallback), and emits an `AsyncIterable<AuditEvent>`. A `legacyV4Reporter` down-converts new results to the v4 shape so verdicts can be diffed against golden captures.

**Tech Stack:** TypeScript (strict) · Zod 3 (single source of truth for types) · `node:worker_threads` · `SharedArrayBuffer` + `Atomics` · Vitest 4 · Playwright (CDP capture for fixtures) · PNPM workspace + Turborepo.

**Source spec:** `docs/superpowers/specs/2026-05-28-phase-04-rules-checks-redesign-design.md`

---

## Scope

**In this plan (the critical path that proves verdict-parity):**

- `@axe-core/schemas` — expanded with the normalized result schema, `AuditEvent`, facade types, `Source`/`Watcher` interfaces, `RuleDefinitionInput`/`CheckDefinitionInput`. Single source of truth via `z.infer`.
- `@axe-core/engine` — `FlatTree`, `AxeElement` facade, `defineRule`/`defineCheck`/`extendRule`, the rule-engine dispatch, the `Auditor` + `AsyncIterable<AuditEvent>` contract, tiered Zod, fingerprinting, fail-honest error handling, `collectResults`.
- `@axe-core/host-node` — `SnapshotSource` (CDP `DOMSnapshot` → `FlatTree`), the `worker_threads` pool with SAB + main-thread fallback, a Playwright CDP capture helper for fixtures.
- `@axe-core/rules-wcag22aa` — **proof subset only**: `document-title`, `html-has-lang`, `html-lang-valid`, `image-alt`, `color-contrast`, ported as `defineRule`/`defineCheck` over `AxeElement`. English messages baked in.
- `@axe-core/reporters` — `legacyV4Reporter` + minimal `jsonReporter` only.
- Parity harness: golden capture from the current engine, verdict-level diff, divergence allowlist, worker-vs-main-thread equality, zero-false-positive corpus, CI wiring.

**Boundary coverage in this plan:** light DOM + same-origin iframes + **open** shadow roots. Cross-origin iframes (OOPIF), closed shadow roots, and the `FrameCollector` host hook are **deferred to a follow-on plan** — the proof rules do not require them and the parity corpus subset is chosen accordingly.

**Explicitly excluded (follow-on plans):** `@axe-core/host-browser` (LiveDomSource/MutationWatcher), remaining rule packs, `agentReporter`/MCP/CLI/history observatory, locales beyond English, all other reporters, source attribution (`originSource`).

---

## File Structure

### `packages/schemas/src/` (expand existing)

| File | Responsibility |
|---|---|
| `flat-tree.schema.ts` | `DomSnapshot` (CDP subset) + `FlatTreeMetadata` Zod schemas |
| `facade.schema.ts` | `NodeId`, `AuditNode`, `Page`, `Frame` schemas + inferred types |
| `result.schema.ts` (new normalized) | `Status`, `Impact`, `Result`, `CheckOutcome`, `Fingerprints`, `AuditResults`, `Audit`, `ErrorLedger` |
| `audit-event.schema.ts` | `AuditEvent` tagged-union schema |
| `rule-definition.schema.ts` (rewrite) | `RuleDefinitionInput`, `Rule` |
| `check-definition.schema.ts` (rewrite) | `CheckDefinitionInput`, `Check`, `CheckEvaluation` |
| `auditor.schema.ts` | `AuditorOptions`, `AuditOptions`, `DedupStrategy` |
| `index.ts` (extend) | Re-export every schema + inferred type |

Legacy schemas (`config.schema.ts`, `context.schema.ts`, etc.) stay untouched — the current engine still imports them.

### `packages/engine/` (new — `@axe-core/engine`)

| File | Responsibility |
|---|---|
| `src/flat-tree/flat-tree.ts` | TypedArray-packed tree; build/read/serialize/SAB transfer |
| `src/flat-tree/string-table.ts` | UTF-8 string interning, SAB-backed |
| `src/flat-tree/partition.ts` | Subtree partitioning for `(rule, subtree)` tasks |
| `src/facade/axe-element.ts` | `AxeElement`/`AxeNode`/`AxeStyle` reading the FlatTree |
| `src/facade/traversal.ts` | `children`/`composedChildren`/`ancestors`/`descendants` |
| `src/define/define-rule.ts` | `defineRule` factory |
| `src/define/define-check.ts` | `defineCheck` factory |
| `src/define/extend-rule.ts` | `extendRule` composition helper |
| `src/engine/dispatch.ts` | Rule dispatch: matches → any/all/none → after |
| `src/engine/compose-result.ts` | CheckEvaluations → `Result` (with `ruleSatisfaction`) |
| `src/engine/fingerprint.ts` | strict/loose/component fingerprints + cascade detection |
| `src/engine/errors.ts` | `serializeError`, `SerializedError`, guard wrappers |
| `src/auditor/auditor.ts` | `createAuditor`, `Auditor`, `audit()` async iterator |
| `src/auditor/multiplexer.ts` | Merge task event streams; backpressure |
| `src/auditor/collect-results.ts` | `collectResults(events)` → `AuditResults` |
| `src/index.ts` | Public exports |

### `packages/host-node/` (new — `@axe-core/host-node`)

| File | Responsibility |
|---|---|
| `src/snapshot-source.ts` | `SnapshotSource implements Source` — CDP `DOMSnapshot` → `FlatTree` |
| `src/cdp-to-flat-tree.ts` | Pure transform: validated CDP snapshot → FlatTree arrays |
| `src/worker-pool/pool.ts` | `WorkerPool`: spawn, SAB broadcast, task queue, crash recovery |
| `src/worker-pool/worker-entry.ts` | Worker thread entry: receives task envelope, runs dispatch, posts events |
| `src/worker-pool/main-thread-pool.ts` | Sequential fallback with the identical task interface |
| `src/capture/playwright-capture.ts` | Test/dev helper: Playwright page → CDP `DOMSnapshot` |
| `src/index.ts` | Public exports |

### `packages/rules-wcag22aa/` (new — `@axe-core/rules-wcag22aa`, proof subset)

| File | Responsibility |
|---|---|
| `src/checks/doc-has-title.ts` | `defineCheck` port of `doc-has-title-evaluate` |
| `src/checks/has-lang.ts` | `defineCheck` for `html-has-lang` |
| `src/checks/valid-lang.ts` | `defineCheck` for `html-lang-valid` |
| `src/checks/has-alt.ts` | `defineCheck` for image accessible-name |
| `src/checks/color-contrast.ts` | `defineCheck` port of `color-contrast-evaluate` over facade |
| `src/checks/commons/color.ts` | Ported color math (contrast, bg/fg resolution) over `AxeStyle` |
| `src/checks/commons/text.ts` | Ported `sanitize`, visible-text helpers over `AxeElement` |
| `src/rules/*.ts` | `defineRule` for each of the 5 |
| `src/messages/en.ts` | English message templates |
| `src/index.ts` | `export const wcag22aa = [...]` (proof subset) |

### `packages/reporters/` (new — `@axe-core/reporters`, minimal)

| File | Responsibility |
|---|---|
| `src/legacy-v4.ts` | `legacyV4Reporter` — v5 `AuditResults` → v4 blob |
| `src/json.ts` | `jsonReporter` |
| `src/index.ts` | Exports |

### Parity harness (lives in engine package test tree)

| File | Responsibility |
|---|---|
| `packages/engine/test/parity/capture-golden.ts` | Run **current** engine over fixtures → `golden/*.json` |
| `packages/engine/test/parity/diff-verdicts.ts` | Verdict-level diff (new via legacyV4 vs golden) |
| `packages/engine/test/parity/corpus-manifest.json` | Fixture provenance |
| `packages/engine/test/parity/parity-divergences.md` | Reviewed intentional-divergence allowlist |
| `packages/engine/test/parity/golden/` | Committed golden captures |
| `packages/engine/test/parity/parity.test.ts` | The parity gate (Vitest) |
| `packages/engine/test/parity/worker-equality.test.ts` | worker-mode == main-thread verdicts |
| `packages/engine/test/parity/zero-fp.test.ts` | known-good corpus → zero violations |

---

## Conventions

- **TDD throughout.** Every behavioral unit: write failing test → run (verify fail) → minimal impl → run (verify pass) → commit.
- **Commit granularity:** one commit per task unless a task says otherwise.
- **Run tests with:** `pnpm --filter @axe-core/<pkg> test` (Vitest). Typecheck: `pnpm --filter @axe-core/<pkg> typecheck`.
- **Port discipline:** ported rule/check logic must preserve the current engine's *verdict*. The DOM-API → facade-API mapping is mechanical (`el.getAttribute` → `node.getAttribute`, `window.getComputedStyle(el)` → `node.computedStyle`, `el.children` → `node.children()`). The parity gate is the proof; do not "improve" verdict logic during the port — log any intended divergence in `parity-divergences.md`.
- **`incomplete`, never `false`:** any check that cannot determine pass/fail returns `{ passed: 'incomplete', reason }`. Every check gets an explicit indeterminate-input test.

---

## Task 0: Scaffold the new packages

**Files:**
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/vitest.config.ts`
- Create: `packages/host-node/package.json`, `packages/host-node/tsconfig.json`, `packages/host-node/vitest.config.ts`
- Create: `packages/rules-wcag22aa/package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `packages/reporters/package.json`, `tsconfig.json`, `vitest.config.ts`

- [ ] **Step 1: Create each package.json** following the existing `packages/schemas/package.json` shape (`type: module`, `exports` with import/require, `build: tsc`, `typecheck: tsc --noEmit`, `test: vitest run`). Dependencies:
  - `@axe-core/engine`: dep `@axe-core/schemas` (workspace:*), `zod`
  - `@axe-core/host-node`: dep `@axe-core/engine`, `@axe-core/schemas`; devDep `playwright`
  - `@axe-core/rules-wcag22aa`: dep `@axe-core/engine`, `@axe-core/schemas`
  - `@axe-core/reporters`: dep `@axe-core/schemas`

- [ ] **Step 2: Mirror `packages/schemas/tsconfig.json`** in each new package (strict mode, composite if the existing one is).

- [ ] **Step 3: Add a placeholder `src/index.ts`** exporting nothing (`export {};`) in each, so `tsc` and Turbo resolve the package.

- [ ] **Step 4: Verify the workspace resolves**

Run: `pnpm install`
Expected: all four new packages link; no resolution errors.

- [ ] **Step 5: Verify Turbo sees the packages**

Run: `pnpm turbo run typecheck --filter @axe-core/engine`
Expected: passes (empty package typechecks clean).

- [ ] **Step 6: Commit**

```bash
git add packages/engine packages/host-node packages/rules-wcag22aa packages/reporters pnpm-lock.yaml
git commit -m "chore(phase-04): scaffold engine/host-node/rules/reporters packages"
```

---

## Task 1: Expand `@axe-core/schemas` — facade & FlatTree types

**Files:**
- Create: `packages/schemas/src/flat-tree.schema.ts`
- Create: `packages/schemas/src/facade.schema.ts`
- Modify: `packages/schemas/src/index.ts`
- Test: `packages/schemas/test/flat-tree.schema.test.ts`

- [ ] **Step 1: Write failing test** for the `DomSnapshot` schema (CDP subset we consume):

```ts
import { describe, it, expect } from 'vitest';
import { DomSnapshotSchema } from '../src/flat-tree.schema';

describe('DomSnapshotSchema', () => {
  it('accepts a minimal CDP-shaped snapshot', () => {
    const snap = {
      documents: [{ nodes: { parentIndex: [-1, 0], nodeType: [9, 1], nodeName: [0, 1],
        attributes: [[], []] }, layout: { nodeIndex: [1], bounds: [[0,0,100,20]] } }],
      strings: ['#document', 'HTML']
    };
    expect(() => DomSnapshotSchema.parse(snap)).not.toThrow();
  });
  it('rejects a snapshot missing the strings table', () => {
    expect(() => DomSnapshotSchema.parse({ documents: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm --filter @axe-core/schemas test flat-tree`
Expected: FAIL — `DomSnapshotSchema` not exported.

- [ ] **Step 3: Implement `flat-tree.schema.ts`.** Define `DomSnapshotSchema` capturing the CDP `DOMSnapshot.captureSnapshot` fields we consume (`documents[].nodes.{parentIndex, nodeType, nodeName, nodeValue?, attributes, shadowRootType?, contentDocumentIndex?}`, `documents[].layout.{nodeIndex, bounds, styles?}`, top-level `strings`). Use `z.array(z.number())` for the parallel arrays and `z.array(z.string())` for `strings`. Export `type DomSnapshot = z.infer<typeof DomSnapshotSchema>`. Add `FlatTreeMetadataSchema` (node count, frame count, hasSAB flag).

- [ ] **Step 4: Run, verify pass**

Run: `pnpm --filter @axe-core/schemas test flat-tree`
Expected: PASS.

- [ ] **Step 5: Implement `facade.schema.ts`.** `NodeId` (`z.string()` branded), `AuditNodeSchema`, `PageSchema`, `FrameSchema` exactly per spec Section 2.5. Export inferred types. (No test beyond typecheck needed — these are data shapes exercised downstream; add one `safeParse` smoke test for `AuditNodeSchema`.)

- [ ] **Step 6: Re-export from `index.ts`**, run typecheck.

Run: `pnpm --filter @axe-core/schemas typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/schemas/src packages/schemas/test
git commit -m "feat(schemas): add DomSnapshot + FlatTree + facade schemas"
```

---

## Task 2: Expand `@axe-core/schemas` — result, event, rule, check, auditor

**Files:**
- Create: `packages/schemas/src/result.schema.ts` (new normalized — do NOT overwrite the legacy `results.schema.ts`; this is a distinct file)
- Create: `packages/schemas/src/audit-event.schema.ts`
- Rewrite: `packages/schemas/src/rule-definition.schema.ts` (keep legacy export name aliased if the current engine imports it; otherwise add a new `rule-definition-v5.schema.ts` to avoid breaking current axe-core)
- Create: `packages/schemas/src/check-definition-v5.schema.ts`
- Create: `packages/schemas/src/auditor.schema.ts`
- Modify: `packages/schemas/src/index.ts`
- Test: `packages/schemas/test/result.schema.test.ts`, `packages/schemas/test/audit-event.schema.test.ts`

> **IMPORTANT — do not break the current engine.** The current `axe-core` package imports `@axe-core/schemas`. Check `grep -rl "@axe-core/schemas" packages/axe-core/lib` and confirm which exports it uses. Add the new v5 schemas under **new names**; do not modify or remove the symbols the current engine imports. The new engine imports the v5 names.

- [ ] **Step 1: Audit current schema consumers**

Run: `grep -rho "from '@axe-core/schemas'" packages/axe-core/lib | sort -u && grep -rhoE "import \{[^}]+\} from '@axe-core/schemas'" packages/axe-core/lib | sort -u`
Record which named exports must remain stable.

- [ ] **Step 2: Write failing test** for the normalized `ResultSchema`:

```ts
import { describe, it, expect } from 'vitest';
import { ResultSchema } from '../src/result.schema';

describe('ResultSchema', () => {
  it('accepts a normalized violation result', () => {
    const r = {
      id: 'r_1', status: 'violation', auditId: 'a_1', ruleId: 'color-contrast',
      category: 'a11y', impact: 'serious', node: 'f0:n12',
      checks: [{ checkId: 'color-contrast', passed: false, data: {}, message: 'x', relatedNodes: [] }],
      ruleSatisfaction: { any: { satisfied: false, checkIds: ['color-contrast'] },
        all: { satisfied: true, checkIds: [] }, none: { satisfied: true, checkIds: [] } },
      message: 'Insufficient contrast', helpUrl: 'https://x', tags: ['wcag2aa'],
      relatedNodes: [], occurredAt: '2026-05-28T00:00:00Z',
      fingerprints: { strict: 'fs', loose: 'fl', component: null, custom: {} },
      cascadeDepth: 0
    };
    expect(() => ResultSchema.parse(r)).not.toThrow();
  });
  it('rejects status outside the enum', () => {
    expect(() => ResultSchema.parse({ status: 'maybe' })).toThrow();
  });
});
```

- [ ] **Step 3: Run, verify fail.** `pnpm --filter @axe-core/schemas test result` → FAIL.

- [ ] **Step 4: Implement `result.schema.ts`** — `StatusSchema`, `ImpactSchema`, `CheckOutcomeSchema`, `FingerprintsSchema`, `ResultSchema`, `AuditSchema`, `ErrorLedgerSchema`, `AuditResultsSchema` per spec Section 2.5/2.6/8j. Export inferred types.

- [ ] **Step 5: Run, verify pass.**

- [ ] **Step 6: Write + pass `audit-event.schema.test.ts`** for the `AuditEventSchema` tagged union (`audit-started`, `rule-started`, `check-result`, `result`, `rule-finished`, `audit-finished`, `subtree-dirty`, plus the error events from Section 8i, plus `result-occurrence`/`result-resolved`/`result-new`/`result-persists`/`result-changed`). Use `z.discriminatedUnion('type', [...])`. Test that an unknown `type` is rejected and a valid `result` event parses.

- [ ] **Step 7: Implement v5 rule/check/auditor schemas.** `RuleDefinitionInputSchema`, `CheckDefinitionInputSchema`, `CheckEvaluationSchema`, `AuditorOptionsSchema`, `AuditOptionsSchema`, `DedupStrategySchema` per spec Section 3. Note: `checks` is `{ any, all, none }` of `CheckRef` (a check object or its id). Functions (`matches`, `after`, `evaluate`, `fixHint`, `fingerprintProjection`) are validated as `z.custom<Fn>(v => typeof v === 'function')` — Zod can't introspect them but presence/type is checked at boundary 1.

- [ ] **Step 8: Re-export all from `index.ts`; typecheck the whole workspace** to confirm the current engine still compiles.

Run: `pnpm turbo run typecheck`
Expected: PASS (current axe-core unaffected).

- [ ] **Step 9: Commit**

```bash
git add packages/schemas
git commit -m "feat(schemas): add v5 result/event/rule/check/auditor schemas (additive)"
```

---

## Task 3: FlatTree string table (SAB-backed interning)

**Files:**
- Create: `packages/engine/src/flat-tree/string-table.ts`
- Test: `packages/engine/test/flat-tree/string-table.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { StringTable } from '../../src/flat-tree/string-table';

describe('StringTable', () => {
  it('round-trips strings by index', () => {
    const t = StringTable.from(['#document', 'HTML', 'lang']);
    expect(t.get(1)).toBe('HTML');
    expect(t.get(2)).toBe('lang');
  });
  it('exposes a SharedArrayBuffer when SAB is available', () => {
    const t = StringTable.from(['a', 'b']);
    expect(t.toSab()).toBeInstanceOf(SharedArrayBuffer);
  });
  it('reconstructs from a SAB handle with identical reads', () => {
    const t = StringTable.from(['x', 'y', 'z']);
    const t2 = StringTable.fromSab(t.toSab(), t.offsets());
    expect(t2.get(2)).toBe('z');
  });
});
```

- [ ] **Step 2: Run, verify fail.** `pnpm --filter @axe-core/engine test string-table` → FAIL.

- [ ] **Step 3: Implement `StringTable`.** UTF-8 encode all strings into one buffer (prefer `SharedArrayBuffer`; fall back to `ArrayBuffer` if `typeof SharedArrayBuffer === 'undefined'`). Keep an `Int32Array` of (offset, byteLength) pairs. `get(i)` decodes lazily with a cached `TextDecoder`. `toSab()`/`offsets()` expose the backing buffers; `fromSab(buf, offsets)` reconstructs without copying.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** `feat(engine): SAB-backed string interning table`.

---

## Task 4: FlatTree structure + reader

**Files:**
- Create: `packages/engine/src/flat-tree/flat-tree.ts`
- Test: `packages/engine/test/flat-tree/flat-tree.test.ts`

- [ ] **Step 1: Write failing tests** that build a tiny tree by hand and assert structural reads:

```ts
import { describe, it, expect } from 'vitest';
import { FlatTree } from '../../src/flat-tree/flat-tree';

// doc(0) → html(1) → [head(2)→title(3), body(4)→img(5)]
const fixture = {
  parentIndex: [-1, 0, 1, 2, 1, 4],
  nodeType:    [9, 1, 1, 1, 1, 1],
  nodeName:    ['#document','HTML','HEAD','TITLE','BODY','IMG'],
  attrs:       [[], [['lang','en']], [], [], [], [['alt','']]],
  frameId:     [0,0,0,0,0,0],
  shadowMode:  [0,0,0,0,0,0],
};

describe('FlatTree', () => {
  const tree = FlatTree.fromArrays(fixture);
  it('resolves parent/child structure', () => {
    expect(tree.parentOf(1)).toBe(0);
    expect(tree.childrenOf(1)).toEqual([2, 4]);
    expect(tree.childrenOf(4)).toEqual([5]);
  });
  it('reads node name and attributes by index', () => {
    expect(tree.nodeName(5)).toBe('IMG');
    expect(tree.getAttribute(1, 'lang')).toBe('en');
    expect(tree.getAttribute(5, 'alt')).toBe('');
    expect(tree.getAttribute(5, 'missing')).toBeNull();
  });
  it('round-trips through serialize → fromSerialized', () => {
    const t2 = FlatTree.fromSerialized(tree.serialize());
    expect(t2.childrenOf(1)).toEqual([2, 4]);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `FlatTree`.** Back structure with `Int32Array`s (`parents`, `firstChild`, `nextSibling`, `nodeNames` → StringTable index, `attrOffsets`, `attrs` flat `(nameIdx, valIdx)` pairs), `Uint8Array`s (`nodeKinds`, `shadowMode`), `Int32Array` (`frameId`), `Float32Array` (`rects`). `fromArrays` (test convenience) builds firstChild/nextSibling from `parentIndex`. Methods: `parentOf`, `childrenOf`, `nodeName`, `nodeKind`, `getAttribute`, `attributeNames`, `frameIdOf`, `rectOf`. `serialize()`/`fromSerialized()` for fixtures (plain JSON). `toSab()`/`fromSab()` for worker transfer (reuse StringTable SAB).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** `feat(engine): ArrayBuffer-backed FlatTree structure + reader`.

---

## Task 5: AxeElement facade + traversal

**Files:**
- Create: `packages/engine/src/facade/axe-element.ts`
- Create: `packages/engine/src/facade/traversal.ts`
- Test: `packages/engine/test/facade/axe-element.test.ts`

- [ ] **Step 1: Write failing tests** over the Task 4 fixture tree:

```ts
import { describe, it, expect } from 'vitest';
import { FlatTree } from '../../src/flat-tree/flat-tree';
import { AxeElement } from '../../src/facade/axe-element';
// reuse the same fixture as Task 4 (extract to a shared test helper)

describe('AxeElement', () => {
  const tree = FlatTree.fromArrays(/* fixture */);
  const html = new AxeElement(tree, 1);
  it('exposes tagName lowercased', () => expect(html.tagName).toBe('html'));
  it('reads attributes', () => expect(html.getAttribute('lang')).toBe('en'));
  it('has() reflects attribute presence', () => {
    expect(html.hasAttribute('lang')).toBe(true);
    expect(html.hasAttribute('dir')).toBe(false);
  });
  it('children() returns AxeElements', () => {
    expect(html.children().map(c => c.tagName)).toEqual(['head', 'body']);
  });
  it('ancestors() walks to root', () => {
    const img = new AxeElement(tree, 5);
    expect(img.ancestors().map(a => a.tagName)).toEqual(['body', 'html', '#document']);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `AxeElement`.** Wraps `(tree, index)`. `tagName` (lowercased nodeName), `nodeType`, `getAttribute`/`hasAttribute`/`attributeNames`, `id`, `textContent` (concatenate descendant text nodes), `computedStyle` (returns an `AxeStyle` reading the FlatTree's packed style indices — for this plan, the styles captured by CDP `computedStyles`), `boundingRect`. Traversal in `traversal.ts`: `children()` (light DOM), `composedChildren()` (light + open-shadow slotted; for this plan open shadow only), `ancestors()`, `descendants(opts)`, `closest(predicate)`. **No per-node allocation on cold reads** — `getAttribute` goes straight through `tree.getAttribute(index, name)`; `AxeElement` instances are only created when traversal explicitly yields nodes.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Add `AxeStyle` test + impl.** Test: `computedStyle.getPropertyValue('color')` returns the CDP-captured value for a node that had styles captured; returns `''` for an uncaptured property. Implement `AxeStyle` over the packed style indices.

- [ ] **Step 6: Commit** `feat(engine): AxeElement facade + traversal over FlatTree`.

---

## Task 6: defineCheck / defineRule / extendRule

**Files:**
- Create: `packages/engine/src/define/define-check.ts`
- Create: `packages/engine/src/define/define-rule.ts`
- Create: `packages/engine/src/define/extend-rule.ts`
- Test: `packages/engine/test/define/*.test.ts`

- [ ] **Step 1: Write failing test for `defineCheck`** (validates shape, freezes result, defaults options):

```ts
import { describe, it, expect } from 'vitest';
import { defineCheck } from '../../src/define/define-check';

describe('defineCheck', () => {
  it('builds a frozen check with defaults', () => {
    const c = defineCheck({
      id: 'has-lang',
      evaluate: async (node) => ({ passed: node.hasAttribute('lang') }),
      messages: { pass: { default: 'ok' }, fail: { default: 'no lang' } },
      metadata: { impact: 'serious' },
    });
    expect(c.id).toBe('has-lang');
    expect(Object.isFrozen(c)).toBe(true);
  });
  it('throws via Zod when evaluate is missing', () => {
    // @ts-expect-error intentional
    expect(() => defineCheck({ id: 'x', messages: {}, metadata: {} })).toThrow();
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `defineCheck`.** Validate input with `CheckDefinitionInputSchema.parse`, fill option defaults, `Object.freeze`, return as `Check`.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: TDD `defineRule`** — validates with `RuleDefinitionInputSchema`, defaults `category` to `'a11y'`, `enabled` to `true`, freezes. Test that `checks.any` accepts both check objects and string ids.

- [ ] **Step 6: TDD `extendRule`** — per spec: `id` MUST be supplied in overrides (throw if absent); `checks` arrays are full replacement; `metadata` shallow-merged; base untouched; returns frozen new rule. Tests:

```ts
it('requires a new id', () => {
  expect(() => extendRule(base, {})).toThrow(/id/);
});
it('does not mutate the base rule', () => {
  const ext = extendRule(base, { id: 'acme-x', impact: 'minor' });
  expect(base.impact).not.toBe('minor');
  expect(ext.impact).toBe('minor');
});
it('replaces checks arrays wholesale', () => {
  const ext = extendRule(base, { id: 'acme-x', checks: { any: [extra], all: [], none: [] } });
  expect(ext.checks.any).toEqual([extra]);
});
```

- [ ] **Step 7: Run all define tests, verify pass.**

- [ ] **Step 8: Commit** `feat(engine): defineRule/defineCheck/extendRule factories`.

---

## Task 7: Rule dispatch + result composition (the verdict core)

**Files:**
- Create: `packages/engine/src/engine/dispatch.ts`
- Create: `packages/engine/src/engine/compose-result.ts`
- Create: `packages/engine/src/engine/errors.ts`
- Test: `packages/engine/test/engine/dispatch.test.ts`, `compose-result.test.ts`, `errors.test.ts`

This task encodes the any/all/none verdict semantics — the heart of parity. Get the truth table exactly right.

- [ ] **Step 1: Write failing tests for `composeResult`** — the any/all/none → Status truth table:

```ts
import { describe, it, expect } from 'vitest';
import { composeResult } from '../../src/engine/compose-result';

// helper: outcome(passed) => CheckOutcome-like
const ok = (id) => ({ checkId: id, passed: true, data: {}, relatedNodes: [] });
const no = (id) => ({ checkId: id, passed: false, data: {}, relatedNodes: [] });
const inc = (id) => ({ checkId: id, passed: 'incomplete', data: {}, relatedNodes: [] });

describe('composeResult any/all/none semantics', () => {
  it('any: ≥1 pass → rule passes', () => {
    expect(composeResult({ any: [ok('a'), no('b')], all: [], none: [] }).status).toBe('pass');
  });
  it('any: all checks fail → violation', () => {
    expect(composeResult({ any: [no('a'), no('b')], all: [], none: [] }).status).toBe('violation');
  });
  it('all: any check fails → violation', () => {
    expect(composeResult({ any: [], all: [ok('a'), no('b')], none: [] }).status).toBe('violation');
  });
  it('none: any check passes(true) → violation', () => {
    expect(composeResult({ any: [], all: [], none: [ok('a')] }).status).toBe('violation');
  });
  it('incomplete dominates when it would change the verdict', () => {
    // any-group with no definite pass but an incomplete → incomplete, NEVER pass/violation
    expect(composeResult({ any: [no('a'), inc('b')], all: [], none: [] }).status).toBe('incomplete');
  });
  it('no applicable checks → inapplicable', () => {
    expect(composeResult({ any: [], all: [], none: [] }).status).toBe('inapplicable');
  });
});
```

> The incomplete-dominance rule must match the current engine. **Before writing the implementation, read `packages/axe-core/lib/core/base/rule.ts` and `lib/core/base/check-result.ts`, extract the current engine's actual any/all/none → status precedence, and paste it verbatim as the oracle in this test file** (as a comment + the asserted expectations). This locks parity at unit-test time rather than first discovering a mismatch at the Task 14 gate. If the current engine's precedence differs from the table above, match IT and note the canonical table in a comment.

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `composeResult`.** Encode the truth table; populate `ruleSatisfaction.{any,all,none}.{satisfied, checkIds}`; derive `status`. **Match the current engine's precedence exactly** (verify against `lib/core/base/check-result.ts` and `lib/core/base/rule.ts`).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: TDD `errors.ts`** — `serializeError` (name/message/code/cause chain, stack stripped unless `process.env.NODE_ENV !== 'production'`), and `guard(fn)` wrappers that convert a throw into an `incomplete` CheckEvaluation + emit a `check-errored` event. Test: a check that throws yields `passed: 'incomplete'`, never `false`/`true`.

- [ ] **Step 6: TDD `dispatch.ts`** — given a rule, a list of applicable `AxeElement`s, and an emit callback: runs `matches` (guarded — throw → node marked incomplete + `rule-errored` phase `matches`), runs each check group (guarded per Step 5), calls `composeResult`, runs `after` if present (guarded), emits `rule-started`/`check-result`/`result`/`rule-finished`. Threads `AbortSignal` — checks `signal.aborted` between checks. Test with a fake rule + the fixture tree; assert the emitted event sequence and the final verdicts.

- [ ] **Step 7: Run all engine tests, verify pass.**

- [ ] **Step 8: Commit** `feat(engine): rule dispatch + verdict composition + fail-honest errors`.

---

## Task 8: Fingerprinting + cascade

**Files:**
- Create: `packages/engine/src/engine/fingerprint.ts`
- Test: `packages/engine/test/engine/fingerprint.test.ts`

- [ ] **Step 1: Write failing tests** for strict/loose/component + cascade:

```ts
describe('fingerprint', () => {
  it('two same-context violations share a strict fingerprint', () => { /* … */ });
  it('component is null when no marker present', () => { /* … */ });
  it('loose ignores structural context', () => { /* … */ });
  it('cascade: descendant violation links to ancestor root cause', () => {
    // build a result set where node B is a DOM-descendant of node A, both violating same rule
    // expect B.cascadeDepth === 1, B.rootCauseResultId === A.id, A.cascadeDepth === 0
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `fingerprint.ts`.** `strict` = hash(ruleId + canonical tag/role + stable attr set + `check.fingerprintProjection(data)` if provided else raw data). `loose` = hash(ruleId + role + tag). `component` = nearest ancestor marker (custom element tag / `data-component` / framework attr) or `null`. Cascade: build ancestor index over a rule's violating node indices; set `cascadeDepth`/`rootCauseResultId`. Use a stable non-crypto hash (e.g. FNV-1a) returned as a short string. **No NodeId in any fingerprint input** (spec cross-run invariant).

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** `feat(engine): strict/loose/component fingerprints + cascade detection`.

---

## Task 9: Auditor + AsyncIterable contract (single-host, main-thread)

Build the `Auditor` against a **main-thread** execution path first (no workers yet) so the iterator/Zod/lifecycle contract is proven before threading. Workers slot in at Task 11 behind the same interface.

**Files:**
- Create: `packages/engine/src/auditor/auditor.ts`
- Create: `packages/engine/src/auditor/multiplexer.ts`
- Create: `packages/engine/src/auditor/collect-results.ts`
- Create: `packages/engine/src/index.ts` (public exports)
- Test: `packages/engine/test/auditor/auditor.test.ts`

- [ ] **Step 1: Write failing integration-style test** using a hand-built FlatTree + a trivial in-test rule, with an in-test `Source` stub that returns the tree from `ingest`:

```ts
import { describe, it, expect } from 'vitest';
import { createAuditor, collectResults, defineRule, defineCheck } from '../../src';
import { StubSource } from '../helpers/stub-source';   // returns a fixture FlatTree

const alwaysFail = defineRule({
  id: 'always-fail', impact: 'minor', tags: ['test'],
  metadata: { description: 'd', help: 'h' },
  matches: async (n) => n.tagName === 'img',
  checks: { any: [defineCheck({ id: 'never', evaluate: async () => ({ passed: false }),
    messages: { pass: { default: 'p' }, fail: { default: 'f' } }, metadata: { impact: 'minor' } })],
    all: [], none: [] },
});

describe('Auditor', () => {
  it('emits a violation result for the matching node', async () => {
    const auditor = createAuditor({ rules: [alwaysFail], source: new StubSource(),
      workerPool: false });
    await auditor.ingest(/* fixture snapshot */);
    const results = await collectResults(auditor.audit());
    const v = results.results.filter(r => r.status === 'violation');
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe('always-fail');
    await auditor.dispose();
  });

  it('audit() rejects if neither ingest() nor attach() ran', async () => {
    const auditor = createAuditor({ rules: [alwaysFail], source: new StubSource(), workerPool: false });
    await expect(collectResults(auditor.audit())).rejects.toThrow(/ingest|attach/i);
  });

  it('AbortSignal stops the audit and yields partial results', async () => { /* … */ });

  it('two concurrent auditors do not interfere (no globals)', async () => {
    const [a, b] = await Promise.all([runAuditor(), runAuditor()]);
    expect(a.audit.id).not.toBe(b.audit.id);
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `createAuditor`/`Auditor`.** Zod boundary 1 on `AuditorOptions` (`trustedInput` skips boundary 2 later). `ingest()` calls `source.ingest()` → stores FlatTree; throws if called twice without dispose. `audit()` is an `async function*`: validates `AuditOptions` (boundary 3), asserts a tree is present (else reject with the precondition error), partitions into subtrees, runs dispatch (Task 7) per `(rule, subtree)` **sequentially on the main thread**, yields events through the multiplexer. Emits `audit-started` first and `audit-finished` last (terminal). Handles `signal.aborted` → emit `audit-aborted { partial }`. No module-level state — everything on the instance.

- [ ] **Step 4: Implement `collectResults`** — drains the iterator, assembles `AuditResults` (results array + all the `by*` indexes + `rollupBy` + `errors` ledger).

- [ ] **Step 5: Run, verify pass.**

- [ ] **Step 6: Wire public exports in `src/index.ts`** (`createAuditor`, `collectResults`, `defineRule`, `defineCheck`, `extendRule`, `OneShot` watcher stub, facade/FlatTree types from schemas). Typecheck.

- [ ] **Step 7: Commit** `feat(engine): Auditor + AsyncIterable<AuditEvent> + collectResults (main-thread)`.

---

## Task 10: `@axe-core/host-node` — SnapshotSource (CDP → FlatTree)

**Files:**
- Create: `packages/host-node/src/cdp-to-flat-tree.ts`
- Create: `packages/host-node/src/snapshot-source.ts`
- Create: `packages/host-node/src/index.ts`
- Test: `packages/host-node/test/cdp-to-flat-tree.test.ts`, `snapshot-source.test.ts`

- [ ] **Step 1: Write failing test** with a committed minimal CDP snapshot fixture (`test/fixtures/minimal.cdp.json`) → assert the produced FlatTree has the expected structure (use a real `DOMSnapshot.captureSnapshot` output captured once from Playwright and committed):

```ts
import { describe, it, expect } from 'vitest';
import minimal from './fixtures/minimal.cdp.json';
import { cdpToFlatTree } from '../src/cdp-to-flat-tree';

describe('cdpToFlatTree', () => {
  it('builds a FlatTree with the document root and html element', () => {
    const tree = cdpToFlatTree(minimal);
    expect(tree.nodeName(tree.childrenOf(0)[0])).toBe('HTML');
  });
  it('maps same-origin iframe documents into linked frames', () => { /* … */ });
  it('maps open shadow roots with shadowMode=1', () => { /* … */ });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `cdpToFlatTree`.** Validate with `DomSnapshotSchema` (boundary 2, unless `trustedInput`). Walk `documents[]`: build the FlatTree parallel arrays from CDP's `nodes.parentIndex`/`nodeType`/`nodeName`/`attributes`/`nodeValue`; resolve string indices through CDP's `strings` into the engine's `StringTable`; map `layout.styles` into the packed style arrays for nodes that had computed styles captured; link `contentDocumentIndex` (same-origin iframes) and `shadowRootType` (open shadow). Assign `frameId` per document. **Cross-origin/closed-shadow are out of scope** — record them as unreachable markers (no node data) for now.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Implement `SnapshotSource implements Source`** — `ingest(input)` → `cdpToFlatTree`, `refresh`/`snapshotNode`/`serialize`/`dispose` per the `Source` interface. `snapshotNode` reconstructs outer HTML from the FlatTree on demand. Test `ingest` returns a tree and `serialize` round-trips.

- [ ] **Step 6: Commit** `feat(host-node): SnapshotSource — CDP DOMSnapshot → FlatTree`.

> **Capture-config contract (read before Task 12 Step 4):** the CDP `DOMSnapshot.captureSnapshot` call must request every computed-style property the ported checks read, or those checks will silently fall to `incomplete` for want of data — surfacing at the Task 14 gate as confusing divergences traceable to capture config, not port logic. For the proof subset that means at minimum: `color`, `background-color`, `font-size`, `font-weight` (color-contrast ratio) **plus** `display`, `visibility`, `opacity` (color-contrast visibility path). The Playwright capture helper (`src/capture/playwright-capture.ts`) and `SnapshotSource` must default to this list; expose it as an option so future rules can extend it.

---

## Task 11: Worker pool (SAB) + main-thread fallback

**Files:**
- Create: `packages/host-node/src/worker-pool/main-thread-pool.ts`
- Create: `packages/host-node/src/worker-pool/pool.ts`
- Create: `packages/host-node/src/worker-pool/worker-entry.ts`
- Modify: `packages/engine/src/auditor/auditor.ts` (accept an injected pool)
- Test: `packages/host-node/test/worker-pool/pool.test.ts`

> **Decoupling note:** the engine defines a `TaskRunner` interface (`run(task): AsyncIterable<AuditEvent>`); the pool implementations live in host-node and are injected via `AuditorOptions.workerPool`. This keeps `@axe-core/engine` free of `worker_threads` so it stays portable to the browser host later.

- [ ] **Step 1: Define the `TaskRunner` interface in the engine** (`src/engine/task-runner.ts`): `interface TaskRunner { run(task: Task, signal: AbortSignal): AsyncIterable<AuditEvent>; dispose(): Promise<void> }` where `Task = { ruleId, subtreeRootIndex, snapshotHandle, options }`. Auditor uses a `TaskRunner`; `workerPool: false` selects an in-process runner that calls dispatch directly. Commit this refactor first (`refactor(engine): route dispatch through TaskRunner interface`), re-run Task 9 tests (still green).

- [ ] **Step 2: Write failing test** asserting the main-thread pool and a 2-worker pool produce identical event sets for the same tree + rules:

```ts
import { describe, it, expect } from 'vitest';
import { WorkerPool, MainThreadPool } from '../../src/worker-pool';
// build tree + rules; run both; compare sorted verdict tuples

describe('worker pool parity', () => {
  it('worker-mode and main-thread produce identical verdicts', async () => {
    const main = await runAll(new MainThreadPool(rules));
    const pooled = await runAll(new WorkerPool({ size: 2, rules }));
    expect(verdictTuples(pooled)).toEqual(verdictTuples(main));
  });
  it('requeues tasks from a crashed worker', async () => { /* inject a crashing rule */ });
  it('quarantines a task that crashes a worker twice', async () => { /* … */ });
  it('aborts within one task of signal', async () => { /* … */ });
});
```

- [ ] **Step 3: Run, verify fail.**

- [ ] **Step 4: Implement `MainThreadPool`** — trivial `TaskRunner` running tasks sequentially in-process (this is what `workerPool: false` already does; formalize it here so the same interface is tested both ways).

- [ ] **Step 5: Implement `WorkerPool`.** Auto-size `min(os.availableParallelism(), rules.length * 4)`. Broadcast the FlatTree once via `SharedArrayBuffer` (fall back to `structuredClone` of the serialized tree if SAB unavailable; log once). Task queue with `Atomics.wait/notify`. Each worker (`worker-entry.ts`) reconstructs the tree from the SAB handle, imports the rule module, runs dispatch, posts `AuditEvent`s back via `parentPort`. Crash recovery: on worker `exit`/`error`, requeue its in-flight tasks on a fresh worker; quarantine a task after 2 crashes (results → incomplete, emit `task-quarantined`); >50% pool crash → drain to MainThreadPool + emit `pool-degraded`. `AbortSignal` → stop dispatch, terminate on `'force'` after grace.

> **Rule modules in workers:** workers need the rule definitions. For this plan, pass the rule **pack module specifier** in the task envelope and `await import()` it in the worker (rules are pure ESM modules). Functions can't be `structuredClone`d, so rules are loaded by reference, not transferred.

- [ ] **Step 6: Run, verify pass** (this is a slow/integration test — keep it in the `integration` Vitest project).

- [ ] **Step 7: Commit** `feat(host-node): worker_threads pool with SAB + crash recovery + main-thread fallback`.

---

## Task 12: Port the proof rule pack

Port in escalating difficulty. Each check/rule is TDD'd against a unit fixture, then proven by the parity gate (Task 14).

**Files:** `packages/rules-wcag22aa/src/checks/*.ts`, `src/rules/*.ts`, `src/messages/en.ts`, `src/index.ts`, tests alongside.

- [ ] **Step 1: `document-title` (trivial, page-level).** Port `doc-has-title-evaluate` → `defineCheck({ id: 'doc-has-title', evaluate: async (node) => ({ passed: !!sanitize(documentTitleOf(node)) }), … })`. Source the title from the FlatTree (`<title>` text under `<head>`) rather than `document.title`. Rule `document-title` via `defineRule` (`matches`: is-initiator / root html; `any: ['doc-has-title']`). TDD: title present → pass; empty/whitespace title → violation; no title element → violation. Commit.

- [ ] **Step 2: `html-has-lang` + `html-lang-valid` (attribute checks).** Port `has-lang`/`valid-lang` evaluators over `node.getAttribute('lang')`. TDD valid/missing/malformed lang. Commit.

- [ ] **Step 3: `image-alt` (ARIA + accessible name, moderate).** Port the relevant checks (`has-alt`, and the any/all/none structure from `lib/rules/image-alt.json`). Port the minimal accessible-name commons needed (alt attr, aria-label, aria-labelledby, role=presentation) over the facade into `src/checks/commons/`. TDD: `<img alt="x">` pass; `<img>` violation; `<img alt="">` pass (decorative); `role="presentation"` pass. Commit.

- [ ] **Step 4: `color-contrast` (the hard proof — computed styles through the facade).** Port `color-contrast-evaluate` and the color commons it needs (`getForegroundColor`, `getBackgroundColor`, `getContrast`, shadow-color flattening) into `src/checks/commons/color.ts`, reading `node.computedStyle.getPropertyValue(...)` instead of `window.getComputedStyle`. Visibility via `node.boundingRect` + computed `display`/`visibility`/`opacity`. **Preserve the incomplete paths exactly** — where the current evaluator returns `undefined` (indeterminate background, image background), the port returns `{ passed: 'incomplete', reason }`. TDD: known-fail (#777 on #fff) → violation; known-pass (#595959 on #fff) → pass; indeterminate background → incomplete. Commit.

- [ ] **Step 5: English messages** in `src/messages/en.ts` for every check (pass/fail/incomplete), wired into each `defineCheck`'s `messages`. The `Result.message` rendering uses these.

- [ ] **Step 6: `src/index.ts`** — `export const wcag22aa = [documentTitle, htmlHasLang, htmlLangValid, imageAlt, colorContrast];` plus `export const wcag22aaLocaleEn`.

- [ ] **Step 7: Run the full pack unit suite, verify pass. Commit** `feat(rules-wcag22aa): proof subset — document-title, html-lang, image-alt, color-contrast`.

---

## Task 13: Reporters — legacyV4 + json

**Files:**
- Create: `packages/reporters/src/legacy-v4.ts`, `src/json.ts`, `src/index.ts`
- Test: `packages/reporters/test/legacy-v4.test.ts`

- [ ] **Step 1: Write failing test** — feed an `AuditResults` with one violation through `legacyV4Reporter` and assert the output validates against the v4 shape (the current engine's result schema) and the verdict survives:

```ts
import { describe, it, expect } from 'vitest';
import { legacyV4Reporter } from '../src/legacy-v4';

describe('legacyV4Reporter', () => {
  it('maps a v5 violation into the v4 violations[] array', async () => {
    const out = await runReporter(legacyV4Reporter(), auditResultsFixture);
    expect(out.violations).toHaveLength(1);
    expect(out.violations[0].id).toBe('color-contrast');
    expect(out.violations[0].nodes[0].target).toEqual(['html', 'body', 'button.submit']);
    expect(out.passes.map(p => p.id)).toContain('document-title');
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement `legacyV4Reporter`.** Partition `results[]` by status into `violations/passes/incomplete/inapplicable`. Denormalize: each v4 `node` gets `target` ← `AuditNode.ancestry`, `html` ← `auditor.snapshotNode(nodeId)` (or `outerHtmlHash` placeholder if unavailable), `any/all/none` ← `result.checks` grouped by `ruleSatisfaction`, `failureSummary` ← `result.message`. Build the top-level `url/timestamp/testEngine` from `Audit`. Drop v5-only fields (fingerprints/category/frame metadata) — lossy by design.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Implement `jsonReporter`** (trivial — emit `AuditResults` as JSON to `outputPath`/`output`). One smoke test.

- [ ] **Step 6: Commit** `feat(reporters): legacyV4 down-converter + json reporter`.

---

## Task 14: Parity harness + golden corpus (THE GATE)

**Files:**
- Create: `packages/engine/test/parity/capture-golden.ts`
- Create: `packages/engine/test/parity/diff-verdicts.ts`
- Create: `packages/engine/test/parity/corpus-manifest.json`
- Create: `packages/engine/test/parity/parity-divergences.md`
- Create: `packages/engine/test/parity/golden/` (committed captures)
- Create: `packages/engine/test/parity/parity.test.ts`

- [ ] **Step 1: Select the corpus subset.** Gather the fixtures for the 5 ported rules. NOTE the actual locations (verified): `image-alt` and `color-contrast` (+ `text-shadows`) live under `packages/axe-core/test/integration/rules/<rule>/`; `document-title`, `html-has-lang`, `html-lang-valid` live under `packages/axe-core/test/integration/full/`. Add a handful of additional `test/integration/full/` pages that exercise these rules. Record provenance in `corpus-manifest.json`. **Choose only fixtures within this plan's boundary coverage** (no cross-origin iframes / closed shadow).

- [ ] **Step 2: Implement `capture-golden.ts`.** For each fixture HTML: run the **current** `axe-core` engine (import from the built `packages/axe-core`), restricted via `runOnly` to the 5 rules, and write the v4 result blob to `golden/<fixture>.json`. This is a dev script: `pnpm --filter @axe-core/engine parity:capture`. Commit the golden files.

> The current engine runs in a browser/jsdom context. Use the project's existing Vitest browser setup (Phase 3) or a Playwright page to execute it over each fixture. Reuse `packages/axe-core/vitest.config.ts` browser project conventions.

- [ ] **Step 3: Implement `diff-verdicts.ts`.** Given a golden v4 blob and a new-engine v4 blob (new engine → `SnapshotSource` over the fixture's CDP snapshot → audit → `legacyV4Reporter`), compare at `(ruleId, target, status)` granularity. Return `{ identical, divergences, regressions }`. A divergence is allowed only if it matches an entry in `parity-divergences.md`; otherwise it's a regression.

- [ ] **Step 4: Write `parity.test.ts`** — the gate. For each corpus fixture: capture its CDP snapshot (Playwright helper from Task 10), run the new engine, down-convert, diff against golden. **Assert zero unexplained regressions.** Seed `parity-divergences.md` empty (header + format only).

- [ ] **Step 5: Run the gate.**

Run: `pnpm --filter @axe-core/engine test parity`
Expected: All fixtures parity-clean, OR a small set of divergences each documented in `parity-divergences.md` with rationale. **Any undocumented regression fails.** Iterate on the Task 12 ports until green (this is where verdict bugs surface).

- [ ] **Step 6: Commit** `test(engine): parity corpus harness + golden captures (verdict gate)`.

---

## Task 15: Worker-equality + zero-false-positive gates

**Files:**
- Create: `packages/engine/test/parity/worker-equality.test.ts`
- Create: `packages/engine/test/parity/zero-fp.test.ts`
- Create: `packages/engine/test/parity/known-good/` (committed accessible fixtures)

- [ ] **Step 1: Write `worker-equality.test.ts`** — for each corpus fixture, run the new engine in `workerPool: { size: 4 }` and `workerPool: false`, assert identical verdict sets (the concurrency-correctness gate). Run, iterate until green.

- [ ] **Step 2: Assemble `known-good/`** — a handful of WCAG-passing / ARIA-APG fixtures that MUST produce zero violations for the 5 rules.

- [ ] **Step 3: Write `zero-fp.test.ts`** — assert `results.filter(status === 'violation')` is empty for every known-good fixture (incomplete allowed; violation fails unconditionally). Run, verify pass.

- [ ] **Step 4: Commit** `test(engine): worker-vs-main-thread equality + zero-false-positive gates`.

---

## Task 16: CI wiring

**Files:**
- Modify: `turbo.json` (ensure new packages' `test`/`typecheck`/`build` are in the pipeline)
- Modify: the CI workflow (the four-job shape referenced in CLAUDE.md) — add a `parity` job
- Modify: root `package.json` if a `parity` script aggregator is useful

- [ ] **Step 1: Confirm Turbo picks up the new packages** for `build`/`typecheck`/`test`.

Run: `pnpm turbo run typecheck test --filter './packages/*'`
Expected: all packages incl. new ones run.

- [ ] **Step 2: Add the `parity` CI job** that runs `pnpm --filter @axe-core/engine test parity worker-equality zero-fp`. It blocks merge on unexplained regression. Mark `perf` as advisory (no budget baselined yet — that's a follow-on).

- [ ] **Step 3: Run the full validate locally.**

Run: `pnpm validate`
Expected: typecheck + lint + format + test all green across old and new packages.

- [ ] **Step 4: Commit** `ci(phase-04): add parity gate; wire new packages into turbo pipeline`.

---

## Definition of Done

- [ ] `pnpm validate` green across the whole workspace (current `axe-core` untouched and still passing).
- [ ] The new engine audits a real page via `SnapshotSource` (CDP snapshot) and emits `AuditEvent`s through `collectResults`.
- [ ] **Parity gate green:** for `document-title`, `html-has-lang`, `html-lang-valid`, `image-alt`, `color-contrast`, the new engine's verdicts (via `legacyV4Reporter`) match the current engine's golden captures across the corpus subset — every divergence documented in `parity-divergences.md`.
- [ ] **Worker-equality green:** worker-mode and main-thread verdicts are identical.
- [ ] **Zero-false-positive green:** known-good corpus produces no violations.
- [ ] Two concurrent auditors run in one process with no global-state interference.
- [ ] `AbortSignal` cancels an in-flight audit and yields partial results.

## What this plan deliberately defers (follow-on plans)

- `@axe-core/host-browser` (LiveDomSource, MutationWatcher) + the live/watch lifecycle.
- Cross-origin iframes (OOPIF), closed shadow roots, the `FrameCollector` hook.
- Remaining rule packs (full WCAG 2.2 A/AA/AAA, best-practices, section508, experimental) and the metadata-function-map deletion across the whole rule set.
- `agentReporter`, `@axe-core/mcp-server`, `@axe-core/cli`, `@axe-core/history` observatory.
- Locales beyond English; the ICU message renderer.
- All reporters except `legacyV4`/`json` (SARIF, HTML, JUnit, console, etc.).
- Source attribution (`originSource`) and SARIF inline PR annotation.
- Performance-budget baselining (the `perf` CI job is advisory until then).
- The eventual `axe-core` v5 meta-bundle cutover (re-export new engine; delete old).
