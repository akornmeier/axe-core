# Plan: Build System Modernization (Phase 2)

## Task Description
Replace axe-core's entire Grunt-based build pipeline with Vite 8 (via `rolldown-vite` initially) as the sole build orchestrator. Migrate all custom Grunt tasks to Vite plugins in `packages/build-tools/`. Replace ESLint with Oxlint and Prettier with Oxfmt (advisory). Wire everything through Turborepo for caching and dependency-aware ordering. Produce identical distribution artifacts: `axe.js`, `axe.min.js`, `axe.{locale}.js`, `axe.{locale}.min.js`, plus new ESM (`axe.mjs`) and CJS (`axe.cjs`) outputs.

## Objective
When complete, `pnpm build` produces all distribution artifacts via Vite + Rolldown in <8s, `pnpm lint` runs Oxlint in <1s, `Gruntfile.js` and all Grunt-related dependencies are removed, and zero test regressions exist.

## Problem Statement
The current build pipeline is a 12-year-old Grunt orchestration of 10+ discrete steps: `clean → validate → metadata-function-map → esbuild → configure → babel → concat → uglify → aria-supported → add-locale → prettier → bytesize`. Files are literally concatenated using `intro.stub`/`outro.stub` wrappers to create a UMD IIFE. This approach:
- Takes 30-45s for a full build
- Requires 15+ Grunt/Babel/UglifyJS devDependencies
- Uses string replacement and file concatenation instead of module bundling
- Cannot produce ESM or CJS module outputs
- Has no caching or incremental builds

## Solution Approach
Replace the entire pipeline with Vite library mode (via `rolldown-vite`), which natively handles bundling, minification, sourcemaps, and multi-format output. Custom Grunt tasks become Vite plugins or standalone Node scripts in `packages/build-tools/`. The key architectural insight is that **most Grunt steps are unnecessary with modern tooling**:
- `concat` → Rolldown's module graph (entry point imports replace concatenation)
- `babel` → Rolldown's Oxc transformer
- `uglify` → Rolldown's Oxc minifier
- `prettier` (build step) → eliminated (Rolldown output is readable)
- `esbuild` → eliminated (Rolldown handles TS → JS)

Only three custom tasks need real migration: `metadata-function-map`, `configure`, and `aria-supported`. The `add-locale` task becomes a build script, and `validate`/`bytesize` become standalone Node scripts.

## Relevant Files
Use these files to complete the task:

### Current Build System (to be replaced)
- `packages/axe-core/Gruntfile.js` — Current build orchestration, defines the full pipeline
- `packages/axe-core/build/tasks/metadata-function-map.js` — Scans rule/check files, generates import map
- `packages/axe-core/build/tasks/configure.js` — Reads rule/check JSON, generates `axe._load()` configuration blob
- `packages/axe-core/build/tasks/aria-supported.js` — Generates `doc/aria-supported.md` from ARIA spec data
- `packages/axe-core/build/tasks/add-locale.js` — Generates locale template from rule/check metadata
- `packages/axe-core/build/tasks/validate.js` — Validates rule/check JSON schemas
- `packages/axe-core/build/tasks/esbuild.js` — Transpiles TS to JS
- `packages/axe-core/build/configure.js` — Core logic for building rule/check configuration and rule descriptions markdown
- `packages/axe-core/build/build-manual.js` — Reads and parses rule/check/misc JSON definitions
- `packages/axe-core/build/templates.js` — Template strings for function wrapping (evaluate, after, gather, matches)
- `packages/axe-core/build/shared/format.js` — Prettier formatting utility
- `packages/axe-core/lib/intro.stub` — UMD IIFE opening wrapper
- `packages/axe-core/lib/outro.stub` — UMD IIFE closing wrapper

### Current Generated Files
- `packages/axe-core/lib/core/base/metadata-function-map.ts` — Auto-generated map of check/rule function imports (~330 lines, 165 imports + map object)

