# Plan: Phase 1 — Type System Modernization

## Task Description

Convert the axe-core codebase from vanilla JavaScript with hand-maintained JSDoc annotations and a manually authored `axe.d.ts` to TypeScript with `strict: true`. Introduce Zod schemas in `packages/schemas/` as the single source of truth for all public API data shapes. Generate `.d.ts` declarations from compiled TypeScript, eliminating manual type maintenance.

The codebase consists of **492 JavaScript files** totaling **~32,300 lines** across:
- `lib/core/utils/` — 97 files (utility functions)
- `lib/commons/` — 176 files (shared utilities: aria, color, dom, forms, matches, math, standards, table, text)
- `lib/checks/` — 115 files (check evaluators across 17 categories)
- `lib/core/base/` — 14 files (engine: Audit, Rule, Check, VirtualNode, Context)
- `lib/core/public/` — 16 files (public API: run, configure, reset, getRules)
- `lib/core/reporters/` — 10 files (result formatters)
- `lib/standards/` — 7 files (ARIA specs, HTML element data)
- `lib/rules/` — 104 JSON rule definitions

## Objective

When complete:
1. `tsc --noEmit` passes with zero errors across the entire codebase
2. `strict: true` is enabled with no escape hatches
3. All public types derived from Zod schemas via `z.infer<>`
4. Zero regressions in existing test suites
5. Published `.d.ts` types pass `attw` validation
6. Bundle size delta ≤ +2KB gzipped
7. `@axe-core/schemas` publishes independently

## Problem Statement

The current type system has three critical problems:
1. **Type drift** — The hand-written `axe.d.ts` (698 lines) frequently drifts from runtime behavior
2. **No compile-time safety** — Contributors cannot rely on the compiler to catch regressions in the 32K+ lines of JS
3. **Incomplete consumer types** — Downstream consumers get incorrect or incomplete type information

## Solution Approach

**Bottom-up incremental TypeScript conversion** with `allowJs: true` enabled during migration:

1. **Schemas first** — Build `@axe-core/schemas` package with Zod schemas for all public API surfaces
2. **Leaves first** — Convert utility functions and standards data (fewest dependencies)
3. **Core next** — Convert engine classes (Audit, Rule, Check) and public API
4. **Commons** — Convert shared utilities (DOM, text, color, etc.)
5. **Checks & rules last** — Convert check evaluators and rule definitions
6. **Finalize** — Remove `allowJs`, enforce `strict: true` everywhere, replace `axe.d.ts`

Runtime Zod validation is **dev-mode only** behind `process.env.NODE_ENV !== 'production'` guards.

## Relevant Files

### Existing Files to Modify

