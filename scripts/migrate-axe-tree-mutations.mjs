#!/usr/bin/env node
// Thin CLI wrapper around
// `packages/build-tools/src/codemods/migrate-axe-tree-to-flat-tree-setup.ts`.
//
// Pass any number of file paths or globs. The codemod rewrites
//
//   axe._tree = axe.utils.getFlattenedTree(node);
//   const x = (axe._tree = axe.utils.getFlattenedTree(node));
//   var getFlattenedTree = axe.utils.getFlattenedTree; ... axe._tree = getFlattenedTree(node);
//
// to the equivalent `flatTreeSetup(node);` calls (or
// `const x = flatTreeSetup(node);` for the parenthesised init form), and
// adds `import { flatTreeSetup } from '@helpers/check-helpers';` at the top
// of the file (merging with an existing helpers import if present).
//
// Sprint 4b follow-up #2. The runner script that handles the full
// orchestration — strip the FIXME header, run the codemod, rename .todo →
// .test.ts, run vitest, revert on failure — lives in this same scripts/
// directory and shells out to this wrapper.

import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const codemod = path.join(
  repoRoot,
  'packages/build-tools/src/codemods/migrate-axe-tree-to-flat-tree-setup.ts'
);

const rawArgs = process.argv.slice(2);
if (rawArgs.length === 0) {
  console.error(
    'Usage: scripts/migrate-axe-tree-mutations.mjs <file-or-glob>… [--dry-run]'
  );
  process.exit(1);
}

// Resolve all non-flag args to absolute paths against the *invocation* cwd,
// so that we can hand them to the codemod regardless of where `pnpm exec`
// chooses to set the working directory.
const args = rawArgs.map((a) => {
  if (a.startsWith('--')) return a;
  if (a.includes('*') || a.includes('?')) return path.resolve(process.cwd(), a);
  return path.resolve(process.cwd(), a);
});

const result = spawnSync(
  'pnpm',
  ['--filter', '@axe-core/build-tools', 'exec', 'tsx', codemod, ...args],
  { stdio: 'inherit', cwd: repoRoot }
);
process.exit(result.status ?? 1);
