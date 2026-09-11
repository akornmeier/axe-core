# Propellr — Coding Guide

## Project Overview

Propellr is the working name for a web-quality platform evolving from axe-core. The active roadmap is [Propellr: the next accessibility engine](specs/streamlined-modernization-plan.html): reliable tooling, configurable enterprise rule packs, an agent-facing rule SDK and measured execution improvements.

**Repository:** `akornmeier/propellr`. Protected `main` is the only trunk; use short-lived branches and squash-merged PRs. Existing migration branches are historical/reuse sources, not parallel trunks. Existing package names remain unchanged; `@propellr/engine` is proposed, not registered or published.

**Preparation baseline:** `develop@b9da71e2` (merged PR #4). Read [repository reconciliation](specs/modernization-reconciliation.md) and [executed baseline](specs/modernization-baseline.json) before implementation. The old local Phase 3 branch diverged from the merged migration; do not replay it or treat PR #5's historical results as current verification.

**Execution:** start with a bounded Phase 1 run from latest `main`, which includes the preparation plan from PR #7. One integrator owns plan updates. Before Phase 3, Tony must resolve the new opt-in API versus full compatibility-facade decision. No publishing, live-channel changes or customer-data use without explicit authorization. Inherited deploy/release/generated-file workflows still target old branches; do not redirect or dispatch them as part of the rename. Reliable required CI checks remain Phase 1 work; branch protection is not evidence of green tests.

Older PRDs below are historical architecture/migration references, not competing execution checklists. Their phase status and version targets are not evidence that checks currently pass.

## Historical Target Stack

| Layer | Current (Legacy) | Target (Modern) |
|---|---|---|
| Package Manager | npm | PNPM (content-addressable, strict deps) |
| Repo Structure | Single flat repo | PNPM workspace monorepo + Turborepo |
| Type System | JSDoc + hand-written `.d.ts` | TypeScript strict mode + Zod schemas |
| Build | Grunt + esbuild + Babel + concat + UglifyJS | Vite 8 + Rolldown |
| Linting | ESLint 9 | OxLint |
| Formatting | Prettier | Oxfmt (Prettier fallback until beta) |
| Unit Tests | Mocha + Chai + Sinon | Vitest 4 |
| Browser Tests | Karma + launchers | Vitest Browser Mode + Playwright |

## Historical Phase Order & Dependencies

| Phase | Title | Depends On |
|---|---|---|
| **Phase 0** | Monorepo Scaffolding (PNPM + Turborepo) | None |
| **Phase 1** | Type System Modernization | Phase 0 |
| **Phase 2** | Build System Modernization | Phase 1 (partial) |
| **Phase 3** | Test Infrastructure Modernization | Phase 2 (partial) |
| **Phase 4** | Rules & Checks Optimization | Phases 1–3 |

## Target Monorepo Structure

```
axe-core/
├── pnpm-workspace.yaml
├── turbo.json
├── packages/
│   ├── axe-core/          # Main engine — published as `axe-core`
│   ├── schemas/           # Zod schemas — published as `@axe-core/schemas`
│   └── build-tools/       # Internal Vite plugins (not published)
└── package.json           # Root workspace config
```

## Key Constraints

- **Zero false-positive guarantee must be maintained** at every phase
- **All existing tests must pass** before and after each structural change
- **Node 20 LTS** is the minimum supported version
- **Incremental TypeScript migration** — `allowJs: true`, bottom-up conversion
- **Start with `rolldown-vite`** (Vite 7 + Rolldown), upgrade to Vite 8 when stable
- **Oxfmt is advisory-only** until it reaches beta; Prettier remains the hard gate

## Development Commands

```bash
# Enable Corepack (manages PNPM)
corepack enable

# Install
pnpm install

# Build / Test / Lint (via Turborepo)
pnpm build
pnpm test
pnpm lint              # oxlint
pnpm format            # current package format:check scripts (Prettier)
pnpm typecheck         # currently omits a real axe-core typecheck task
pnpm validate          # incomplete baseline gate; see reconciliation report

# Package-specific commands (from packages/axe-core/)
pnpm run lint          # Oxlint
pnpm run fmt:check     # Prettier format check
pnpm run build         # Vite build
pnpm run test:vitest:unit
pnpm run test:vitest:browser
pnpm run test:vitest:integration

# Direct compiler check after generating schema declarations
pnpm exec tsc --noEmit
```

## Architecture Terminology

- **Rule** — An accessibility test definition (e.g., `color-contrast`, `button-name`)
- **Check** — A reusable evaluation function composed into Rules
- **Audit** — The runtime engine orchestrating Rule execution
- **VTree** — axe-core's virtual DOM representation

## Important Files

- `packages/axe-core/lib/core/` — Engine (Audit, Rule, Check, VTree, run/configure)
- `packages/axe-core/lib/rules/` — Rule definitions
- `packages/axe-core/lib/checks/` — Check evaluators
- `packages/axe-core/lib/commons/` — Shared utilities (DOM, text, color, math)
- `packages/axe-core/lib/standards/` — ARIA specs, HTML element data
- `packages/axe-core/locales/` — Translation JSON files
- `packages/build-tools/src/` — Vite plugins and generation helpers
- `packages/axe-core/test/` — Mixed Vitest and legacy Karma/Mocha suites; inventory before removing tests
- `packages/axe-core/vite.config.ts` — Current bundle build
- `packages/axe-core/vitest.workspace.ts` — Active Vitest project definitions, not a documentation stub
- `packages/axe-core/axe.d.ts` — Hand-written type definitions (to be auto-generated)

## Specs

Active execution and evidence live in `specs/streamlined-modernization-plan.html`, `specs/modernization-reconciliation.md` and `specs/modernization-baseline.json`.

Historical PRD documents live in `specs/`:

- `PRD-00-axe-core-modernization-overview.md` — Master plan
- `PRD-01-type-system-modernization.md` — Phase 1 (planned)
- `PRD-02-build-system-modernization.md` — Phase 2 (planned)
- `PRD-03-test-infrastructure-modernization.md` — Phase 3 (planned)
- `PRD-04-rules-checks-optimization.md` — Phase 4 (planned)
