# Phase 2: Build System Modernization

**PRD Version:** 2.0
**Date:** February 16, 2026
**Status:** Draft
**Phase Duration:** 6–8 weeks
**Dependencies:** Phase 1 (partial — TypeScript config, initial `.ts` conversion, `@axe-core/schemas` published)
**Team:** 2 engineers

---

## 1. Overview

### 1.1 Executive Summary

axe-core's build pipeline is a Grunt orchestration of seven discrete tools: `clean` → `validate` → `metadata-function-map` → `esbuild` → `configure` → `babel` → `concat` → `uglify` → `aria-supported` → `add-locale` → `prettier` → `bytesize`. This pipeline was designed when the library was pure JavaScript with no module system, and files were literally concatenated into a single output.

This phase replaces the entire pipeline with Vite 8 (powered by Rolldown), which provides a unified bundler for both development and production. Code quality tooling migrates from ESLint + Prettier to Oxlint + Oxfmt, achieving 50–100× faster linting and 30× faster formatting. Custom Grunt tasks are rewritten as Vite plugins in the `packages/build-tools/` workspace package.

**Critical caveat:** As of February 2026, Vite 8 is in beta. This PRD includes a contingency path using Vite 7 + the `rolldown-vite` package. The migration to Vite 8 stable is a one-line dependency swap (see PRD-00, Section 4.1).

### 1.2 Objectives

- Replace Grunt with Vite 8 (or Vite 7 + `rolldown-vite`) as the sole build orchestrator
- Replace esbuild (0.10.x) + Babel + UglifyJS with Rolldown for bundling, transforming, and minifying
- Replace ESLint with Oxlint (stable 1.0, 665+ rules)
- Replace Prettier with Oxfmt (alpha, 100% Prettier conformance — advisory-only until beta)
- Migrate all custom Grunt tasks to Vite plugins in `packages/build-tools/`
- Produce the same distribution artifacts: `axe.js`, `axe.min.js`, `axe.{locale}.js`, `axe.{locale}.min.js`
- Achieve <8s full build time (from current ~30–45s)
- Wire all tasks through Turborepo for caching and dependency-aware ordering

### 1.3 Success Criteria

- `pnpm build` (via `turbo run build`) produces identical output artifacts (verified by diff against current build)
- Full build completes in <8s on CI (GitHub Actions, ubuntu-latest)
- `pnpm lint` completes in <1s
- `pnpm format` completes in <0.5s
- All localized builds (`build:locales`) complete in <15s
- Zero regressions in test suites
- `Gruntfile.js` is deleted
- All Grunt-related devDependencies are removed

---

## 2. Technical Specification

### 2.1 Vite Configuration

```typescript
// packages/axe-core/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { axeMetadataPlugin } from '@axe-core/build-tools/vite-plugin-axe-metadata';
import { axeLocalePlugin } from '@axe-core/build-tools/vite-plugin-axe-locale';
import { axeAriaPlugin } from '@axe-core/build-tools/vite-plugin-axe-aria';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/index.ts'),
      name: 'axe',
      formats: ['umd', 'es', 'cjs'],
      fileName: (format) => {
        if (format === 'umd') return 'axe.js';
        if (format === 'es') return 'axe.mjs';
        return 'axe.cjs';
      },
    },
    rolldownOptions: {
      output: {
        globals: {},
        banner: `/*! axe v${process.env.npm_package_version}\n * Copyright (c) ${new Date().getFullYear()} Deque Systems, Inc.\n * MPL-2.0 license */`,
      },
    },
    minify: true, // Rolldown uses Oxc minifier (replaces UglifyJS)
    sourcemap: true,
    target: 'es2022', // Aligns with Baseline Widely Available
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __AXE_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    axeMetadataPlugin(),  // Replaces grunt metadata-function-map + configure
    axeLocalePlugin(),    // Replaces grunt add-locale
    axeAriaPlugin(),      // Replaces grunt aria-supported
  ],
});
```

### 2.2 Custom Grunt Task Migration → `packages/build-tools/`

The bespoke Grunt tasks are rewritten as Vite plugins and Node scripts in the internal `packages/build-tools/` workspace package. This package is marked `"private": true` — it is not published to npm.

```
packages/build-tools/
├── src/
│   ├── vite-plugin-axe-metadata.ts   # Replaces metadata-function-map + configure
│   ├── vite-plugin-axe-locale.ts     # Replaces add-locale
│   ├── vite-plugin-axe-aria.ts       # Replaces aria-supported
│   └── report-size.ts                # Replaces bytesize
├── tsconfig.json
└── package.json
```

