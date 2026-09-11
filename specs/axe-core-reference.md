# Canonical axe-core reference

Propellr is the new project. Canonical axe-core is a separate comparison source,
not another workspace package or a legacy compatibility project to maintain here.

- Upstream: https://github.com/dequelabs/axe-core
- Local checkout: `~/code/axe-core`
- Cloned September 11, 2026 from upstream `develop`.
- Recorded commit: `4d306cbb7c456849c6f964444a6a7174d2be502a`.
- Clone verified clean. Dependencies, builds and upstream tests **not run**.

For repeatable comparisons, use the recorded commit in a disposable upstream
worktree. Follow upstream's own setup; do not add its dependencies, examples,
runner adapters or absolute local paths to Propellr's workspace or CI.
A newer upstream commit is not automatically an approved semantic oracle.
Select relevant fixtures, pin both versions and review outcome differences.

## PR #9 reassessment

The compatibility-repair approach was rejected by Tony. Commit `42b655e4` preserves
that work for inspection; none of its engine, bundle, locale-builder or test
assertion changes belong in the revised PR. No runtime fixes are carried forward.
The fresh-schema cache fix remains because current source typechecking needs it.

Cleanup removes 20 direct legacy test dependencies, example packages, Karma
configuration/debugging and legacy CI/nightly lanes. Existing Vitest projects
remain unchanged. Legacy test cases and fixtures stay available for selective
reuse; removing their runners is **not** equivalent to migrating their coverage.

Current CI checks the existing source subset, not full axe-core conformance,
packed-consumer compatibility or a completed modernization phase. Source/bundle
limitations recorded in the preparation baseline remain limitations. Release and
deploy workflows are untouched and must not be dispatched.

## Next product work

Follow [the active plan](streamlined-modernization-plan.html). Establish focused
correctness gates for the selected engine boundary and enterprise rule/SDK pilot.
Do not make old runner migration, examples, AMD parity or complete legacy cleanup
prerequisites. The public API decision still precedes new core implementation.

PR #5 is unchanged. PR #8 overlaps CI routing and needs reconciliation before
merge; no pull request is merged by this cleanup.
