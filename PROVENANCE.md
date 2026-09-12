# Provenance and licenses

This worktree uses branch `feat/greenfield-foundation` in the existing Propellr
repository, based on preparation commit
`46df83acde9421908d9b962d39d70b2da203426e`. Git history and other worktrees remain
intact. Its root tree is intentionally rebuilt without inherited package graphs,
build plugins, tests or release automation.

Product/acceptance/architecture/reference documents and contract prototypes came
from Tony's uncommitted preparation files on September 12, 2026. They remain
requirements and historical design inputs. `src/contracts.ts` adopts the prototype
output model while deriving request shapes from new executable schemas. Negative
examples were retained in `test/types/`. The original prototype remains in `specs/`
for provenance, not as a second runtime schema or executable implementation.

The inherited axe-core MPL 2.0 license is retained verbatim at
`licenses/axe-core-MPL-2.0.txt` from
`packages/axe-core/LICENSE` at the preparation commit. No upstream engine logic,
fixtures, standards data or bundle is reused in phase 1. The private project does
not assert a new public distribution license; review licensing before publication
or selective source reuse.

Canonical source and future artifact pins are in `reference.json` and
`specs/axe-core-reference.md`. No canonical build/install or artifact download was
performed. Dependency licenses remain with their installed packages; exact resolved
versions and integrity values are recorded by the new lockfile.
