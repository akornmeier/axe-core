# axe-core Platform Modernization — Master Plan

> Historical roadmap. Active execution is governed by [The next accessibility engine](streamlined-modernization-plan.html), with [reconciled repository state](modernization-reconciliation.md). Preserve this PRD as context; its original statuses, estimates and constraints are not current verification or a parallel execution queue.

**Version:** 2.0
**Date:** February 16, 2026
**Status:** Draft — For Internal Review
**Authors:** axe-core Core Team

---

## 1. Executive Summary

axe-core is the most widely adopted accessibility testing engine on the web, powering Google Lighthouse, Microsoft Accessibility Insights, and thousands of CI/CD pipelines. Its current build and test infrastructure — rooted in Grunt, Babel, Karma, npm, and vanilla JavaScript — served us well for nearly a decade, but is now a competitive liability.

This proposal modernizes the entire platform across four phased workstreams, each designed to be independently shippable while building toward a unified, high-performance, type-safe codebase. The target stack aligns with the VoidZero/Vite ecosystem, which has become the center of gravity for JavaScript tooling in 2025–2026.

### What We're Replacing

| Layer | Current (Legacy) | Target (Modern) |
|---|---|---|
| **Package Manager** | npm | **PNPM** (content-addressable storage, strict deps) |
| **Repo Structure** | Single flat repo | **PNPM workspace monorepo** + Turborepo task runner |
| **Type System** | JSDoc annotations, hand-written `.d.ts` | TypeScript strict mode + Zod runtime schemas |
| **Build** | Grunt → esbuild (0.10.x) → Babel → concat → UglifyJS | Vite 8 + Rolldown (single unified bundler) |
| **Linting** | ESLint 9 + eslint-config-prettier | OxLint (50–100× faster, 665+ built-in rules) |
| **Formatting** | Prettier | Oxfmt (30× faster, 100% Prettier-compatible) |
| **Unit Tests** | Mocha + Chai + Sinon (Node) | Vitest 4 (Jest-compatible API, native ESM) |
| **Browser Tests** | Karma + karma-chrome/firefox-launcher | Vitest Browser Mode + Playwright provider |
| **Polyfills** | Various (incl. IE-era) | None — target Baseline Widely Available 2024 |

### Why Now

1. **Grunt is effectively unmaintained.** The ecosystem has moved on. Finding contributors who understand Grunt is increasingly difficult.
2. **The VoidZero unified toolchain has matured.** Vite 8 (Rolldown), Oxlint 1.0, Vitest 4.0 (stable Browser Mode) — the pieces are all production-ready or near-final beta.
3. **Type safety is no longer optional.** Our consumers — framework integrations, DevTools extensions, CI wrappers — all demand reliable types. Zod schemas give us runtime validation *and* static types from a single source of truth.
4. **Karma is dead weight.** IE support was dropped years ago. The Karma launchers, Mocha adapter, and Sinon stubs add complexity with no return.
5. **Build times matter for contributor experience.** Rolldown's Rust-based bundler delivers 5–10× faster builds than esbuild + Rollup. For a project that relies on open-source contributors, fast feedback loops are critical.
6. **npm is no longer the best default.** PNPM's content-addressable storage cuts install times dramatically, strict dependency resolution prevents phantom dependencies, and it is the de facto standard for performance-sensitive JS/TS projects.

---

## 2. Architectural Decision: Monorepo Structure

### 2.1 Decision: Internal PNPM Workspace Monorepo — Yes

axe-core will become a **lightweight internal monorepo** using PNPM workspaces with Turborepo as the task runner. This is scoped to the `axe-core` repo only — 3 internal packages, not a sprawling ecosystem.

