# Phase 1: Type System Modernization

**PRD Version:** 2.0
**Date:** February 16, 2026
**Status:** Draft
**Phase Duration:** 8–10 weeks
**Dependencies:** Phase 0 (Monorepo Scaffolding — PNPM workspace + Turborepo)
**Team:** 2 engineers

---

## 1. Overview

### 1.1 Executive Summary

axe-core currently ships as vanilla JavaScript with hand-maintained JSDoc annotations and a manually authored `axe.d.ts` type declaration file. This approach has three critical problems: the types frequently drift from the actual runtime behavior, contributors cannot rely on the compiler to catch regressions, and consumers of the library get incomplete or incorrect type information.

This phase converts the codebase to TypeScript with strict mode enabled, introduces Zod schemas as the single source of truth for all data shapes (configuration, rule definitions, results), and generates public type declarations directly from the source — eliminating the manual `.d.ts` maintenance burden entirely.

The Zod schemas are extracted into a dedicated `packages/schemas/` workspace package (`@axe-core/schemas`), enabling independent consumption by downstream integration packages (`axe-core-npm`) and third-party tools.

### 1.2 Objectives

- Convert the entire `packages/axe-core/lib/` source tree from `.js` to `.ts` with `strict: true`
- Define Zod schemas in `packages/schemas/` for all public API surfaces: `axe.run()` options, `axe.configure()` input, rule/check definitions, and result objects
- Derive TypeScript types from Zod schemas using `z.infer<>` — single source of truth
- Add runtime validation at public API boundaries (dev mode) using Zod `.parse()` / `.safeParse()`
- Generate `.d.ts` declarations from compiled TypeScript (replace hand-written `axe.d.ts`)
- Publish `@axe-core/schemas` as an independent package for external consumption
- Maintain backward compatibility: no breaking changes to the public API

### 1.3 Success Criteria

- `tsc --noEmit` passes with zero errors across the entire codebase
- `strict: true` enabled in `tsconfig.json` (no escape hatches like `skipLibCheck` on own code)
- All public types derived from Zod schemas (verified by lint rule or CI check)
- Zero regressions in existing test suites
- Published `.d.ts` types pass `attw` (Are The Types Wrong) with no issues
- Bundle size delta ≤ +2KB gzipped (Zod tree-shakes well; dev-only validation is stripped in production builds)
- `@axe-core/schemas` publishes independently and is consumable without `axe-core`

---

## 2. Technical Specification

### 2.1 TypeScript Configuration

```jsonc
// tsconfig.base.json (repo root — shared config)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": [],
    "skipLibCheck": false
  }
}
```

```jsonc
// packages/axe-core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./lib",
    "paths": {
      "@axe-core/schemas": ["../schemas/src"],
      "@axe-core/schemas/*": ["../schemas/src/*"]
    }
  },
  "include": ["lib/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"],
  "references": [
    { "path": "../schemas" }
  ]
}
```

```jsonc
// packages/schemas/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*.ts"]
}
```

**Key decisions:**
- `"module": "ESNext"` + `"moduleResolution": "bundler"` — aligns with Vite 8 (Phase 2) which will handle bundling
- `"isolatedModules": true` — required for Rolldown/esbuild-style transforms that process files individually
- `"exactOptionalPropertyTypes": true` — prevents `undefined` from being assignable where a property is just optional
- `"noUncheckedIndexedAccess": true` — forces null checks on array/object index access, critical for a library that traverses unknown DOM structures
- **Project references** between `axe-core` and `schemas` ensure `tsc --build` resolves workspace dependencies correctly

### 2.2 Zod Schema Architecture

Schemas live in a dedicated workspace package: `packages/schemas/`. This separation enables downstream packages (e.g., `@axe-core/playwright`) to depend on `@axe-core/schemas` for type-safe result validation without pulling in the entire engine.

```
packages/schemas/
├── src/
│   ├── index.ts                  # Public barrel export
│   ├── config.schema.ts          # axe.configure() input
│   ├── context.schema.ts         # axe.run() context parameter
│   ├── options.schema.ts         # axe.run() options parameter
│   ├── results.schema.ts         # axe.run() return value
│   ├── rule-definition.schema.ts # Rule definition shape
│   ├── check-definition.schema.ts# Check definition shape
│   ├── aria.schema.ts            # ARIA role/attribute specs
│   └── locale.schema.ts          # Locale/i18n message shape
├── tsconfig.json
└── package.json
```