### Configuration Files (to be modified)
- `packages/axe-core/package.json` — Scripts, dependencies, exports map
- `packages/axe-core/tsconfig.json` — TypeScript config
- `packages/axe-core/eslint.config.js` — ESLint flat config (to be replaced by Oxlint)
- `package.json` (root) — Workspace scripts, shared devDependencies
- `turbo.json` — Turborepo task configuration
- `pnpm-workspace.yaml` — Workspace definition

### Source Entry Points
- `packages/axe-core/lib/core/index.ts` — UMD module detection and `axe` global setup
- `packages/axe-core/lib/core/core.ts` — Core engine: imports all public API, utilities, reporters, commons

### Data Files
- `packages/axe-core/lib/rules/*.json` — 90+ rule definition JSON files
- `packages/axe-core/lib/checks/**/*.json` — 100+ check definition JSON files
- `packages/axe-core/lib/misc/*.json` — Failure summary and incomplete fallback messages
- `packages/axe-core/locales/*.json` — 19 locale translation files

### Dependencies
- `packages/schemas/` — `@axe-core/schemas` Zod schemas (already built in Phase 1)
- `packages/build-tools/` — Stub package exists, needs Vite plugins implemented

### New Files
- `packages/axe-core/vite.config.ts` — Vite library mode configuration
- `packages/build-tools/src/vite-plugin-axe-metadata.ts` — Replaces metadata-function-map + configure Grunt tasks
- `packages/build-tools/src/vite-plugin-axe-aria.ts` — Replaces aria-supported Grunt task
- `packages/build-tools/src/build-locales.ts` — Replaces add-locale Grunt task as a standalone script
- `packages/build-tools/src/validate-definitions.ts` — Replaces validate Grunt task as a standalone script
- `packages/build-tools/src/report-size.ts` — Replaces bytesize Grunt task
- `packages/axe-core/lib/index.ts` — New entry point for Vite library mode (replaces intro.stub/outro.stub concatenation)
- `oxlint.json` — Root Oxlint configuration (replaces ESLint)
- `oxfmt.json` — Root Oxfmt configuration (replaces Prettier as advisory)

## Implementation Phases
### Phase 1: Foundation (Sprint 1)
Set up Vite in `packages/axe-core/` and verify basic bundling works. Create a new `lib/index.ts` entry point that replaces the stub-based concatenation. Install and configure Oxlint at the repo root. Run both old Grunt build and new Vite build in parallel to diff outputs.

**Critical challenge:** The current architecture uses `intro.stub`/`outro.stub` to wrap all code in a UMD IIFE, with `lib/core/index.ts` using `declare const axe` to reference a variable created by the stub. The new entry point must properly export the `axe` object using Vite's library mode UMD output instead. The `lib/core/core.ts` file assigns everything to a global `axe` object — this needs to be refactored to use proper module exports.

### Phase 2: Core Implementation (Sprint 2)
Implement the three critical Vite plugins:
1. **`vite-plugin-axe-metadata`** — The current `metadata-function-map` task scans `lib/checks/**/*-{evaluate,after}.ts` and `lib/rules/**/*-matches.ts`, generates import statements and a map. The current `configure` task reads all rule/check/misc JSON, applies locale translations, compiles doT templates for messages, and generates an `axe._load(...)` call. These two must be combined into a single plugin that generates both the function map and the configuration data as importable TypeScript modules.
2. **`vite-plugin-axe-aria`** — Reads ARIA spec data via `aria-query`, compares against axe-core's internal standards, generates `doc/aria-supported.md`.
3. **`build-locales.ts`** — For each locale JSON file, validates against Zod `LocaleSchema`, invokes `vite build` with the locale injected.

