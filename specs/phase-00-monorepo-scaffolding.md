# Plan: Phase 0 — Monorepo Scaffolding (PNPM + Turborepo)

## Task Description
Restructure the axe-core repository from a single flat npm-based project into a PNPM workspace monorepo with Turborepo as the task runner. This is a structural-only change — no source code logic is modified. The existing Grunt-based build, Karma/Mocha tests, ESLint, and Prettier must continue to work identically after the restructuring.

## Objective
When this plan is complete, axe-core will be:
1. A PNPM workspace monorepo with 3 packages: `packages/axe-core/`, `packages/schemas/`, `packages/build-tools/`
2. Using Turborepo for task orchestration with caching
3. Using PNPM instead of npm for dependency management
4. All existing CI workflows updated to use PNPM
5. All existing tests passing with zero source code changes
6. `CONTRIBUTING.md` updated with PNPM instructions

## Problem Statement
axe-core's flat npm-based structure cannot support the upcoming modernization phases (Zod schemas package, Vite build plugins, TypeScript migration). The monorepo scaffolding must be established first as a clean structural change, isolated from any functional changes, to preserve `git blame` and `git bisect` usefulness.

## Solution Approach
Execute a file-move-only restructuring in a single PR. All existing source code moves into `packages/axe-core/` unchanged. Empty stub packages are created for `packages/schemas/` and `packages/build-tools/`. PNPM workspace and Turborepo configs are added at the root. CI workflows are updated to use `pnpm` commands. The Grunt build pipeline continues to function within `packages/axe-core/` — it is NOT replaced in this phase.

## Relevant Files

### Files to Move (into `packages/axe-core/`)
- `lib/` — All source code (core, rules, checks, commons, standards)
- `test/` — All test suites (unit, integration, browser)
- `build/` — Grunt build tasks and scripts
- `locales/` — Translation JSON files
- `doc/` — Documentation
- `typings/` — TypeScript type tests
- `Gruntfile.js` — Build orchestration
- `axe.d.ts` — Type definitions
- `bower.json` — Bower config (legacy, but part of the package)
- `axe-linter.yml` — Linter config
- `patches/` — patch-package patches
- `eslint.config.js` — ESLint config
- `tsconfig.json` — TypeScript config (currently only for type tests)
- `.prettierrc` / `.prettierignore` (if they exist, or inline in package.json)
- `sri-history.json` — SRI history
- `LICENSE`, `LICENSE-3RD-PARTY.txt`, `code-of-conduct.md`, `SECURITY.md`
- `CHANGELOG.md`, `README.md`, `CONTRIBUTING.md`

### CI Files to Update
- `.github/workflows/test.yml` — Main test workflow (npm ci → pnpm install, npm run → pnpm run)
- `.github/workflows/format.yml` — Prettier formatter (npm ci → pnpm install)
- `.github/workflows/deploy.yml` — npm publish workflow (npm ci → pnpm install, keep npm publish)
- `.github/workflows/nightly-tests.yml` — Nightly browser tests (npm → pnpm)
- `.github/workflows/release.yml` — Release candidate creation (npm ci → pnpm install)
- `.github/workflows/update-generated-files.yaml` — Generated files update
- `.github/actions/install-deps/action.yml` — Composite action (npm ci → pnpm install)

### New Files
- `pnpm-workspace.yaml` — PNPM workspace definition
- `.npmrc` — PNPM configuration (strict deps, isolated linker)
- `turbo.json` — Turborepo task configuration
- `package.json` (root) — Workspace root with turbo scripts
- `packages/axe-core/package.json` — Moved + adapted from current root
- `packages/schemas/package.json` — Empty stub package
- `packages/schemas/src/index.ts` — Empty barrel export
- `packages/schemas/tsconfig.json` — TypeScript config extending base
- `packages/build-tools/package.json` — Empty stub package (private)
- `packages/build-tools/src/index.ts` — Empty placeholder
- `packages/build-tools/tsconfig.json` — TypeScript config extending base
- `tsconfig.base.json` (root) — Shared TypeScript base config
- `.nvmrc` (root) — Keep at root, value stays `24`