**`packages/build-tools/package.json`:**
```jsonc
{
  "name": "@axe-core/build-tools",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./vite-plugin-axe-metadata": "./src/vite-plugin-axe-metadata.ts",
    "./vite-plugin-axe-locale": "./src/vite-plugin-axe-locale.ts",
    "./vite-plugin-axe-aria": "./src/vite-plugin-axe-aria.ts",
    "./report-size": "./src/report-size.ts"
  },
  "dependencies": {
    "@axe-core/schemas": "workspace:*",
    "glob": "^11.0"
  },
  "devDependencies": {
    "vite": "^8.0.0"
  }
}
```

#### 2.2.1 `metadata-function-map` → Vite Plugin

**Current behavior:** Scans rule/check JSON definitions and generates a mapping from rule IDs to their check functions. This is used at runtime to wire rules to checks.

**Migration:** Becomes a Vite plugin that runs as a `buildStart` hook. Reads the typed rule/check definitions (from Phase 1) and generates a `metadata-function-map.ts` module that is imported by the Audit.

```typescript
// packages/build-tools/src/vite-plugin-axe-metadata.ts
import type { Plugin } from 'vite';
import { glob } from 'glob';

export function axeMetadataPlugin(): Plugin {
  return {
    name: 'axe-metadata',
    async buildStart() {
      // Scan packages/axe-core/lib/rules/ and lib/checks/ for definitions
      // Generate packages/axe-core/lib/core/generated/metadata-function-map.ts
      // This file is .gitignored and regenerated on each build
    },
  };
}
```

#### 2.2.2 `configure` → Build-time Code Generation

**Current behavior:** Injects the rule/check configuration object into the axe source via string replacement in the concatenated output.

**Migration:** The configuration is generated as a TypeScript module (`lib/core/generated/default-config.ts`) during build. The Audit imports it directly. No string replacement needed.

#### 2.2.3 `aria-supported` → Generated Module

**Current behavior:** Reads ARIA spec data and generates documentation and runtime lookup tables.

**Migration:** The ARIA spec data is already typed in Phase 1. The `aria-supported` task becomes a Vite plugin that produces `lib/standards/generated/aria-supported.ts`. It imports and validates against Zod schemas from `@axe-core/schemas`.

#### 2.2.4 `add-locale` → Locale Build Script

**Current behavior:** Reads locale JSON files and produces per-locale builds (`axe.de.js`, `axe.fr.js`, etc.).

**Migration:** Becomes a Vite plugin or Node.js script in `packages/build-tools/` that:
1. Reads `packages/axe-core/locales/*.json`
2. Validates each locale against the Zod `LocaleSchema` (from `@axe-core/schemas`)
3. For each locale, invokes `vite build` with the locale injected via `define`
4. Outputs `axe.{locale}.js` and `axe.{locale}.min.js`

#### 2.2.5 `concat:engine` → Eliminated

Rolldown handles this natively via the entry point + module graph. The `lib/index.ts` entry point imports everything needed. File concatenation is replaced by proper module bundling.

#### 2.2.6 `babel` → Eliminated

Rolldown uses Oxc for transformation. The `build.target: 'es2022'` setting handles any necessary downleveling. Since we're dropping IE/legacy browser support (see Phase 3), minimal transformation is needed.

#### 2.2.7 `uglify` → Eliminated

Rolldown uses the Oxc minifier, which is built into Vite 8. Set `build.minify: true`.

#### 2.2.8 `prettier` (build step) → Eliminated

The unminified `axe.js` output from Rolldown is already readable. If exact formatting is desired, a post-build `oxfmt` pass can be added, but this is likely unnecessary.

#### 2.2.9 `bytesize` → Node Script

```typescript
// packages/build-tools/src/report-size.ts
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const file = readFileSync('packages/axe-core/dist/axe.min.js');
const gzipped = gzipSync(file);
console.log(`axe.min.js: ${(file.length / 1024).toFixed(1)}KB (${(gzipped.length / 1024).toFixed(1)}KB gzipped)`);
```

### 2.3 Package Scripts

The root `package.json` scripts (defined in PRD-00, Section 2.6) delegate to Turborepo. The `packages/axe-core/package.json` defines the actual build commands:

```jsonc
// packages/axe-core/package.json
{
  "name": "axe-core",
  "scripts": {
    "build": "vite build",
    "build:locales": "tsx ../build-tools/src/build-locales.ts",
    "dev": "vite build --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --project unit",
    "test:browser": "vitest run --project browser",
    "size": "tsx ../build-tools/src/report-size.ts"
  },
  "dependencies": {
    "@axe-core/schemas": "workspace:*"
  },
  "devDependencies": {
    "@axe-core/build-tools": "workspace:*",
    "vite": "^8.0.0",
    "vitest": "^4.0",
    "typescript": "^5.7",
    "zod": "^3.24"
  }
}
```

Developers run everything from the **repo root** via PNPM + Turborepo:

```bash
pnpm build          # turbo run build (all packages, cached)
pnpm test           # turbo run test (all packages, cached)
pnpm lint           # oxlint . (root-level, no turbo needed)
pnpm format         # oxfmt --check . (root-level)
pnpm typecheck      # turbo run typecheck (all packages)
pnpm validate       # turbo run typecheck lint format:check test
```

### 2.4 Oxlint Configuration

```jsonc
// oxlint.json (repo root — shared across all packages)
{
  "rules": {
    // Correctness rules (enabled by default in Oxlint)
    // All default correctness rules are active

    // Additional rules migrated from current ESLint config
    "no-console": "warn",
    "no-debugger": "error",
    "no-unused-vars": "error",
    "prefer-const": "error",

    // TypeScript-specific
    "typescript/no-explicit-any": "warn",
    "typescript/no-non-null-assertion": "warn",
    "typescript/consistent-type-imports": "error",

    // Import analysis (multi-file, Oxlint-native)
    "import/no-cycle": "error",
    "import/no-self-import": "error"
  },
  "ignorePatterns": [
    "dist/",
    "node_modules/",
    "**/generated/"
  ]
}
```

**Migration from ESLint:** Use `@oxlint/migrate` to auto-convert the existing `.eslintrc` / `eslint.config.js`:

```bash
pnpm dlx @oxlint/migrate eslint.config.js > oxlint.json
```

### 2.5 Oxfmt Configuration

```jsonc
// oxfmt.json (repo root — shared across all packages)
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

These settings match axe-core's current Prettier configuration, ensuring a zero-diff migration.

**Fallback strategy (resolved from PRD-00, Section 4.2):** Oxfmt is advisory-only in CI until it reaches beta. Prettier remains the hard gate:

```yaml
# .github/workflows/lint.yml
- name: Format check (Oxfmt — advisory)
  run: pnpm format
  continue-on-error: true

- name: Format check (Prettier — hard gate)
  run: pnpm prettier --check .