### Phase 3: Integration & Polish (Sprint 3-4)
Remove Gruntfile.js and all Grunt-related devDependencies. Update CI workflows. Update Turborepo configuration. Verify all artifacts match. Performance benchmarking. Ensure downstream compatibility.

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
  - Name: builder-vite-config
  - Role: Set up Vite library mode configuration and create the new entry point that replaces stub-based concatenation
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: builder-metadata-plugin
  - Role: Implement the vite-plugin-axe-metadata Vite plugin (replaces metadata-function-map + configure Grunt tasks)
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: builder-aria-plugin
  - Role: Implement the vite-plugin-axe-aria Vite plugin and build-locales script (replaces aria-supported + add-locale Grunt tasks)
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: builder-oxlint
  - Role: Install and configure Oxlint, migrate ESLint rules, set up Oxfmt advisory config
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: builder-cleanup
  - Role: Remove Grunt, Babel, ESLint, and legacy dependencies; update package.json scripts, turbo.json, CI workflows
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: builder-validate-scripts
  - Role: Implement validate-definitions.ts and report-size.ts standalone Node scripts in build-tools
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: validator-artifacts
  - Role: Validate build artifacts match between old and new build, run all tests, verify zero regressions
  - Agent Type: general-purpose
  - Resume: true

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Create New Entry Point for Vite Library Mode
- **Task ID**: create-entry-point
- **Depends On**: none
- **Assigned To**: builder-vite-config
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `packages/axe-core/lib/index.ts` as the new Vite entry point
- This file must replace the `intro.stub`/`outro.stub` concatenation approach
- The current `lib/core/core.ts` assigns everything to a global `axe` object via `declare const axe`. The new entry point should:
  - Import everything from `lib/core/core.ts`
  - Build and export the `axe` object as a proper ES module default export
  - Ensure the UMD format still sets `window.axe` (Vite's `build.lib.name: 'axe'` handles this)
  - Maintain the `axe.source` property for Node.js consumers (currently set in `lib/core/index.ts`)
  - Maintain AMD define support
- The `lib/core/index.ts` logic (AMD define, module.exports, window.axe assignment) should be absorbed into the new entry point or handled by Vite's output format config
- Ensure all existing public API surface is preserved: `axe.run`, `axe.configure`, `axe.getRules`, `axe.cleanup`, `axe.reset`, `axe.registerPlugin`, `axe.commons`, `axe.utils`, etc.
- Reference files: `lib/core/core.ts` (lines 1-50+), `lib/core/index.ts`, `lib/intro.stub`, `lib/outro.stub`

### 2. Set Up Vite Configuration
- **Task ID**: setup-vite-config
- **Depends On**: create-entry-point
- **Assigned To**: builder-vite-config
- **Agent Type**: general-purpose
- **Parallel**: false
- Install `rolldown-vite` (Vite 7 + Rolldown) in `packages/axe-core/`
- Create `packages/axe-core/vite.config.ts` with library mode configuration per PRD Section 2.1:
  - Entry: `lib/index.ts`
  - Name: `axe`
  - Formats: `['umd', 'es', 'cjs']`
  - Filenames: `axe.js` (UMD), `axe.mjs` (ESM), `axe.cjs` (CJS)
  - Banner with license comment
  - `minify: true` for `.min.js` variant
  - `sourcemap: true`
  - `target: 'es2022'`
- Define `__AXE_VERSION__` via Vite's `define` config (replaces `<%= pkg.version %>` Grunt template)
- Configure two build passes: one unminified (axe.js) and one minified (axe.min.js) — or use Vite's built-in minification to produce both
- Verify `vite build` produces a working `axe.js` that can be loaded in Node and browser
- Update `packages/axe-core/package.json` scripts: `"build": "vite build"`
- Update `packages/axe-core/package.json` exports map per PRD Section 2.6

### 3. Implement vite-plugin-axe-metadata
- **Task ID**: implement-metadata-plugin
- **Depends On**: setup-vite-config
- **Assigned To**: builder-metadata-plugin
- **Agent Type**: general-purpose
- **Parallel**: false
- Update `packages/build-tools/package.json` with proper exports and dependencies per PRD Section 2.2
- Implement `packages/build-tools/src/vite-plugin-axe-metadata.ts`
- This plugin combines two current Grunt tasks:
  1. **metadata-function-map**: Scans `lib/checks/**/*-{evaluate,after}.ts` and `lib/rules/**/*-matches.ts`, generates a TypeScript file with imports and a map object. Current implementation is in `build/tasks/metadata-function-map.js`. The generated file is `lib/core/base/metadata-function-map.ts`.
  2. **configure**: Reads all `lib/rules/**/*.json`, `lib/checks/**/*.json`, `lib/misc/**/*.json`. For each, parses metadata, compiles doT templates in message strings to functions, resolves locale translations, generates a configuration blob. Current implementation: `build/configure.js` + `build/build-manual.js` + `build/templates.js`.
- The plugin should run as a `buildStart` hook and generate:
  - `lib/core/generated/metadata-function-map.ts` (or update the existing path)
  - `lib/core/generated/default-config.ts` — the rule/check/misc configuration as a typed module that the Audit imports directly (replaces the `axe._load(...)` string injection)
- The plugin must handle doT template compilation for check messages (see `build/configure.js` lines 123-140)
- The plugin must generate `doc/rule-descriptions.md` (currently done by configure task)
- Add `.gitignore` entries for generated files
- Reference files: `build/tasks/metadata-function-map.js`, `build/configure.js`, `build/build-manual.js`, `build/templates.js`

### 4. Implement validate-definitions Script
- **Task ID**: implement-validate-script
- **Depends On**: none
- **Assigned To**: builder-validate-scripts
- **Agent Type**: general-purpose
- **Parallel**: true (with task 1-2)
- Implement `packages/build-tools/src/validate-definitions.ts`
- Port the validation logic from `build/tasks/validate.js` to a standalone Node script
- Validate rule and check JSON files against schemas (use Zod schemas from `@axe-core/schemas` if available, otherwise port the revalidator-based schemas)
- Include the rule tag validation logic (lines 288-476 of validate.js)
- Should be runnable as `tsx packages/build-tools/src/validate-definitions.ts`
- Add as a `"validate:definitions"` script in `packages/axe-core/package.json`

### 5. Implement report-size Script
- **Task ID**: implement-report-size
- **Depends On**: none
- **Assigned To**: builder-validate-scripts
- **Agent Type**: general-purpose
- **Parallel**: true (with task 4)
- Implement `packages/build-tools/src/report-size.ts` per PRD Section 2.2.9
- Read `dist/axe.min.js`, compute raw size and gzip size, print formatted output
- Should be runnable as `tsx packages/build-tools/src/report-size.ts`
- Add as a `"size"` script in `packages/axe-core/package.json`

### 6. Implement vite-plugin-axe-aria
- **Task ID**: implement-aria-plugin
- **Depends On**: setup-vite-config
- **Assigned To**: builder-aria-plugin
- **Agent Type**: general-purpose
- **Parallel**: true (with task 3)
- Implement `packages/build-tools/src/vite-plugin-axe-aria.ts`
- Port logic from `build/tasks/aria-supported.js`:
  - Uses `aria-query` package to get roles and props
  - Compares against axe-core's internal `ariaRoles` and `ariaAttrs` from `axe.utils.getStandards()`
  - Generates `doc/aria-supported.md` with markdown tables
- This plugin runs as a `closeBundle` hook (needs the built axe.js to call `getStandards()`)
- Alternatively, refactor to read the ARIA data directly from `lib/standards/` instead of requiring the built bundle
- Reference file: `build/tasks/aria-supported.js`

### 7. Implement build-locales Script
- **Task ID**: implement-locale-build
- **Depends On**: setup-vite-config, implement-metadata-plugin
- **Assigned To**: builder-aria-plugin
- **Agent Type**: general-purpose
- **Parallel**: false
- Implement `packages/build-tools/src/build-locales.ts`
- Port and modernize logic from `build/tasks/add-locale.js` + the locale-specific configure logic:
  - Read all `packages/axe-core/locales/*.json` (19 files, excluding `_template.json`)
  - Validate each locale against Zod `LocaleSchema` from `@axe-core/schemas`
  - For each locale, build a locale-specific version: `axe.{locale}.js` and `axe.{locale}.min.js`
  - This can invoke `vite build` with locale-specific `define` config, or inject locale data via a plugin transform
- Also port the locale template generation (`add-locale:template`) that generates `locales/_template.json`
- Add as `"build:locales"` script in `packages/axe-core/package.json`
- Reference files: `build/tasks/add-locale.js`, `build/configure.js` (locale handling)

### 8. Verify Vite Build Artifacts
- **Task ID**: verify-build-artifacts
- **Depends On**: implement-metadata-plugin, implement-aria-plugin, implement-locale-build
- **Assigned To**: validator-artifacts
- **Agent Type**: general-purpose
- **Parallel**: false
- Build with both old Grunt pipeline and new Vite pipeline
- Diff the outputs: `axe.js`, `axe.min.js` — they won't be byte-identical (different bundler) but must be functionally equivalent
- Verify: `typeof axe.run === 'function'`, `typeof axe.configure === 'function'`, all public API methods exist
- Verify UMD output sets `window.axe` correctly in browser
- Verify ESM output (`axe.mjs`) can be imported
- Verify CJS output (`axe.cjs`) can be required
- Verify sourcemaps are present and valid
- Run the full test suite against the new build output
- Verify locale builds produce correct files

### 9. Install and Configure Oxlint
- **Task ID**: setup-oxlint
- **Depends On**: none
- **Assigned To**: builder-oxlint
- **Agent Type**: general-purpose
- **Parallel**: true (with tasks 1-7)
- Install `oxlint` (^1.0) in root `package.json` devDependencies
- Run `pnpm dlx @oxlint/migrate eslint.config.js > oxlint.json` to auto-convert ESLint config
- Manually review and adjust the generated `oxlint.json`:
  - Map axe-core specific rules (especially `no-restricted-syntax` for `node.tagName`, `node.attributes`, `node.contains`)
  - Map `no-restricted-imports` patterns for module boundary enforcement
  - Map `mocha-no-only` equivalent
  - Add TypeScript-specific rules per PRD Section 2.4
- Verify `oxlint .` produces equivalent or better results compared to `eslint`
- Update root `package.json` scripts: `"lint": "oxlint ."`, `"lint:fix": "oxlint --fix ."`
- Note: Some complex ESLint rules (particularly `no-restricted-syntax` with AST selectors and `no-restricted-imports` with regex patterns) may not have direct Oxlint equivalents. Document any gaps.

### 10. Install and Configure Oxfmt (Advisory)
- **Task ID**: setup-oxfmt
- **Depends On**: none
- **Assigned To**: builder-oxlint
- **Agent Type**: general-purpose
- **Parallel**: true (with task 9)
- Install `oxfmt` in root `package.json` devDependencies
- Create `oxfmt.json` at repo root matching current Prettier config:
  ```json
  {
    "printWidth": 80,
    "tabWidth": 2,
    "useTabs": false,
    "semi": true,
    "singleQuote": true,
    "trailingComma": "none",
    "bracketSpacing": true,
    "arrowParens": "avoid"
  }
  ```
- Verify `oxfmt --check .` produces zero-diff compared to current Prettier output
- Update root `package.json` scripts: `"format": "oxfmt --check ."`, `"format:fix": "oxfmt ."`
- Keep Prettier as the hard CI gate per PRD Section 2.5 decision
- Note: Oxfmt is advisory-only until it reaches beta

### 11. Remove Legacy Build Dependencies
- **Task ID**: remove-legacy-deps
- **Depends On**: verify-build-artifacts, setup-oxlint
- **Assigned To**: builder-cleanup
- **Agent Type**: general-purpose
- **Parallel**: false
- Remove `Gruntfile.js`
- Remove all Grunt-related devDependencies from `packages/axe-core/package.json`:
  - `grunt`, `grunt-babel`, `grunt-bytesize`, `grunt-contrib-clean`, `grunt-contrib-concat`, `grunt-contrib-uglify`, `grunt-contrib-watch`
- Remove Babel devDependencies: `@babel/core`, `@babel/plugin-proposal-object-rest-spread`, `@babel/preset-env`, `@babel/runtime-corejs3`
- Remove old esbuild: `esbuild` (was 0.27.3, replaced by Rolldown)
- Remove ESLint: `eslint`, `eslint-config-prettier`, `eslint-plugin-mocha-no-only`, `eslint.config.js`
- Evaluate whether to keep `prettier` (needed as CI hard gate until Oxfmt is beta)
- Remove `uglify-js` (replaced by Rolldown's Oxc minifier)
- Remove `revalidator` (replaced by Zod schemas)
- Remove `@deque/dot` if doT template compilation is replaced
- Remove other unused deps: `core-js`, `es6-promise`, `weakmap-polyfill` (IE-era polyfills)
- Update `packages/axe-core/package.json` scripts to use Vite commands
- Remove `build/tasks/` directory
- Remove `lib/intro.stub` and `lib/outro.stub`
- Keep `build/` directory contents that are still needed (e.g., `check-node-version.js`, `rule-generator`, `sri-update`)

### 12. Update Turborepo Configuration
- **Task ID**: update-turbo-config
- **Depends On**: remove-legacy-deps
- **Assigned To**: builder-cleanup
- **Agent Type**: general-purpose
- **Parallel**: false
- Update `turbo.json` per PRD Section 2.5 (from PRD-00):
  - `build`: `dependsOn: ["^build"]`, `outputs: ["dist/**"]`, `inputs: ["src/**", "lib/**", "tsconfig.json", "vite.config.ts"]`
  - `build:locales`: `dependsOn: ["build"]`, `outputs: ["dist/locales/**"]`, `inputs: ["locales/**"]`
  - `typecheck`: `dependsOn: ["^build"]`, `inputs: ["src/**", "lib/**", "tsconfig.json"]`
  - `test`: `dependsOn: ["^build"]`, `inputs: ["src/**", "lib/**", "test/**"]`
  - Remove references to `Gruntfile.js`, `build/**` from inputs
- Update root `package.json` scripts per PRD Section 2.6:
  - Add `build:locales`, `lint:fix`, `format:fix`, `typecheck` scripts
  - Update `validate` to run all checks
- Verify `pnpm build` works end-to-end through Turborepo

### 13. Final Validation
- **Task ID**: validate-all
- **Depends On**: update-turbo-config
- **Assigned To**: validator-artifacts
- **Agent Type**: general-purpose
- **Parallel**: false
- Run `pnpm build` — verify all artifacts are produced in `packages/axe-core/dist/`
- Run `pnpm test` — verify zero test regressions
- Run `pnpm lint` — verify Oxlint passes
- Run `pnpm format` — verify Oxfmt check passes (advisory)
- Run `pnpm typecheck` — verify TypeScript compilation
- Verify `Gruntfile.js` is deleted
- Verify all Grunt-related devDependencies are gone
- Verify distribution artifacts: `axe.js`, `axe.min.js`, `axe.mjs`, `axe.cjs`, `axe.d.ts`
- Verify locale builds work: `pnpm build:locales`
- Run `pnpm run size` to report bundle sizes
- Ensure the build works from a clean state (`pnpm clean && pnpm install && pnpm build`)

## Acceptance Criteria
- `pnpm build` produces `axe.js` (UMD), `axe.min.js` (UMD minified), `axe.mjs` (ESM), `axe.cjs` (CJS) in `packages/axe-core/dist/`
- `axe.js` UMD output sets `window.axe` correctly and all public API methods work
- `axe.mjs` ESM output can be imported with `import axe from 'axe-core'`
- `axe.cjs` CJS output can be required with `require('axe-core')`
- All locale builds (`axe.{locale}.js`, `axe.{locale}.min.js`) are produced correctly
- `doc/rule-descriptions.md` is generated correctly
- `doc/aria-supported.md` is generated correctly
- `locales/_template.json` is generated correctly
- All existing tests pass with zero regressions
- `Gruntfile.js` is deleted
- All Grunt-related devDependencies are removed (grunt, grunt-babel, grunt-bytesize, grunt-contrib-clean, grunt-contrib-concat, grunt-contrib-uglify, grunt-contrib-watch)
- Babel devDependencies are removed
- ESLint is replaced by Oxlint with equivalent rule coverage
- Oxfmt is configured as advisory, Prettier remains as CI gate
- `pnpm lint` completes in <1s
- Build produces sourcemaps for all outputs
- Turborepo caching works correctly for incremental builds

## Validation Commands
Execute these commands to validate the task is complete:

- `pnpm build` — Full build through Turborepo, verify exit code 0
- `pnpm test` — All tests pass
- `pnpm lint` — Oxlint passes
- `pnpm format` — Oxfmt check passes (advisory)
- `pnpm typecheck` — TypeScript compilation succeeds
- `node -e "const axe = require('./packages/axe-core/dist/axe.cjs'); console.log(typeof axe.run)"` — CJS import works
- `node --input-type=module -e "import axe from './packages/axe-core/dist/axe.mjs'; console.log(typeof axe.run)"` — ESM import works
- `ls packages/axe-core/dist/axe.js packages/axe-core/dist/axe.min.js packages/axe-core/dist/axe.mjs packages/axe-core/dist/axe.cjs` — All artifacts exist
- `test ! -f packages/axe-core/Gruntfile.js` — Gruntfile removed
- `! grep -q '"grunt"' packages/axe-core/package.json` — No Grunt in dependencies
- `pnpm run --filter axe-core size` — Report bundle size

## Notes
- **Vite 8 vs rolldown-vite:** Start with `rolldown-vite` (Vite 7 + Rolldown) per PRD-00 Section 4.1. Upgrade to Vite 8 when stable is tagged on npm. This is a one-line dependency swap.
- **doT template compilation:** The current build compiles doT templates (`{{...}}`) in check messages to JavaScript functions at build time. This is used for dynamic messages like `"Abstract role cannot be directly used: ${data.values}"`. The metadata plugin must preserve this behavior.
- **`axe._load()` pattern:** The current build generates a runtime call `axe._load({data, rules, checks})` that injects configuration into the engine. The new approach should generate this as a TypeScript module import instead, which the Audit constructor consumes directly.
- **`axe.source` property:** For Node.js consumers, `axe.source` contains the stringified UMD bundle so it can be injected into browser pages. This must be preserved in the new build.
- **ESLint rule gaps:** Oxlint may not support all of axe-core's custom `no-restricted-syntax` AST selectors and `no-restricted-imports` regex patterns. These enforce important module boundaries (e.g., commons can't import from checks/rules). Document any gaps and consider keeping ESLint for those specific checks or finding alternative enforcement.
- **IE polyfills:** `core-js`, `es6-promise`, `weakmap-polyfill` are IE-era polyfills that should be safe to remove given the Node 20 / ES2022 target.
- **Incremental approach:** If the entry point refactoring proves too complex (due to the `declare const axe` pattern used throughout `lib/core/`), an intermediate approach is to have the Vite plugin generate a compatibility shim that creates the `axe` global before other modules execute.
