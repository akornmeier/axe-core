# axe-core Modernization — Claude Code Guide

## Project Overview

axe-core is the most widely adopted accessibility testing engine on the web. We are modernizing the build, test, and type infrastructure across four phased workstreams. See `specs/PRD-00-axe-core-modernization-overview.md` for the full master plan.

**Current branch:** `chore/modernize-phase-00` (Phase 0 — Monorepo Scaffolding)

## Target Stack

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

## Phase Order & Dependencies

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

## Development Commands (Current)

```bash
# Install
npm install

# Build
npm run build          # or: grunt

# Test
npm test               # Runs tsc + unit tests via Karma
npm run test:unit      # Unit tests only (Karma)
npm run eslint         # Lint
npm run fmt:check      # Prettier format check
```

## Development Commands (Target — Post Phase 0)

```bash
# Install
pnpm install

# Build / Test / Lint (via Turborepo)
pnpm build
pnpm test
pnpm lint              # oxlint
pnpm format            # oxfmt --check
pnpm typecheck
pnpm validate          # all of the above
```

## Architecture Terminology

- **Rule** — An accessibility test definition (e.g., `color-contrast`, `button-name`)
- **Check** — A reusable evaluation function composed into Rules
- **Audit** — The runtime engine orchestrating Rule execution
- **VTree** — axe-core's virtual DOM representation

## Important Files

- `lib/core/` — Engine (Audit, Rule, Check, VTree, run/configure)
- `lib/rules/` — Rule definitions
- `lib/checks/` — Check evaluators
- `lib/commons/` — Shared utilities (DOM, text, color, math)
- `lib/standards/` — ARIA specs, HTML element data
- `locales/` — Translation JSON files
- `build/` — Current Grunt build tasks (to be replaced by Vite plugins)
- `test/` — All test suites (Karma/Mocha — to be replaced by Vitest)
- `Gruntfile.js` — Current build orchestration (to be replaced)
- `axe.d.ts` — Hand-written type definitions (to be auto-generated)

## Specs

All PRD documents live in `specs/`:

- `PRD-00-axe-core-modernization-overview.md` — Master plan
- `PRD-01-type-system-modernization.md` — Phase 1 (planned)
- `PRD-02-build-system-modernization.md` — Phase 2 (planned)
- `PRD-03-test-infrastructure-modernization.md` — Phase 3 (planned)
- `PRD-04-rules-checks-optimization.md` — Phase 4 (planned)
