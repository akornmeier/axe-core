#!/usr/bin/env node
// Companion script: revert specific .test.ts files (from a list) back to
// .test.ts.todo with FIXME stamps, then remove the failing .test.ts.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PKG = '/Users/tonykornmeier/Code/axe-core/packages/axe-core';

async function main() {
  const listFile = process.argv[2];
  if (!listFile) {
    console.error('Usage: node revert-failures.mjs <failed-files.txt>');
    process.exit(1);
  }
  const list = (await fs.readFile(listFile, 'utf8'))
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const rel of list) {
    const tsPath = path.join(PKG, rel);
    const todoPath = tsPath + '.todo';

    // Restore the .todo from git.
    const res = spawnSync(
      'git',
      ['checkout', 'HEAD', '--', path.relative(PKG, todoPath)],
      { cwd: PKG, encoding: 'utf8' }
    );
    if (res.status !== 0) {
      console.error(
        `git restore failed for ${todoPath}: ${res.stderr || res.stdout}`
      );
      continue;
    }
    let original;
    try {
      original = await fs.readFile(todoPath, 'utf8');
    } catch (e) {
      console.error(`Could not read restored ${todoPath}: ${e.message}`);
      continue;
    }
    const stamp = `// FIXME(phase-3-sprint-4b): codemod-output failed vitest — see Sprint 4b for residual blockers (likely Path-B Task #4 helper signature mismatch or test-side type/runtime delta).\n`;
    const stamped = original.startsWith('// FIXME(phase-3-sprint-4b)')
      ? original
      : stamp + original;
    await fs.writeFile(todoPath, stamped, 'utf8');

    // Remove the failing .test.ts file.
    try {
      await fs.unlink(tsPath);
    } catch {
      // ignore — possibly already gone
    }
    console.log(`REVERTED ${rel}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