**Why a monorepo makes sense now (it didn't before):**

- Phase 1 creates Zod schemas with genuine standalone value. Integration packages in `axe-core-npm` can depend on `@axe-core/schemas` to validate configurations and results *without importing the entire engine*. Third-party tools can validate axe results structurally.
- Phase 2 creates Vite build plugins (metadata generation, locale building, ARIA compilation) that are cleaner as an isolated internal package.
- Phase 4's tree-shakeable bundles (wcag2a, wcag2aa, best-practices) are Vite entry points, not separate packages — they stay within the main `axe-core` package.
- Shared tooling config (TypeScript, Oxlint, Oxfmt, Vitest) is defined once at the root and extended per-package.

### 2.2 Decision: Merge with `axe-core-npm` — No

The `dequelabs/axe-core-npm` repo — which already contains @axe-core/cli, @axe-core/playwright, @axe-core/puppeteer, @axe-core/webdriverjs, @axe-core/webdriverio, @axe-core/react, @axe-core/reporter-earl — remains a **separate repository**.

**Why not merge:**

- **Different release cadences.** axe-core is foundational — its releases are high-ceremony (zero false-positive guarantee, spec compliance audits). Integration packages are lighter-weight and can ship faster.
- **CI blast radius.** A flaky Playwright browser test in @axe-core/playwright should not block a rule fix in axe-core.
- **Contributor cognitive load.** axe-core has 100+ contributors, most submitting rule fixes. They should not need to navigate Puppeteer/WebDriverIO/React package structure.
- **It already works.** The `axe-core-npm` monorepo is functional. Don't introduce migration risk for marginal coordination gains.

**How we bridge the gap:** CI on `axe-core` publishes a canary build (`axe-core@canary`) on every merge to `develop`. The `axe-core-npm` repo runs nightly integration tests against `axe-core@canary`. This catches compatibility issues early without coupling the repos.

### 2.3 Proposed Repository Structure

```
axe-core/
├── pnpm-workspace.yaml
├── turbo.json
├── .npmrc
├── tsconfig.base.json          # Shared TypeScript config (extended by packages)
├── oxlint.json                 # Shared lint config (Oxlint at root)
├── oxfmt.json                  # Shared format config (Oxfmt at root)
│
├── packages/
│   ├── axe-core/               # The main engine — published as `axe-core` on npm
│   │   ├── lib/
│   │   │   ├── core/           # Engine (Audit, Rule, Check, VTree, run/configure)
│   │   │   ├── rules/          # All rule definitions (typed TS modules)
│   │   │   ├── checks/         # All check evaluators (typed TS modules)
│   │   │   ├── commons/        # Shared utilities (DOM, text, color, math)
│   │   │   ├── standards/      # ARIA specs, HTML element data
│   │   │   └── bundles/        # Tree-shakeable entry points (wcag2a, wcag2aa, etc.)
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── browser/
│   │   │   └── integration/
│   │   ├── locales/            # Translation JSON files
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json       # Extends ../../tsconfig.base.json
│   │   └── package.json
│   │
│   ├── schemas/                # Zod schemas — published as `@axe-core/schemas`
│   │   ├── src/
│   │   │   ├── index.ts        # Public barrel export
│   │   │   ├── config.schema.ts
│   │   │   ├── options.schema.ts
│   │   │   ├── results.schema.ts
│   │   │   ├── context.schema.ts
│   │   │   ├── rule-definition.schema.ts
│   │   │   ├── check-definition.schema.ts
│   │   │   ├── aria.schema.ts
│   │   │   └── locale.schema.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── build-tools/            # Internal only (not published)
│       ├── src/
│       │   ├── vite-plugin-axe-metadata.ts
│       │   ├── vite-plugin-axe-locale.ts
│       │   ├── vite-plugin-axe-aria.ts
│       │   └── report-size.ts
│       ├── tsconfig.json
│       └── package.json        # "private": true
│
└── package.json                # Root — workspace scripts, shared devDependencies
```

### 2.4 PNPM Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```ini
# .npmrc
strict-peer-dependencies=true
auto-install-peers=true
shamefully-hoist=false
node-linker=isolated
engine-strict=true
```

**Why PNPM over npm/Yarn:**

- **Content-addressable storage.** Packages are stored once on disk globally and hard-linked into projects. In a monorepo with shared dependencies (TypeScript, Vitest, Vite), this eliminates massive duplication. Install times drop from ~25–35s (npm) to <10s (warm cache: <2s).
- **Strict dependency isolation.** Unlike npm's flat `node_modules`, PNPM creates a properly nested structure. If `axe-core` doesn't declare `zod` in its own `package.json`, it can't accidentally import it. This catches phantom dependencies immediately — critical for a library consumed by millions of projects.
- **`workspace:*` protocol.** Internal packages reference each other via `"@axe-core/schemas": "workspace:*"`, which PNPM resolves to the local copy during development and replaces with the real version number on publish. No `npm link` gymnastics.
- **`pnpm publish --filter` for selective publishing.** Only the packages that changed get published. Root and `build-tools` (marked `"private": true`) are automatically excluded.
- **`packageManager` field enforcement.** Setting `"packageManager": "pnpm@9.15.4"` in root `package.json` + Corepack ensures every contributor uses the exact same version. No "works on my machine" from npm vs. PNPM behavioral differences.

### 2.5 Turborepo Configuration

```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "inputs": ["src/**", "lib/**", "tsconfig.json", "vite.config.ts"]
    },
    "build:locales": {
      "dependsOn": ["build"],
      "outputs": ["dist/locales/**"],
      "inputs": ["locales/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "lib/**", "tsconfig.json"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "lib/**", "test/**"]
    },
    "test:browser": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "lib/**", "test/**"],
      "cache": false
    },
    "lint": {
      "inputs": ["src/**", "lib/**", "test/**"]
    },
    "format:check": {
      "inputs": ["src/**", "lib/**", "test/**"]
    }
  }
}
```

**Why Turborepo (and not Nx, or PNPM alone):**

- **Task caching provides real CI speedups.** Industry reports (Nhost, Linear) show 30s → 0.2s for cached tasks. For axe-core PRs that only touch rules, the schemas and build-tools packages are instant cache hits.
- **Dependency-aware task ordering.** `"dependsOn": ["^build"]` means `axe-core` won't build until `schemas` and `build-tools` have finished. PNPM's `--recursive` doesn't understand task dependency graphs.
- **Nx is overkill for 3 packages.** Nx's project graph, generators, executors, and cloud caching are designed for 50+ package monorepos. For our scale, it's unnecessary complexity and a steeper contributor learning curve.
- **PNPM alone lacks caching.** `pnpm --filter` and `--recursive` handle basic parallel execution, but they don't cache task outputs or skip unchanged packages. For a CI workflow that runs on every PR, caching saves minutes.
- **Turborepo is agnostic and removable.** It wraps your existing `package.json` scripts — no lock-in. When VoidZero ships Vite+ (with `vite run`, a built-in task runner with intelligent caching), migration is trivial: delete `turbo.json`, replace `turbo run X` with `vite run X` in root scripts.

### 2.6 Root Package Configuration

```jsonc
// package.json (root)
{
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "turbo run build",
    "build:locales": "turbo run build:locales",
    "test": "turbo run test",
    "test:browser": "turbo run test:browser",
    "test:all": "turbo run test test:browser",
    "lint": "oxlint .",
    "lint:fix": "oxlint --fix .",
    "format": "oxfmt --check .",
    "format:fix": "oxfmt .",
    "typecheck": "turbo run typecheck",
    "validate": "turbo run typecheck lint format:check test",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2.4",
    "oxlint": "^1.0",
    "oxfmt": "^0.x",
    "typescript": "^5.7",
    "husky": "^9.0",
    "lint-staged": "^16.0"
  }
}
```

### 2.7 Phase 0 — Monorepo Scaffolding (Pre-requisite)

> **Status: Complete** — See [`specs/phase-00-monorepo-scaffolding.md`](phase-00-monorepo-scaffolding.md) for the full implementation plan and report.

The monorepo restructuring (moving code into `packages/`) should happen as a **dedicated Phase 0 prep step** — a single PR that moves files without changing any code. This isolates the structural change from functional changes, keeping `git blame` and `git bisect` useful.

**Phase 0 deliverables:**
1. Initialize PNPM workspace (`pnpm-workspace.yaml`, `.npmrc`, root `package.json`)
2. Move existing code into `packages/axe-core/`
3. Create empty `packages/schemas/` and `packages/build-tools/` with `package.json` stubs
4. Add `turbo.json` with existing build/test/lint tasks pointing to current Grunt commands
5. Update CI (GitHub Actions) to use `pnpm` instead of `npm`
6. Update `CONTRIBUTING.md` with PNPM install instructions
7. Verify all existing tests pass with zero changes to source code

**Estimated duration:** 1–2 days for the PR, 1 week for team review and CI stabilization.

---

## 3. Phased Approach

Each phase is designed to be independently mergeable and releasable. Phases can overlap but have strict dependency ordering where noted.

| Phase | Title | Duration | Dependencies |
|---|---|---|---|
| **Phase 0** | Monorepo Scaffolding (PNPM + Turborepo) | 1 week | None |
| **Phase 1** | Type System Modernization | 8–10 weeks | Phase 0 |
| **Phase 2** | Build System Modernization | 6–8 weeks | Phase 1 (partial — schemas package exists) |
| **Phase 3** | Test Infrastructure Modernization | 6–8 weeks | Phase 2 (partial — Vite config exists) |
| **Phase 4** | Rules & Checks Optimization | 4–6 weeks | Phases 1–3 complete |

**Total estimated duration:** 25–33 weeks (~6–8 months), assuming 2–3 engineers working in parallel.

---

## 4. Resolved Decisions (Previously Open Questions)

### 4.1 Vite 8 vs. `rolldown-vite`

**Decision: Start with `rolldown-vite` (Vite 7 + Rolldown), upgrade to Vite 8 when stable.**

Vite 8 is in beta as of February 2026 with multiple beta builds shipping. However, axe-core's zero-false-positive guarantee means we can't afford bundler bugs in production. `rolldown-vite` provides the same Rolldown performance benefits with Vite 7's stable foundation. The migration from `rolldown-vite` to Vite 8 stable is a one-line dependency swap — less than 1 hour of work.

**Trigger to upgrade:** When Vite 8.0.0 stable is tagged on npm (no `-beta` or `-rc` suffix).

### 4.2 Oxfmt Beta Timeline

**Decision: Advisory-only in CI, Prettier as hard gate, until Oxfmt reaches beta.**

Oxfmt reached 100% Prettier conformance in January 2026, but is still labeled alpha. For a project of axe-core's visibility, we need the formatter to be at least beta-quality before making it the CI gate.

```yaml
# CI workflow (Phase 2 interim state)
- name: Format check (Oxfmt — advisory)
  run: pnpm format
  continue-on-error: true

- name: Format check (Prettier — hard gate)
  run: pnpm prettier --check .
```

**Trigger to switch:** When Oxfmt publishes a version with `beta` or `1.0` designation. At that point, remove Prettier from devDependencies and make Oxfmt the sole gate.

### 4.3 TypeScript Migration Strategy

**Decision: Incremental with `allowJs: true`, bottom-up conversion.**

Big-bang TypeScript conversions of large codebases have a well-documented failure mode: they take months, create merge conflicts with feature work, and demoralize the team. The incremental approach lets us ship partial progress and maintain a green CI throughout.

`tsconfig.json` starts with `allowJs: true` and `strict: true`. Files are converted bottom-up: utilities → commons → core engine → rules/checks. The `allowJs` flag is removed only when 100% of files are `.ts`. See Phase 1 PRD (Section 2.4) for the detailed sprint plan.

### 4.4 JSDOM Compatibility

**Decision: Formally deprecate with runtime warning in v4. Remove in v5.**

axe-core has "limited JSDOM support" today, with `color-contrast` already known-broken. Vitest Browser Mode (Phase 3) provides real-browser testing that is strictly superior for both accuracy and DX. Continuing to maintain JSDOM compatibility diverts effort from real-browser correctness.

```typescript
// lib/core/utils/environment-warning.ts
export function warnIfSimulatedBrowser(): void {
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('jsdom') ||
     navigator.userAgent.includes('HappyDOM'))
  ) {
    console.warn(
      '[axe-core] Running in a simulated browser environment (JSDOM/HappyDOM). ' +
      'Results may be inaccurate — checks like color-contrast require real browser ' +
      'rendering. For reliable results, use Vitest Browser Mode with Playwright ' +
      'or run axe in a real browser. Simulated environment support is deprecated ' +
      'and will be removed in axe-core v5.'
    );
  }
}
```

### 4.5 Minimum Node.js Version

**Decision: Node 20 LTS.**

- Node 18 reached End-of-Life in April 2025. It is already unsupported upstream.
- Vitest 4 requires Node 20+.
- Node 20 provides stable native ESM without `--experimental-vm-modules`.
- PNPM 9 defaults to Node 20+ behaviors.
- Every major framework (Angular 21, React 19, Vue 3.5) targets Node 20+.

Enforced via root `package.json` (`"engines": { "node": ">=20.0.0" }`) and `.npmrc` (`engine-strict=true`).

---

## 5. Risk Assessment

### High Confidence (Low Risk)
- **PNPM adoption**: Mature, widely used, proven in monorepos of all scales. PNPM 9 is stable and battle-tested.
- **Turborepo adoption**: Lightweight, agnostic, works with any package manager. Easy to remove if Vite+ replaces it.
- **Oxlint adoption**: Stable since June 2025, used by Preact, Shopify, ByteDance. Drop-in migration path exists via `@oxlint/migrate`.
- **Vitest 4 adoption**: Stable, Angular 21 adopted it as default. Jest-compatible API means low migration friction.
- **Zod adoption**: Mature library, widely used, no ecosystem concerns.

### Medium Confidence (Moderate Risk)
- **Rolldown (via `rolldown-vite`)**: Validated by Linear (46s→6s), SvelteKit, Storybook. Using via Vite 7 (stable) reduces risk vs. Vite 8 beta directly.
- **Oxfmt**: Alpha quality, but 100% Prettier conformance demonstrated. Mitigated by Prettier fallback.
- **Monorepo restructuring**: Moving code into `packages/` is low-risk technically but requires updating every CI config, import path in documentation, and contributor doc. Budget a dedicated Phase 0 PR.

### Low Confidence (Higher Risk)
- **Custom Grunt tasks**: Bespoke build-time code generators (`metadata-function-map`, `configure`, `aria-supported`, `add-locale`) must be rewritten as Vite plugins in `packages/build-tools/`. This is the single largest hidden-work risk in the project. Budget extra time.

---

## 6. Success Metrics

| Metric | Current Baseline | Target |
|---|---|---|
| `pnpm install` (cold) | ~25–35s (npm) | <10s |
| `pnpm install` (warm cache) | N/A | <2s |
| Full build time | ~30–45s (Grunt pipeline) | <8s (Vite + Rolldown) |
| Lint time (full codebase) | ~15–25s (ESLint) | <1s (Oxlint) |
| Format time (full codebase) | ~8–12s (Prettier) | <0.5s (Oxfmt) |
| Unit test suite | ~45–60s (Mocha) | <15s (Vitest) |
| Browser test suite | ~90–120s (Karma) | <30s (Vitest Browser Mode) |
| Type coverage | ~40% (JSDoc) | 100% (TypeScript strict) |
| Bundle size (axe.min.js) | ~250KB | ≤220KB (better tree-shaking) |
| DevDependency count | ~45+ packages | ~20 packages |
| Zero false-positive guarantee | Maintained | Maintained |

---

## 7. Terminology

| Term | Definition |
|---|---|
| **Rule** | An axe-core accessibility test definition (e.g., `color-contrast`, `button-name`) |
| **Check** | A reusable evaluation function composed into Rules |
| **Audit** | The runtime engine that orchestrates Rule execution |
| **VTree** | axe-core's virtual DOM representation |
| **Rolldown** | Rust-based bundler powering Vite 8, replacing esbuild + Rollup |
| **Oxc** | VoidZero's compiler stack: parser, resolver, transformer, minifier |
| **Oxlint** | Linter built on Oxc (replaces ESLint) |
| **Oxfmt** | Formatter built on Oxc (replaces Prettier) |
| **PNPM** | Performant Node Package Manager — content-addressable, strict dependency isolation |
| **Turborepo** | Task runner for monorepos — dependency-aware execution, local + remote caching |
| **Vite+** | VoidZero's upcoming CLI tool (superset of Vite) — potential future Turborepo replacement |

---

## 8. Document Index

- **[Phase 1: Type System Modernization](./PRD-01-type-system-modernization.md)** — TypeScript strict mode, Zod schemas, type-safe public API
- **[Phase 2: Build System Modernization](./PRD-02-build-system-modernization.md)** — Vite 8 + Rolldown, Oxlint, Oxfmt, PNPM, Turborepo, custom task migration
- **[Phase 3: Test Infrastructure Modernization](./PRD-03-test-infrastructure-modernization.md)** — Vitest 4, Browser Mode + Playwright, polyfill removal
- **[Phase 4: Rules & Checks Optimization](./PRD-04-rules-checks-optimization.md)** — Type-safe rule definitions, Zod-validated configs, tree-shakeable bundles

---

## 9. Remaining Open Questions

These are scoped, lower-stakes questions that should be resolved during Phase 0 or early Phase 1 — they do not block project kickoff.

1. **`@axe-core/schemas` publishing strategy.** Should the schemas package be published under the `@axe-core` npm scope (requires Deque org access) or as a subpath export of `axe-core` (e.g., `import { RunOptionsSchema } from 'axe-core/schemas'`)? A separate `@axe-core/schemas` package enables the `axe-core-npm` integration packages to depend on schemas without depending on the full engine. A subpath export is simpler and avoids a new npm package. **Recommendation:** Separate `@axe-core/schemas` package for maximum flexibility.

2. **Turborepo remote caching.** Should we enable Turborepo remote caching (via Vercel or self-hosted)? This would share build caches across CI runs and developer machines. Adds a service dependency but significantly speeds up CI for PRs that don't touch core code. **Recommendation:** Enable with Vercel (free for OSS). Evaluate self-hosted if data residency is a concern.

3. **Vite+ migration timeline.** VoidZero targets Vite+ public preview in early 2026. If it ships during our modernization, should we replace Turborepo mid-project or complete modernization first? **Recommendation:** Complete first, migrate later. Switching task runners mid-migration is unnecessary risk.

4. **`axe-core-npm` modernization.** Should the `axe-core-npm` monorepo also migrate to PNPM + Turborepo + Vitest to match? Out of scope for this project but would ensure ecosystem consistency. **Recommendation:** Yes, as a follow-up project that reuses the patterns established here.

---

*Each phase PRD follows in separate documents with full acceptance criteria, technical specifications, and developer handoff details.*