**`packages/schemas/package.json`:**
```jsonc
{
  "name": "@axe-core/schemas",
  "version": "1.0.0",
  "description": "Zod schemas and TypeScript types for axe-core data structures",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.ts", "default": "./dist/index.cjs" }
    }
  },
  "files": ["dist/", "LICENSE", "README.md"],
  "peerDependencies": {
    "zod": "^3.24"
  },
  "devDependencies": {
    "zod": "^3.24"
  }
}
```

**Example — Run Options Schema:**

```typescript
// packages/schemas/src/options.schema.ts
import { z } from 'zod';

export const RunOnlySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tag'),
    values: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal('rule'),
    values: z.array(z.string()).min(1),
  }),
]);

export const RuleOverrideSchema = z.object({
  enabled: z.boolean().optional(),
  selector: z.string().optional(),
});

export const RunOptionsSchema = z.object({
  runOnly: RunOnlySchema.optional(),
  rules: z.record(z.string(), RuleOverrideSchema).optional(),
  reporter: z.enum(['v1', 'v2', 'raw', 'rawEnv', 'no-passes']).optional(),
  resultTypes: z.array(z.enum(['violations', 'passes', 'incomplete', 'inapplicable'])).optional(),
  selectors: z.boolean().optional(),
  ancestry: z.boolean().optional(),
  xpath: z.boolean().optional(),
  absolutePaths: z.boolean().optional(),
  iframes: z.boolean().optional(),
  elementRef: z.boolean().optional(),
  frameWaitTime: z.number().int().positive().optional(),
  preload: z.union([z.boolean(), z.object({ assets: z.array(z.string()) })]).optional(),
  performanceTimer: z.boolean().optional(),
  pingWaitTime: z.number().int().positive().optional(),
}).strict();

// Derived TypeScript type — single source of truth
export type RunOptions = z.infer<typeof RunOptionsSchema>;
```

**Example — Results Schema:**

```typescript
// packages/schemas/src/results.schema.ts
import { z } from 'zod';

const RelatedNodeSchema = z.object({
  html: z.string(),
  target: z.array(z.union([z.string(), z.array(z.string())])),
});

const CheckResultSchema = z.object({
  id: z.string(),
  data: z.unknown(),
  relatedNodes: z.array(RelatedNodeSchema).optional(),
  impact: z.enum(['minor', 'moderate', 'serious', 'critical']).nullable(),
  message: z.string(),
});

const NodeResultSchema = z.object({
  html: z.string(),
  target: z.array(z.union([z.string(), z.array(z.string())])),
  ancestry: z.array(z.union([z.string(), z.array(z.string())])).optional(),
  xpath: z.array(z.string()).optional(),
  any: z.array(CheckResultSchema),
  all: z.array(CheckResultSchema),
  none: z.array(CheckResultSchema),
  impact: z.enum(['minor', 'moderate', 'serious', 'critical']).nullable().optional(),
  failureSummary: z.string().optional(),
});

const RuleResultSchema = z.object({
  id: z.string(),
  impact: z.enum(['minor', 'moderate', 'serious', 'critical']).nullable().optional(),
  tags: z.array(z.string()),
  description: z.string(),
  help: z.string(),
  helpUrl: z.string().url(),
  nodes: z.array(NodeResultSchema),
});

export const AxeResultsSchema = z.object({
  toolOptions: z.record(z.unknown()),
  testEngine: z.object({
    name: z.literal('axe-core'),
    version: z.string(),
  }),
  testRunner: z.object({ name: z.string() }),
  testEnvironment: z.object({
    userAgent: z.string(),
    windowWidth: z.number(),
    windowHeight: z.number(),
    orientationAngle: z.number().optional(),
    orientationType: z.string().optional(),
  }),
  url: z.string(),
  timestamp: z.string(),
  passes: z.array(RuleResultSchema),
  violations: z.array(RuleResultSchema),
  incomplete: z.array(RuleResultSchema),
  inapplicable: z.array(RuleResultSchema),
});

export type AxeResults = z.infer<typeof AxeResultsSchema>;
export type RuleResult = z.infer<typeof RuleResultSchema>;
export type NodeResult = z.infer<typeof NodeResultSchema>;
```

### 2.3 Runtime Validation Strategy

Runtime Zod validation is **development-mode only**. In production builds, validation calls are stripped via dead-code elimination (Rolldown will handle this in Phase 2; for Phase 1 we use a simple `process.env.NODE_ENV` guard).

