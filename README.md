# Propellr

A web-quality platform evolving from [axe-core](https://github.com/dequelabs/axe-core): accessibility checks, enterprise design-system contracts and evidence-gated rule authoring.

Propellr is the working name. The new platform is not implemented or published yet. Existing packages, APIs and licenses remain unchanged; `@propellr/engine` is a proposed future package, not a reserved npm scope.

## Start here

- [Implementation plan](specs/streamlined-modernization-plan.html)
- [Repository reconciliation and PR #5 reuse map](specs/modernization-reconciliation.md)
- [Executed baseline and known gaps](specs/modernization-baseline.json)
- [Development guidance](CLAUDE.md)
- [Existing engine documentation](packages/axe-core/README.md)

## Development model

`main` is the protected default branch. Use short-lived branches and squash-merged pull requests. Direct pushes, force pushes and deletion of `main` are blocked, including for administrators; review conversations must be resolved. No second approver is required for this solo-maintainer setup.

Required status checks will be selected when Phase 1 establishes reliable CI. Existing failures are not waived correctness requirements for the new engine. Keep legacy tests as evidence until their replacements are verified.

PR #7 established the preparation plan. PR #5 and the old migration branch remain available for selective reuse, not as competing trunks. Do not merge or delete that work wholesale.

## Release boundary

Repository renaming does not rename or publish the `axe-core` package. Inherited deployment and generated-file workflows still target `master`/`develop`, not `main`; release-candidate automation still targets `master`. They were intentionally not retargeted or dispatched. Establish a separate, approved release policy before using them.