## Implementation Phases

### Phase 1: Foundation — Root Workspace Setup
1. Initialize PNPM workspace config (`pnpm-workspace.yaml`, `.npmrc`)
2. Create root `package.json` with workspace scripts and Turborepo
3. Create `turbo.json` with task definitions pointing to existing Grunt commands
4. Create `tsconfig.base.json` shared config
5. Remove `package-lock.json` (replaced by `pnpm-lock.yaml`)

### Phase 2: Core Implementation — Move Files into Monorepo Structure
1. Create `packages/axe-core/` directory
2. Move all source, test, build, and config files into `packages/axe-core/`
3. Adapt `packages/axe-core/package.json` (move current package.json, update paths)
4. Create empty `packages/schemas/` stub with `package.json` and `src/index.ts`
5. Create empty `packages/build-tools/` stub with `package.json` and `src/index.ts`
6. Ensure `.nvmrc` stays at root
7. Ensure `.gitignore` is updated for new structure

### Phase 3: Integration — CI & Documentation Updates
1. Update all GitHub Actions workflows to use PNPM
2. Update `.github/actions/install-deps/action.yml` composite action
3. Update `CONTRIBUTING.md` with PNPM install instructions
4. Update `CLAUDE.md` to reflect new structure
5. Run `pnpm install` to generate `pnpm-lock.yaml`
6. Verify all tests pass: `pnpm test` from root
7. Verify build works: `pnpm build` from root
8. Verify lint works: `pnpm lint` from root
9. Verify format check works: `pnpm format:check` from root

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to the building, validating, testing, deploying, and other tasks.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: scaffolder
  - Role: Creates the root workspace configuration files (pnpm-workspace.yaml, .npmrc, turbo.json, root package.json, tsconfig.base.json). Creates the empty stub packages (schemas, build-tools). Does NOT move files — that's a separate task.
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: mover
  - Role: Moves all existing files from root into `packages/axe-core/`. Adapts `packages/axe-core/package.json` with corrected paths. Updates `.gitignore` for new structure. This is the highest-risk task — must preserve git history via `git mv`.
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: ci-updater
  - Role: Updates all GitHub Actions workflows and the composite action to use PNPM instead of npm. Updates `CONTRIBUTING.md` and `CLAUDE.md`.
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: validator
  - Role: Runs full validation — pnpm install, build, test, lint, format check. Reports any failures. Does NOT fix issues — reports them back to the team lead.
  - Agent Type: general-purpose
  - Resume: false

## Step by Step Tasks

### 1. Create Root Workspace Configuration
- **Task ID**: create-root-config
- **Depends On**: none
- **Assigned To**: scaffolder
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `pnpm-workspace.yaml` at repo root:
  ```yaml
  packages:
    - 'packages/*'
  ```
- Create `.npmrc` at repo root:
  ```ini
  strict-peer-dependencies=true
  auto-install-peers=true
  shamefully-hoist=false
  node-linker=isolated
  engine-strict=true
  ```