```typescript
// packages/axe-core/lib/core/public/run.ts
import { RunOptionsSchema, type RunOptions } from '@axe-core/schemas';

export function validateRunOptions(options: unknown): RunOptions {
  if (process.env.NODE_ENV !== 'production') {
    const result = RunOptionsSchema.safeParse(options);
    if (!result.success) {
      const formatted = result.error.format();
      throw new TypeError(
        `axe.run(): Invalid options.\n${JSON.stringify(formatted, null, 2)}`
      );
    }
    return result.data;
  }
  // In production, trust the caller (same behavior as today)
  return options as RunOptions;
}
```

**Bundle impact:** Zod is ~13KB gzipped. With tree-shaking and dev-only guards, the production bundle adds 0KB from Zod. Development bundles include full validation with actionable error messages.

### 2.4 Migration Strategy — Incremental Conversion

The conversion follows a bottom-up approach: start with leaf modules (utilities, schemas, constants) and work up to the core engine.

**Sprint 1–2: Foundation (Weeks 1–3)**
- Verify Phase 0 monorepo structure is stable (PNPM workspace, Turborepo tasks)
- Scaffold `packages/schemas/` with Zod dependency, `package.json`, `tsconfig.json`
- Create all Zod schemas in `packages/schemas/src/`
- Add `@axe-core/schemas` as a `workspace:*` dependency in `packages/axe-core/package.json`
- Add `tsconfig.json` with `allowJs: true` temporarily to `packages/axe-core/`
- Convert `packages/axe-core/lib/core/utils/` to TypeScript (pure functions, fewest dependencies)
- Convert ARIA spec data files (`lib/standards/`) to typed constants
- Verify `turbo run typecheck` passes

**Sprint 3–4: Core Engine (Weeks 4–6)**
- Convert `lib/core/base/` (Audit, Rule, Check classes)
- Convert `lib/core/public/` (run, configure, reset, getRules)
- Add Zod validation at public API boundaries (importing from `@axe-core/schemas`)
- Convert `lib/commons/` utilities (DOM, text, color, math)

**Sprint 5: Rules & Checks (Weeks 7–8)**
- Convert all check evaluators in `lib/checks/`
- Convert all rule definitions (these are mostly JSON → typed objects)
- Ensure rule/check metadata is validated by Zod schemas

**Sprint 6: Finalization (Weeks 9–10)**
- Remove `allowJs: true`, enforce `.ts` only
- Enable `strict: true` (fix all remaining `any` types)
- Replace hand-written `axe.d.ts` with generated declarations
- Run `attw` to validate published types
- Publish `@axe-core/schemas` initial release
- Full regression test pass via `turbo run test`

### 2.5 Public API Type Contract

The public API surface is small and well-defined. These are the types that consumers interact with:

```typescript
// Public API — all types derived from Zod schemas in @axe-core/schemas
export declare function run(context?: ContextSpec, options?: RunOptions): Promise<AxeResults>;
export declare function run(options?: RunOptions): Promise<AxeResults>;
export declare function configure(config: AxeConfiguration): void;
export declare function reset(): void;
export declare function getRules(tags?: string[]): RuleMetadata[];
export declare function registerPlugin(plugin: AxePlugin): void;
export declare function cleanup(): void;

// All parameter and return types are z.infer<typeof SomeSchema>
```

### 2.6 Backward Compatibility Guarantees

- No changes to the public API signatures
- No changes to the JSON structure of results
- `axe.configure()` continues to accept plain objects (Zod validates them)
- The `axe.d.ts` published in the package will be more accurate, not less — this may surface type errors in consumers that were previously hidden, but this is a *fix*, not a break
- Runtime validation errors only fire in development mode

---

## 3. Technical Considerations

### 3.1 Known Challenges

**Challenge 1: Dynamic rule/check loading**
- axe-core loads rule and check definitions from JSON files at build time and assembles them into the Audit. The current Grunt pipeline does this via string concatenation.
- **Solution:** Model rule/check definitions as typed objects imported via standard ESM. The build system (Phase 2) will handle bundling. The `packages/build-tools/` workspace package (Phase 2) will contain Vite plugins for code generation.

**Challenge 2: `any` escape hatches in DOM traversal**
- DOM APIs return `Element | null`, and axe-core frequently accesses properties specific to `HTMLInputElement`, `SVGElement`, etc.
- **Solution:** Use type narrowing helpers (e.g., `isHTMLElement()`, `isInputElement()`) as typed guards. Create a shared `lib/core/utils/type-guards.ts` module.

**Challenge 3: Cross-frame communication**
- axe-core uses `postMessage` to communicate with iframes. The message payloads are untyped.
- **Solution:** Define Zod schemas for all message types in `@axe-core/schemas`. Validate inbound messages in development mode.

