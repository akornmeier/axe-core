# Propellr greenfield

One private ESM project. Follow `specs/propellr-greenfield-foundation.html` and
`specs/propellr-acceptance-contract.md`. Stop at each approved phase boundary.

- No inherited tooling migration, monorepo scaffolding or axe-core dependency.
- Preserve existing worktrees, user edits and canonical axe-core.
- Exact Node/PNPM/tool pins live in package.json and .node-version. No global upgrades.
- Lifecycle scripts disabled. Review native packages and scripts before changing that.
- Oxfmt is the sole formatter; `format:check` is mandatory in CI.
- Strict TypeScript. Inputs derive from schemas. No `any` or runtime schema imports
  in browser analysis. Host has no ambient DOM; browser has no Node imports.
- Keep output verdicts, coverage, grouping and gate policy separate. Partial is not pass.
- Tests must execute real cases. No empty success targets or fabricated validation.
- No publishing, production/live-channel work, PR merges or customer data without approval.

Run `pnpm validate` under pinned tools before reporting completion. See README for
project-scoped execution and documented third-party declaration-check exceptions.