- `tsconfig.base.json` — Update to match PRD spec (add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`, remove `skipLibCheck`)
- `packages/schemas/package.json` — Update from stub to full package config with Zod dep, exports map
- `packages/schemas/tsconfig.json` — Add `composite: true` for project references
- `packages/axe-core/tsconfig.json` — Replace test-only config with full TS config extending base, add `allowJs: true`, project references
- `packages/axe-core/package.json` — Add `@axe-core/schemas` workspace dependency, update `typings` field
- `packages/axe-core/axe.d.ts` — Will be deleted and replaced by generated declarations
- `packages/axe-core/lib/**/*.js` — All 492 files renamed to `.ts` and typed
- `packages/axe-core/lib/rules/*.json` — Convert to typed `.ts` rule definitions
- `packages/axe-core/lib/standards/*.js` — Convert to typed constants
- `turbo.json` — Add `typecheck` task configuration

### New Files to Create

- `packages/schemas/src/index.ts` — Public barrel export
- `packages/schemas/src/config.schema.ts` — `axe.configure()` input schema
- `packages/schemas/src/context.schema.ts` — `axe.run()` context parameter schema
- `packages/schemas/src/options.schema.ts` — `axe.run()` options schema
- `packages/schemas/src/results.schema.ts` — `axe.run()` return value schema
- `packages/schemas/src/rule-definition.schema.ts` — Rule definition schema
- `packages/schemas/src/check-definition.schema.ts` — Check definition schema
- `packages/schemas/src/aria.schema.ts` — ARIA role/attribute schemas
- `packages/schemas/src/locale.schema.ts` — Locale/i18n message schema
- `packages/axe-core/lib/core/utils/type-guards.ts` — DOM type narrowing helpers

## Implementation Phases

### Phase 1: Foundation (Tasks 1–4)
- Update TypeScript configuration across all packages
- Scaffold `@axe-core/schemas` with Zod dependency
- Create all Zod schemas from the existing `axe.d.ts` type contract
- Set up `turbo run typecheck` CI gate

### Phase 2: Leaf Module Conversion (Tasks 5–7)
- Convert `lib/standards/` (7 files) — typed ARIA/HTML data constants
- Convert `lib/core/utils/` (97 files) — pure utility functions, fewest deps
- Create DOM type guards (`isHTMLElement`, `isInputElement`, etc.)

### Phase 3: Core Engine Conversion (Tasks 8–10)
- Convert `lib/core/base/` (14 files) — Audit, Rule, Check, VirtualNode, Context
- Convert `lib/core/public/` (16 files) — run, configure, reset, getRules
- Convert `lib/core/reporters/` (10 files) — result formatters
- Add Zod runtime validation at public API boundaries (dev-mode only)

### Phase 4: Commons Conversion (Task 11)
- Convert `lib/commons/` (176 files) — aria, color, dom, forms, matches, math, standards, table, text

### Phase 5: Checks & Rules Conversion (Tasks 12–13)
- Convert `lib/checks/` (115 files) — check evaluators
- Convert `lib/rules/` (104 JSON files) — rule definitions to typed TS objects

### Phase 6: Finalization (Tasks 14–16)
- Remove `allowJs: true`, enforce strict-only `.ts`
- Delete hand-written `axe.d.ts`, configure generated declaration output
- Run `attw` validation, full test regression pass
- Update CI workflows

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: schemas-builder
  - Role: Build the `@axe-core/schemas` package — all Zod schema definitions, package config, barrel exports
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: ts-config-builder
  - Role: Update TypeScript and Turborepo configuration across all packages
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: utils-converter
  - Role: Convert `lib/core/utils/` and `lib/standards/` files from JS to TS, create type guards
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: core-converter
  - Role: Convert `lib/core/base/`, `lib/core/public/`, `lib/core/reporters/` from JS to TS
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: commons-converter
  - Role: Convert `lib/commons/` (176 files) from JS to TS
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: checks-rules-converter
  - Role: Convert `lib/checks/` and `lib/rules/` from JS/JSON to TS
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: finalization-builder
  - Role: Remove `allowJs`, delete `axe.d.ts`, configure declaration generation, CI updates
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: validator
  - Role: Run typecheck, lint, tests, and `attw` to validate each phase completes correctly
  - Agent Type: general-purpose
  - Resume: true

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Update TypeScript Configuration
- **Task ID**: update-tsconfig
- **Depends On**: none
- **Assigned To**: ts-config-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with task 2)
- Update `tsconfig.base.json` to match PRD: target `ES2022`, add `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `isolatedModules`, remove `skipLibCheck`
- Update `packages/schemas/tsconfig.json`: add `composite: true`
- Replace `packages/axe-core/tsconfig.json` with proper config: extend base, `allowJs: true`, `outDir: ./dist`, `rootDir: ./lib`, project references to `../schemas`, path aliases for `@axe-core/schemas`
- Update `turbo.json` to include `typecheck` task with `dependsOn: ["^build"]`
- Verify `tsc --noEmit` runs (will have errors, that's expected)

### 2. Scaffold @axe-core/schemas Package
- **Task ID**: scaffold-schemas
- **Depends On**: none
- **Assigned To**: schemas-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with task 1)
- Update `packages/schemas/package.json` with full config: `type: "module"`, dual CJS/ESM exports, `zod` as peer dependency, build script
- Add `zod@^3.24` as dependency via `pnpm add zod -w --filter @axe-core/schemas`
- Add `@axe-core/schemas` as `workspace:*` dependency in `packages/axe-core/package.json`
- Create empty `packages/schemas/src/index.ts` barrel export

### 3. Create Zod Schemas
- **Task ID**: create-schemas
- **Depends On**: scaffold-schemas
- **Assigned To**: schemas-builder
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `packages/schemas/src/options.schema.ts` — `RunOptionsSchema`, `RunOnlySchema`, `RuleOverrideSchema` (reference PRD examples and `axe.d.ts` lines 125-196)
- Create `packages/schemas/src/context.schema.ts` — `ContextSpecSchema`, `ContextObjectSchema`, selector types
- Create `packages/schemas/src/results.schema.ts` — `AxeResultsSchema`, `RuleResultSchema`, `NodeResultSchema`, `CheckResultSchema`, `RelatedNodeSchema`
- Create `packages/schemas/src/config.schema.ts` — `AxeConfigurationSchema` (maps to `Spec` interface in `axe.d.ts`)
- Create `packages/schemas/src/rule-definition.schema.ts` — `RuleDefinitionSchema`
- Create `packages/schemas/src/check-definition.schema.ts` — `CheckDefinitionSchema`
- Create `packages/schemas/src/aria.schema.ts` — `AriaAttrsSchema`, `AriaRolesSchema`
- Create `packages/schemas/src/locale.schema.ts` — `LocaleSchema`, `RuleLocaleSchema`, `CheckLocaleSchema`
- Update `packages/schemas/src/index.ts` to re-export all schemas and inferred types
- All types must be derived via `z.infer<>` — this is the single source of truth
- Cross-reference every type against `axe.d.ts` to ensure completeness

### 4. Validate Schema Foundation
- **Task ID**: validate-schemas
- **Depends On**: update-tsconfig, create-schemas
- **Assigned To**: validator
- **Agent Type**: general-purpose
- **Parallel**: false
- Run `pnpm install` to link workspace dependencies
- Run `tsc --noEmit` in `packages/schemas/` — must pass with zero errors
- Run `turbo run typecheck` — schemas package must pass
- Verify all public types from `axe.d.ts` have corresponding Zod schemas

### 5. Convert Standards Data
- **Task ID**: convert-standards
- **Depends On**: validate-schemas
- **Assigned To**: utils-converter
- **Agent Type**: general-purpose
- **Parallel**: true (with task 6)
- Rename `lib/standards/*.js` to `.ts`
- Add type annotations to ARIA attrs, ARIA roles, CSS colors, DPUB roles, graphics roles, HTML elements data
- Import relevant types from `@axe-core/schemas` where applicable
- Update `lib/standards/index.js` → `index.ts` with typed exports
- Verify `tsc --noEmit` passes for these files

### 6. Create Type Guards
- **Task ID**: create-type-guards
- **Depends On**: validate-schemas
- **Assigned To**: utils-converter
- **Agent Type**: general-purpose
- **Parallel**: true (with task 5)
- Create `lib/core/utils/type-guards.ts` with DOM type narrowing helpers:
  - `isHTMLElement(node): node is HTMLElement`
  - `isInputElement(node): node is HTMLInputElement`
  - `isSVGElement(node): node is SVGElement`
  - `isDocument(node): node is Document`
  - `isWindow(obj): obj is Window`
  - `isNode(obj): obj is Node`
  - Other guards needed based on usage patterns in the codebase
- These guards will be used extensively during the core conversion

### 7. Convert Core Utils
- **Task ID**: convert-utils
- **Depends On**: convert-standards, create-type-guards
- **Assigned To**: utils-converter
- **Agent Type**: general-purpose
- **Parallel**: false
- Rename all 97 files in `lib/core/utils/` from `.js` to `.ts`
- Add type annotations to all function parameters and return types
- Replace `any` with proper types, using type guards for DOM narrowing
- Convert `lib/core/utils/frame-messenger/` (8 files) — type message payloads
- Update `lib/core/utils/index.js` → `index.ts`
- Import types from `@axe-core/schemas` at API boundaries
- Run `tsc --noEmit` after each batch (process in groups of ~15-20 files)
- **Key files requiring extra care:**
  - `dq-element.js` — complex DOM serialization
  - `node-serializer.js` — custom serialization interface
  - `select.js` — CSS selector engine integration
  - `preload-cssom.js` — cross-origin stylesheet handling
  - `queue.js` — async queue implementation

### 8. Convert Core Base Classes
- **Task ID**: convert-core-base
- **Depends On**: convert-utils
- **Assigned To**: core-converter
- **Agent Type**: general-purpose
- **Parallel**: false
- Convert `lib/core/base/virtual-node/` (3 files): `abstract-virtual-node.js`, `serial-virtual-node.js`, `virtual-node.js`
- Convert `lib/core/base/context/` (3 files): `create-frame-context.js`, `normalize-context.js`, `parse-selector-array.js`
- Convert `lib/core/base/check.js` (215 lines) and `lib/core/base/check-result.js`
- Convert `lib/core/base/rule.js` (662 lines) and `lib/core/base/rule-result.js`
- Convert `lib/core/base/audit.js` (714 lines) — the central orchestrator
- Convert `lib/core/base/cache.js` and `lib/core/base/metadata-function-map.js`
- Convert `lib/core/base/context.js`
- Use types from `@axe-core/schemas` for Rule/Check/Audit definitions
- Run `tsc --noEmit` after completing base conversions

### 9. Convert Core Public API
- **Task ID**: convert-core-public
- **Depends On**: convert-core-base
- **Assigned To**: core-converter
- **Agent Type**: general-purpose
- **Parallel**: false
- Convert `lib/core/public/run.js` and `lib/core/public/run/` directory
- Convert `lib/core/public/configure.js` — add Zod validation guard (dev-mode only)
- Convert `lib/core/public/run-partial.js`, `lib/core/public/finish-run.js`
- Convert `lib/core/public/get-rules.js`, `lib/core/public/reset.js`, `lib/core/public/cleanup.js`
- Convert `lib/core/public/plugins.js`, `lib/core/public/reporter.js`
- Convert `lib/core/public/setup.js`, `lib/core/public/teardown.js`
- Convert `lib/core/public/load.js`, `lib/core/public/frame-messenger.js`, `lib/core/public/run-rules.js`, `lib/core/public/run-virtual-rule.js`
- Add Zod `safeParse` validation at `axe.run()` and `axe.configure()` entry points behind `process.env.NODE_ENV !== 'production'`
- Convert remaining core files: `lib/core/constants.js`, `lib/core/core.js`, `lib/core/index.js`, `lib/core/log.js`, `lib/core/_exposed-for-testing.js`
- Run `tsc --noEmit`

### 10. Convert Core Reporters
- **Task ID**: convert-reporters
- **Depends On**: convert-core-public
- **Assigned To**: core-converter
- **Agent Type**: general-purpose
- **Parallel**: false
- Convert `lib/core/reporters/helpers/` (4 files): `failure-summary.js`, `incomplete-fallback-msg.js`, `process-aggregate.js`, `index.js`
- Convert `lib/core/reporters/` (6 reporter files): `v1.js`, `v2.js`, `raw.js`, `raw-env.js`, `na.js`, `no-passes.js`
- Use `AxeResults` and `RawResult` types from schemas
- Run `tsc --noEmit`

### 11. Convert Commons
- **Task ID**: convert-commons
- **Depends On**: convert-reporters
- **Assigned To**: commons-converter
- **Agent Type**: general-purpose
- **Parallel**: false
- Convert in dependency order (leaves first):
  1. `lib/commons/math/` — pure math utilities
  2. `lib/commons/matches/` — matcher utilities
  3. `lib/commons/forms/` — form element helpers
  4. `lib/commons/table/` — table analysis
  5. `lib/commons/standards/` — standards lookups
  6. `lib/commons/text/` — accessible text computation
  7. `lib/commons/aria/` — ARIA role/attribute utilities
  8. `lib/commons/dom/` — DOM traversal and analysis (most complex, depends on many others)
  9. `lib/commons/color/` — color contrast analysis (uses DOM, math)
- Update `lib/commons/index.js` → `index.ts`
- Use type guards extensively for DOM element narrowing
- Run `tsc --noEmit` after each sub-directory

### 12. Convert Check Evaluators
- **Task ID**: convert-checks
- **Depends On**: convert-commons
- **Assigned To**: checks-rules-converter
- **Agent Type**: general-purpose
- **Parallel**: true (with task 13)
- Convert all 115 files in `lib/checks/` across 17 categories:
  - `aria/`, `color/`, `forms/`, `generic/`, `keyboard/`, `label/`, `landmarks/`, `language/`, `lists/`, `media/`, `mobile/`, `navigation/`, `parsing/`, `shared/`, `tables/`, `visibility/`
- Each check evaluator function receives `(node: HTMLElement, options: unknown, virtualNode: VirtualNode)` — type accordingly
- Import `CheckHelper` type from schemas
- Run `tsc --noEmit` after each category

### 13. Convert Rule Definitions
- **Task ID**: convert-rules
- **Depends On**: convert-commons
- **Assigned To**: checks-rules-converter
- **Agent Type**: general-purpose
- **Parallel**: true (with task 12)
- Convert 104 JSON rule definition files in `lib/rules/` to typed TypeScript objects
- Each rule JSON becomes a typed `RuleDefinition` object validated by the Zod schema
- Convert any `.js` match functions in `lib/rules/` to `.ts`
- Update rule imports/index

### 14. Remove allowJs and Strict Enforcement
- **Task ID**: enforce-strict
- **Depends On**: convert-checks, convert-rules
- **Assigned To**: finalization-builder
- **Agent Type**: general-purpose
- **Parallel**: false
- Remove `allowJs: true` from `packages/axe-core/tsconfig.json`
- Verify no `.js` files remain in `lib/` (only `.ts`)
- Run `tsc --noEmit` with full strict mode — fix any remaining `any` types
- Ensure no `@ts-ignore` or `@ts-expect-error` comments exist (or document any that are genuinely necessary)

### 15. Replace Hand-Written axe.d.ts
- **Task ID**: replace-dts
- **Depends On**: enforce-strict
- **Assigned To**: finalization-builder
- **Agent Type**: general-purpose
- **Parallel**: false
- Delete `packages/axe-core/axe.d.ts`
- Configure `tsconfig.json` to emit declarations to `dist/`
- Update `packages/axe-core/package.json`: change `typings` field to point to generated declarations
- Run `tsc --build` to generate `.d.ts` files
- Run `attw` (Are The Types Wrong) to validate published type quality
- Verify generated types cover all public API surfaces documented in the old `axe.d.ts`

### 16. Final Validation
- **Task ID**: validate-all
- **Depends On**: replace-dts
- **Assigned To**: validator
- **Agent Type**: general-purpose
- **Parallel**: false
- Run `turbo run typecheck` — zero errors
- Run `pnpm test` from root — all existing tests pass
- Run `pnpm lint` — no lint errors
- Run `pnpm format` — formatting passes
- Run `pnpm build` — build succeeds
- Verify bundle size delta ≤ +2KB gzipped vs. baseline
- Run `attw` on the published package output
- Verify `@axe-core/schemas` is independently importable
- Run full regression: `pnpm validate`

## Acceptance Criteria

- [ ] `tsc --noEmit` passes with zero errors across entire codebase
- [ ] `strict: true` enabled in all `tsconfig.json` files — no `skipLibCheck` on own code
- [ ] All 492 `.js` files in `lib/` converted to `.ts`
- [ ] All 104 rule JSON files converted to typed `.ts` objects
- [ ] All public types derived from Zod schemas via `z.infer<>` (single source of truth)
- [ ] `@axe-core/schemas` package builds and is independently consumable
- [ ] Zero regressions in existing test suites (`pnpm test` passes)
- [ ] Published `.d.ts` types pass `attw` with no issues
- [ ] Bundle size delta ≤ +2KB gzipped
- [ ] Runtime Zod validation only active in dev mode (`process.env.NODE_ENV !== 'production'`)
- [ ] No `@ts-ignore` comments without documented justification
- [ ] `turbo run typecheck` is a CI gate
- [ ] Hand-written `axe.d.ts` deleted and replaced with generated declarations

## Validation Commands

Execute these commands to validate the task is complete:

- `pnpm install` — Workspace dependencies resolve correctly
- `turbo run typecheck` — TypeScript compilation passes with zero errors
- `pnpm test` — All existing test suites pass
- `pnpm lint` — Linting passes
- `pnpm format` — Formatting passes
- `pnpm build` — Build succeeds
- `pnpm validate` — All checks pass (typecheck + lint + format + test)
- `find packages/axe-core/lib -name "*.js" | wc -l` — Should output `0`
- `npx attw packages/axe-core` — Published types are correct
- `node -e "require('@axe-core/schemas')"` — Schemas package is consumable

## Notes

- **Zod version**: Use `zod@^3.24` (latest stable). Zod v4 (Mini) is available but v3 is more battle-tested.
- **Bundle impact**: Zod is ~13KB gzipped but is only used in dev mode. Production builds tree-shake it out via `process.env.NODE_ENV` guard. Verify with bundle analysis.
- **Backward compatibility**: No public API changes. The generated `.d.ts` types will be _more accurate_ than the hand-written ones, which may surface type errors in downstream consumers — this is a fix, not a break.
- **Test strategy during migration**: Existing Mocha/Karma tests continue running against compiled JS output. `allowJs: true` ensures mixed JS/TS compilation works throughout.
- **Large file conversions**: `audit.js` (714 lines), `rule.js` (662 lines), and the DOM commons files are the most complex. Budget extra time for these.
- **Cross-frame messaging**: The `frame-messenger/` directory (8 files) handles `postMessage` payloads that are currently untyped. Define message schemas in `@axe-core/schemas` and validate inbound messages in dev mode.