**Challenge 4: Zod bundle bloat**
- Zod is ~13KB gzipped. For a library that targets ~250KB total, this could be significant.
- **Solution:** All Zod `.parse()` calls are behind `process.env.NODE_ENV !== 'production'` guards. Rolldown (Phase 2) will dead-code-eliminate the entire Zod import in production builds. Phase 1 uses esbuild's `define` to achieve the same effect.

**Challenge 5: Workspace dependency resolution**
- `packages/axe-core/` imports from `@axe-core/schemas` via PNPM's `workspace:*` protocol. During development, PNPM symlinks the package. For published builds, the version is resolved to a real semver.
- **Solution:** Use `"@axe-core/schemas": "workspace:*"` in `packages/axe-core/package.json`. PNPM handles substitution at publish time. `tsconfig.json` path aliases and project references ensure TypeScript resolves correctly.

### 3.2 Testing During Migration

- All existing tests continue to run against the compiled JavaScript output
- New tests for Zod schema validation are added in `packages/schemas/test/`
- CI runs `turbo run typecheck` as a gate — no regressions allowed
- A temporary `allowJs: true` flag is maintained in `packages/axe-core/tsconfig.json` until full conversion

---

## 4. Deliverables

| Deliverable | Description |
|---|---|
| `tsconfig.base.json` (root) | Shared strict TypeScript configuration |
| `packages/schemas/` | Complete `@axe-core/schemas` package with all Zod schema definitions |
| `packages/axe-core/tsconfig.json` | Package-specific TS config extending root |
| `packages/axe-core/lib/**/*.ts` | Full codebase converted from JS to TS |
| Generated `.d.ts` | Replaces hand-written `axe.d.ts` |
| Migration guide | Internal doc for contributors on new type patterns |
| CI gate | `turbo run typecheck` + `attw` checks in GitHub Actions |

---

## 4.1 Phase 3 Carryover — Pure-ESM Import Blockers

Surfaced during Phase 3 Sprint 2 bulk migration of `test/commons/` (2026-04-25). Phase 1 left several `lib/` modules with module-load side effects against an ambient `axe` global, which prevents pure-ESM consumers (notably the new Vitest `unit` project running in Node) from importing them. The Karma+Mocha pipeline did not surface this because it loaded `axe.js` first as a script, populating `axe` before module evaluation.

| Module | Symptom | Resolution |
|---|---|---|
| `lib/core/utils/memoize.ts` line ~23 | Top-level `axe._memoizedFns = []` throws `ReferenceError: axe is not defined` in Node ESM. | Phase 1 follow-up must convert the module-load side effect to a lazy initializer (or expose a typed registry the consumer creates). Closing this unblocks ~58 of the 60 Sprint 2 `it.todo` stubs in `test/unit/commons/`. |
| `lib/commons/aria/valid-langs.ts` (post-TS conversion, commit `5b57d18c`) | `isValidLang('abcd')` returns `true` (should be `false`). Trie traversal returns early at depth 3 with `next === 1` and never validates the 4th char. Surfaced by Sprint 2 `test/unit/commons/utils/valid-langs.test.ts`. | Logic regression introduced during Phase 1 JS→TS conversion. Phase 1 follow-up must restore correct trie traversal semantics. |

Any other `lib/` module that writes to `axe.*` at module top level falls in the same bucket. Phase 1 follow-up should grep for `\baxe\.\w+\s*=` at module top level under `lib/` and audit each hit.

---

## 5. Dependencies & Integration Points

- **Phase 0 (Monorepo Scaffolding):** Must be complete before Phase 1 starts. PNPM workspace, Turborepo, and `packages/` directory structure must be in place.
- **Phase 2 (Build System):** Phase 1 output is `.ts` files. During Phase 1, we continue using the existing Grunt + esbuild pipeline with `tsc` as a pre-step. Phase 2 replaces this with Vite 8. The `packages/build-tools/` workspace package is created in Phase 2 but the directory stub exists from Phase 0.
- **Phase 4 (Rules Optimization):** Typed rule/check definitions from Phase 1 enable the schema-validated, tree-shakeable rule system designed in Phase 4.

---

## 6. Open Questions

1. Should we vendor a minimal Zod subset (just the validators we use) to eliminate the external dependency entirely? Tradeoff: maintenance burden vs. dependency purity. **Leaning no** — Zod is well-maintained, and vendoring creates a fork we'd have to maintain. The production bundle includes 0KB of Zod regardless.
2. Should `axe.configure()` validate eagerly (throw on invalid config) or lazily (validate when `axe.run()` is called)? Eager is more helpful; lazy is more backward-compatible. **Leaning eager** — catching misconfig early is better DX, and it only runs in dev mode.