```

### 2.6 Distribution Artifacts

The build must produce the same set of artifacts consumers expect:

| Artifact | Format | Description |
|---|---|---|
| `axe.js` | UMD (unminified) | For script tag inclusion |
| `axe.min.js` | UMD (minified + sourcemap) | Production script tag |
| `axe.mjs` | ESM | For `import` consumers |
| `axe.cjs` | CJS | For `require()` consumers |
| `axe.d.ts` | Declaration | TypeScript types (from Phase 1) |
| `axe.{locale}.js` | UMD (unminified) | Per-locale builds |
| `axe.{locale}.min.js` | UMD (minified) | Per-locale production builds |

The `packages/axe-core/package.json` exports map:

```jsonc
{
  "main": "./dist/axe.cjs",
  "module": "./dist/axe.mjs",
  "types": "./dist/axe.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/axe.d.ts", "default": "./dist/axe.mjs" },
      "require": { "types": "./dist/axe.d.ts", "default": "./dist/axe.cjs" }
    },
    "./locales/*": "./locales/*.json"
  },
  "files": ["dist/", "locales/", "LICENSE", "README.md"]
}
```

**Note:** Additional exports for tree-shakeable bundles (`./bundles/wcag2aa`, etc.) are added in Phase 4.

---

## 3. Migration Plan

### Sprint 1: Foundation (Weeks 1–2)
- Scaffold `packages/build-tools/` with plugin stubs and `package.json`
- Install Vite 8 (or `rolldown-vite` — see PRD-00 Section 4.1) in `packages/axe-core/`
- Create `packages/axe-core/vite.config.ts` with library mode
- Verify basic `vite build` produces a working `axe.js` from `lib/index.ts`
- Install and configure Oxlint at repo root, run `@oxlint/migrate` on existing ESLint config
- Install and configure Oxfmt at repo root, verify zero-diff with current Prettier output
- Set up parallel CI: old Grunt build + new Vite build, diff the outputs

### Sprint 2: Custom Task Migration (Weeks 3–4)
- Implement `vite-plugin-axe-metadata` in `packages/build-tools/` (replaces `metadata-function-map` + `configure`)
- Implement `vite-plugin-axe-aria` (replaces `aria-supported`)
- Implement locale build script (replaces `add-locale`)
- Implement `report-size.ts` (replaces `bytesize`)
- Verify all artifacts match the Grunt output

### Sprint 3: Cleanup & Optimization (Weeks 5–6)
- Remove `Gruntfile.js` and all `grunt-*` devDependencies
- Remove Babel configuration and `babel-*` devDependencies
- Remove `eslint`, `eslint-config-prettier`, `eslint-plugin-mocha-no-only`
- Remove `prettier` (or keep as fallback if Oxfmt is still alpha)
- Update CI workflows to use `pnpm` + `turbo run` commands
- Update `CONTRIBUTING.md` with new build and PNPM instructions
- Performance benchmarking: measure and document build times

### Sprint 4: Hardening (Weeks 7–8) — if needed
- Address edge cases in locale builds
- Ensure sourcemaps are correct end-to-end
- Validate that downstream integrations (axe-playwright, axe-puppeteer, @axe-core/react, etc.) work with new artifacts
- Cut a release candidate for community testing

---

## 4. Dependency Changes

### DevDependencies Removed (from `packages/axe-core/`)

```diff
- "esbuild": "^0.10.x"
- "eslint": "^9.2.0"
- "eslint-config-prettier": "^10.0.1"
- "eslint-plugin-mocha-no-only": "^1.2.0"
- "grunt": "^1.5.3"
- "grunt-babel": "^8.0.0"
- "grunt-bytesize": "^0.2.0"
- "grunt-contrib-clean": "^2.0.1"
- "grunt-contrib-concat": "^2.1.0"
- "grunt-contrib-uglify": "^5.2.2"
- "grunt-contrib-watch": "^1.1.0"
- "prettier": "^3.x"
```

### DevDependencies Added

```diff
# Root package.json
+ "turbo": "^2.4"
+ "oxlint": "^1.0"
+ "oxfmt": "^0.x"
+ "typescript": "^5.7"

# packages/axe-core/package.json
+ "vite": "^8.0.0"        # or "rolldown-vite": "^7.x" as contingency
+ "@axe-core/build-tools": "workspace:*"
```

**Net dependency reduction:** ~15 packages removed, ~6 added (including workspace refs).

---

## 5. Technical Considerations

### 5.1 Vite 8 Beta Risk Mitigation

Resolved — see PRD-00 Section 4.1. Start with `rolldown-vite`, upgrade to Vite 8 stable when tagged. The Vite config is identical between both; only the import source changes. Expected migration delta: <1 hour.

### 5.2 Rolldown Plugin Compatibility

axe-core does not use any Rollup plugins directly (the current build uses Grunt, not Rollup). The custom Vite plugins in `packages/build-tools/` target the Vite plugin API, which Rolldown supports. No compatibility concerns.

### 5.3 UMD Output

Vite 8 / Rolldown supports UMD output via `build.lib.formats: ['umd']`. The `name: 'axe'` option ensures the global `window.axe` is set correctly for script-tag consumers.

### 5.4 Tree-Shaking for ESM Consumers

The ESM output (`axe.mjs`) will be tree-shakeable. Consumers who only use `axe.run()` and don't need the full rule set can potentially benefit from reduced bundle sizes. This is a new capability not possible with the current concatenated build. Full tree-shakeable bundles are exposed in Phase 4.

### 5.5 Turborepo Caching for Build Tasks

The `turbo.json` config (PRD-00 Section 2.5) defines `build` with `"dependsOn": ["^build"]`. This means:
- `@axe-core/schemas` builds first (it has no internal dependencies)
- `@axe-core/build-tools` builds next (depends on schemas)
- `axe-core` builds last (depends on both)

On subsequent runs, if schemas and build-tools haven't changed, Turborepo serves them from cache (0.2s) and only rebuilds axe-core. This is a major CI speedup for PRs that only touch rules.

---

## 6. Open Questions

1. **ESM-first or UMD-first**: Should the primary entry point in `package.json#main` switch to ESM? Most modern consumers use `import`, but some legacy integrations may still `require()`. **Recommendation:** Keep CJS as `main` for backward compat, ESM as `module`, and use the `exports` map for proper dual-package resolution. This is the standard pattern used by Vite, Vitest, and most modern libraries.