- Create `tsconfig.base.json` at repo root:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "outDir": "dist",
      "rootDir": "src"
    }
  }
  ```
- Create `turbo.json` at repo root:
  ```jsonc
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["axe.js", "axe.min.js", "axe.*.js", "dist/**"],
        "inputs": ["lib/**", "build/**", "locales/**", "Gruntfile.js", "src/**", "tsconfig.json", "vite.config.ts"]
      },
      "test": {
        "dependsOn": ["build"],
        "inputs": ["lib/**", "test/**", "build/**"]
      },
      "test:tsc": {
        "inputs": ["typings/**", "axe.d.ts", "tsconfig.json"]
      },
      "lint": {
        "inputs": ["lib/**", "test/**", "build/**", "Gruntfile.js", "eslint.config.js", "src/**"]
      },
      "format:check": {
        "inputs": ["**/*.{md,json,ts,html,js,mjs}"]
      }
    }
  }
  ```
- Create root `package.json`:
  ```json
  {
    "private": true,
    "packageManager": "pnpm@9.15.4",
    "engines": {
      "node": ">=20.0.0"
    },
    "scripts": {
      "build": "turbo run build",
      "test": "turbo run test",
      "test:tsc": "turbo run test:tsc",
      "lint": "turbo run lint",
      "format:check": "turbo run format:check",
      "validate": "turbo run test:tsc lint format:check test"
    },
    "devDependencies": {
      "turbo": "^2.4"
    }
  }
  ```
- Delete `package-lock.json` (will be replaced by `pnpm-lock.yaml`)

### 2. Move Files into packages/axe-core/
- **Task ID**: move-to-packages
- **Depends On**: create-root-config
- **Assigned To**: mover
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `packages/axe-core/` directory
- Use `git mv` to move ALL of the following from repo root into `packages/axe-core/`:
  - `lib/`
  - `test/`
  - `build/`
  - `locales/`
  - `doc/`
  - `typings/`
  - `patches/`
  - `Gruntfile.js`
  - `axe.d.ts`
  - `axe-linter.yml`
  - `bower.json`
  - `eslint.config.js`
  - `tsconfig.json`
  - `sri-history.json`
  - `LICENSE`
  - `LICENSE-3RD-PARTY.txt`
  - `CHANGELOG.md`
  - `README.md`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `code-of-conduct.md`
- Move the current root `package.json` to `packages/axe-core/package.json` using `git mv`
- Adapt `packages/axe-core/package.json`:
  - Remove the `packageManager` field (that's now in root)
  - Update `engines` to `"node": ">=20.0.0"`
  - Keep ALL existing scripts, devDependencies, and configuration as-is
  - Keep `lint-staged` config as-is
  - Add `"prepare": "husky"` only if husky is kept in this package (or move husky to root)
- Move `.prettierignore` and `.prettierrc` (if they exist) into `packages/axe-core/`
- Keep `.nvmrc` at the repo root (do NOT move it)
- Keep `.gitignore` at the repo root and update paths:
  - Prefix existing paths with `packages/axe-core/` where needed
  - Add `node_modules` (already there, covers all)
  - Add `.turbo/` to gitignore
- Keep `.github/` at the repo root (do NOT move it)
- Keep `CLAUDE.md` at the repo root (do NOT move it)

### 3. Create Stub Packages
- **Task ID**: create-stubs
- **Depends On**: create-root-config
- **Assigned To**: scaffolder
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside move-to-packages)
- Create `packages/schemas/package.json`:
  ```json
  {
    "name": "@axe-core/schemas",
    "version": "0.0.0",
    "description": "Zod schemas for axe-core configuration and results",
    "type": "module",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "files": ["dist"],
    "scripts": {
      "build": "echo 'No build configured yet'",
      "test": "echo 'No tests configured yet'"
    },
    "license": "MPL-2.0"
  }
  ```
- Create `packages/schemas/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": "src"
    },
    "include": ["src"]
  }
  ```
- Create `packages/schemas/src/index.ts`:
  ```ts
  // @axe-core/schemas — Zod schemas for axe-core
  // This package will be populated in Phase 1 (Type System Modernization)
  export {};
  ```
- Create `packages/build-tools/package.json`:
  ```json
  {
    "name": "@axe-core/build-tools",
    "version": "0.0.0",
    "private": true,
    "description": "Internal Vite build plugins for axe-core",
    "type": "module",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
      "build": "echo 'No build configured yet'",
      "test": "echo 'No tests configured yet'"
    },
    "license": "MPL-2.0"
  }
  ```
- Create `packages/build-tools/tsconfig.json`:
  ```json
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": "src"
    },
    "include": ["src"]
  }
  ```
- Create `packages/build-tools/src/index.ts`:
  ```ts
  // @axe-core/build-tools — Internal Vite plugins for axe-core
  // This package will be populated in Phase 2 (Build System Modernization)
  export {};
  ```

### 4. Update CI Workflows for PNPM
- **Task ID**: update-ci
- **Depends On**: move-to-packages, create-stubs
- **Assigned To**: ci-updater
- **Agent Type**: general-purpose
- **Parallel**: false
- Update `.github/actions/install-deps/action.yml`:
  - Replace `cache: npm` with `cache: pnpm`
  - Add a step to install PNPM via Corepack before setup-node: `corepack enable && corepack prepare pnpm@9.15.4 --activate`
  - Replace `npm ci` with `pnpm install --frozen-lockfile`
  - Add `pnpm` to `actions/setup-node` cache parameter
- Update `.github/workflows/test.yml`:
  - Replace all `npm ci` with `pnpm install --frozen-lockfile`
  - Replace all `npm run <X>` with `pnpm run <X>` (or `pnpm <X>`)
  - Add Corepack enable step before setup-node
  - Update cache from `npm` to `pnpm`
  - Update working directory for package-specific commands: `working-directory: packages/axe-core` where needed (test commands that reference Karma configs, etc.)
  - For the `test_node` job (Node 6, 18, 20, 22, 24 matrix): Node 6 does NOT support PNPM/Corepack — keep `npm run test:node` for that job, but the build artifact is still downloaded. Consider running test:node directly with `node` since it just runs `node test/node/node.js`.
- Update `.github/workflows/format.yml`:
  - Replace `npm ci` with `pnpm install --frozen-lockfile`
  - Replace `npm run fmt` with `pnpm run fmt`
  - Add Corepack enable step
- Update `.github/workflows/deploy.yml`:
  - Replace `npm ci` with `pnpm install --frozen-lockfile`
  - Replace `npm run prepare && npm run build` with `pnpm run prepare && pnpm run build`
  - Keep `npm publish` as-is (PNPM's publish is fine too, but npm publish with OIDC provenance is already configured)
  - Replace `npm version` with `pnpm version` or keep as `npm version` (both work)
  - Add Corepack enable step
- Update `.github/workflows/nightly-tests.yml`:
  - Same pattern as test.yml — replace npm with pnpm, add Corepack
- Update `.github/workflows/release.yml`:
  - Replace `npm ci` with `pnpm install --frozen-lockfile`
  - Replace `npm run release` with `pnpm run release`
  - Add Corepack enable step
- Update `.github/workflows/update-generated-files.yaml` (read it first to understand what it does, then update npm → pnpm)

### 5. Update Documentation
- **Task ID**: update-docs
- **Depends On**: move-to-packages
- **Assigned To**: ci-updater
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside update-ci)
- Update `packages/axe-core/CONTRIBUTING.md`:
  - Replace `npm install` with `pnpm install`
  - Replace `npm run build` with `pnpm build`
  - Replace `npm test` with `pnpm test`
  - Replace `npm run <X>` with `pnpm <X>` throughout
  - Note that Corepack must be enabled: `corepack enable`
  - Note minimum Node 20 requirement
- Update `CLAUDE.md` (at repo root):
  - Update "Development Commands (Current)" to reflect that commands are now run via pnpm from root
  - Update file paths to reflect `packages/axe-core/` prefix
  - Mark Phase 0 as complete once validated

### 6. Install Dependencies and Generate Lockfile
- **Task ID**: install-deps
- **Depends On**: update-ci, update-docs
- **Assigned To**: validator
- **Agent Type**: general-purpose
- **Parallel**: false
- Run `corepack enable` to ensure PNPM is available
- Run `pnpm install` from repo root to generate `pnpm-lock.yaml`
- Verify `node_modules` structure is correct (packages properly linked)
- Verify `packages/axe-core/node_modules` has all required dependencies

### 7. Validate Build
- **Task ID**: validate-build
- **Depends On**: install-deps
- **Assigned To**: validator
- **Agent Type**: general-purpose
- **Parallel**: false
- Run `pnpm build` from root (which runs `turbo run build`)
- Verify `packages/axe-core/axe.js` is generated
- Verify `packages/axe-core/axe.min.js` is generated
- Verify build output matches expected byte sizes (no regressions)

### 8. Validate Tests
- **Task ID**: validate-tests
- **Depends On**: validate-build
- **Assigned To**: validator
- **Agent Type**: general-purpose
- **Parallel**: false
- Run `pnpm test` from root
- Verify all unit tests pass
- Run `pnpm lint` to verify ESLint works
- Run `pnpm format:check` to verify Prettier works
- Run `pnpm test:tsc` to verify TypeScript type checks pass
- Report any failures with full error output

### 9. Final Review and Cleanup
- **Task ID**: final-review
- **Depends On**: validate-tests
- **Assigned To**: validator
- **Agent Type**: general-purpose
- **Parallel**: false
- Verify no source code files were modified (only moved)
- Verify `.gitignore` properly excludes `node_modules`, `.turbo/`, `logs/`, `.claude/`
- Verify `pnpm-lock.yaml` is generated and committed
- Verify root `package.json` has correct `packageManager` field
- Run `git diff --stat develop` to review the full change set
- Confirm the PR is ready for review

## Acceptance Criteria

1. `pnpm install` succeeds from repo root with zero errors
2. `pnpm build` produces `packages/axe-core/axe.js` and `packages/axe-core/axe.min.js` identical to current build output
3. `pnpm test` passes all existing unit tests with zero failures
4. `pnpm lint` runs ESLint with zero new errors
5. `pnpm format:check` passes Prettier check
6. `pnpm test:tsc` passes TypeScript type checks
7. `packages/schemas/` exists with valid `package.json` stub
8. `packages/build-tools/` exists with valid `package.json` stub (private)
9. `turbo.json` is present with correct task definitions
10. `pnpm-workspace.yaml` is present and lists `packages/*`
11. `.npmrc` has strict dependency settings
12. All CI workflows reference `pnpm` instead of `npm`
13. `CONTRIBUTING.md` references PNPM installation
14. No source code logic has been modified — only file locations changed
15. `git blame` still works for moved files (via `git mv`)

## Validation Commands

Execute these commands to validate the task is complete:

- `pnpm install` — Verify dependency installation works
- `cd packages/axe-core && pnpm build` — Verify Grunt build works in new location
- `cd packages/axe-core && pnpm test` — Verify all tests pass
- `cd packages/axe-core && pnpm run eslint` — Verify linting works
- `cd packages/axe-core && pnpm run fmt:check` — Verify format check works
- `cd packages/axe-core && pnpm run test:tsc` — Verify TypeScript checks pass
- `pnpm build` (from root) — Verify Turborepo orchestration works
- `git diff --name-status develop` — Verify only renames (R) and additions (A), no modifications (M) to source files

## Notes

- **Husky**: The `husky` + `lint-staged` setup needs to work from the root. Husky should be configured at the root level since `.git/` is at the root. `lint-staged` can remain in `packages/axe-core/package.json` or be moved to root — either works since lint-staged runs relative to the config file location.
- **patch-package**: The `patches/` directory and `patch-package` postinstall script need to work from `packages/axe-core/`. Verify patches apply correctly after the move.
- **Node 6 test matrix**: The `test_node` CI job runs on Node 6, which doesn't support PNPM or Corepack. This job only needs the build artifact (downloaded from GitHub Actions artifact) and runs `node test/node/node.js`. It should continue using direct node execution, not pnpm.
- **npm publish**: The deploy workflow should continue using `npm publish` for OIDC provenance. PNPM publish would also work, but changing the publish mechanism is out of scope for Phase 0.
- **Turborepo caching**: Local caching is enabled by default. Remote caching (Vercel) is deferred to a later decision.
- **`standard-version`**: The release script uses `standard-version` which expects to be run from the package directory. Verify `pnpm run release` from `packages/axe-core/` works correctly.
