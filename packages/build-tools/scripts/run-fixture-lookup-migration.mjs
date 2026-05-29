#!/usr/bin/env node
/**
 * run-fixture-lookup-migration.mjs
 *
 * Phase 3 Sprint 4b — Task #2 runner.
 *
 * Pipeline (per file):
 *   1. Strip the fixture-lookup FIXME header.
 *   2. Run the migrate-module-scope-fixture codemod.
 *   3. Rename `.test.ts.todo` → `.test.ts`.
 *   4. Run `pnpm --filter axe-core test:vitest <relative-path>` against the
 *      migrated file. (Per-file rather than batched — the candidate list is
 *      small (~8 files) and per-file gives us a precise pass/fail without
 *      having to parse a multi-file vitest log.)
 *   5. On pass: keep. On fail: rename back to `.todo` and restore the
 *      original source with a refined `post-codemod failure: <reason>` FIXME.
 *
 * Mirror of `run-chai-assert-migration.mjs`; smaller-batch version since
 * the candidate set is tiny.
 *
 * Usage:
 *   node packages/build-tools/scripts/run-fixture-lookup-migration.mjs
 *     [--axe-core-dir <path>] [--codemod-only] [--no-revert]
 */

import { execFile, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXME_HEADER_RE = /^\/\/\s*FIXME\(phase-3-sprint-4b\):[^\n]*\n/;
const FIXTURE_BLOCKER_TEXT =
  'fixture lookup at module top level — codemod did not convert';

function restampFixme(originalSource, blocker) {
  const stripped = originalSource.replace(FIXME_HEADER_RE, '');
  return `// FIXME(phase-3-sprint-4b): codemod blocker — post-codemod failure: ${blocker}\n${stripped}`;
}

// --- arg parsing ----------------------------------------------------------
const argv = process.argv.slice(2);
let axeCoreDir = null;
let codemodOnly = false;
let noRevert = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--axe-core-dir') axeCoreDir = argv[++i];
  else if (a === '--codemod-only') codemodOnly = true;
  else if (a === '--no-revert') noRevert = true;
  else if (a === '-h' || a === '--help') {
    console.log(
      `Usage: run-fixture-lookup-migration.mjs [--axe-core-dir <path>] [--codemod-only] [--no-revert]`
    );
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${a}`);
    process.exit(2);
  }
}

// --- locate package roots -------------------------------------------------
const buildToolsRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(buildToolsRoot, '..', '..');
const resolvedAxeCoreDir = axeCoreDir
  ? path.resolve(axeCoreDir)
  : path.resolve(repoRoot, 'packages', 'axe-core');

const codemodScript = path.resolve(
  buildToolsRoot,
  'src',
  'codemods',
  'migrate-module-scope-fixture.ts'
);

// The candidate files were stamped with the fixture-lookup blocker, but
// nearly all of them ALSO carry a latent chai-`assert.*` blocker that the
// prior codemod skipped (because it only operated on files NOT carrying a
// FIXME header). Running the chai-assert codemod in the same pipeline lets
// the file flip cleanly. Running it second is safe — its idempotency
// guarantees are well-tested, and on a file with no `assert.*` calls it's
// a no-op.
const chaiCodemodScript = path.resolve(
  buildToolsRoot,
  'src',
  'codemods',
  'migrate-chai-assert-to-vitest.ts'
);

// --- discover the candidate file list -------------------------------------
//
// We grep for the exact FIXME marker the prior codemod stamped on these
// files. `grep -rln` is portable enough for our supported macOS/Linux
// developer machines and avoids pulling in a directory walker.
const grepRes = spawnSync(
  'grep',
  [
    '-rln',
    'FIXME(phase-3-sprint-4b): codemod blocker — fixture lookup at module top level',
    path.join(resolvedAxeCoreDir, 'test', 'browser')
  ],
  { encoding: 'utf8' }
);

if (grepRes.error) {
  console.error(`grep failed: ${grepRes.error.message}`);
  process.exit(1);
}

const todoFiles = (grepRes.stdout || '')
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean)
  .filter(f => f.endsWith('.test.ts.todo'));

if (todoFiles.length === 0) {
  console.log(
    'run-fixture-lookup-migration: no candidate files found — nothing to do.'
  );
  process.exit(0);
}

console.log(
  `run-fixture-lookup-migration: ${todoFiles.length} candidate file(s) (axe-core dir: ${resolvedAxeCoreDir})`
);
for (const f of todoFiles) {
  console.log(`  - ${path.relative(resolvedAxeCoreDir, f)}`);
}

// =========================================================================
// Phase A — codemod + rename, then per-file verification.
// =========================================================================

const flipped = []; // { todoPath, tsPath }
const reverted = []; // { file, reason }
const skipped = []; // { file, reason }

for (const todoPath of todoFiles) {
  const stat = await fs.stat(todoPath).catch(() => null);
  if (!stat || !stat.isFile()) {
    skipped.push({ file: todoPath, reason: 'missing on disk' });
    continue;
  }

  const tsPath = todoPath.replace(/\.test\.ts\.todo$/, '.test.ts');
  const originalSource = await fs.readFile(todoPath, 'utf8');

  // ----- Step 1+2: strip FIXME + run fixture codemod (the codemod itself
  // strips the FIXME line; we invoke the CLI rather than dynamic-importing
  // a TS file because tsx is the established harness).
  try {
    await execFileP('pnpm', ['exec', 'tsx', codemodScript, todoPath], {
      cwd: buildToolsRoot,
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (err) {
    // Restore source byte-for-byte (the codemod wrote partial output before
    // failing) and keep the file as a `.todo`.
    await fs.writeFile(todoPath, originalSource, 'utf8');
    skipped.push({
      file: todoPath,
      reason: `codemod failed: ${(err.message ?? '').split('\n')[0]}`
    });
    continue;
  }

  // ----- Step 2b: chase down latent chai-`assert.*` calls in the same file.
  // No-op when the file has no chai assertions.
  try {
    await execFileP('pnpm', ['exec', 'tsx', chaiCodemodScript, todoPath], {
      cwd: buildToolsRoot,
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (err) {
    await fs.writeFile(todoPath, originalSource, 'utf8');
    skipped.push({
      file: todoPath,
      reason: `chai-assert codemod failed: ${(err.message ?? '').split('\n')[0]}`
    });
    continue;
  }

  // ----- Step 3: rename to .test.ts so vitest will pick it up.
  await fs.rename(todoPath, tsPath);

  if (codemodOnly) {
    flipped.push({ todoPath, tsPath });
    continue;
  }

  // ----- Step 4: run vitest filtered to this single file.
  // We invoke vitest directly (not via `pnpm run`) so the path arg lands as
  // a test-pattern filter rather than getting consumed by pnpm's `--` arg
  // forwarding. `--project browser` matches the project name in the
  // axe-core vitest config — every candidate file lives under
  // `test/browser/`.
  const relTs = path.relative(resolvedAxeCoreDir, tsPath);
  let ok = false;
  let stderr = '';
  let stdout = '';
  try {
    const child = await execFileP(
      'pnpm',
      ['exec', 'vitest', 'run', '--project', 'browser', relTs],
      {
        cwd: resolvedAxeCoreDir,
        maxBuffer: 64 * 1024 * 1024,
        timeout: 300_000
      }
    );
    stdout = child.stdout || '';
    stderr = child.stderr || '';
    ok = true;
  } catch (err) {
    stdout = (err.stdout || '').toString();
    stderr = (err.stderr || '').toString();
    ok = false;
  }

  if (ok) {
    flipped.push({ todoPath, tsPath });
    console.log(`PASS  ${relTs}`);
    continue;
  }

  if (noRevert) {
    reverted.push({ file: tsPath, reason: 'fail (revert disabled)' });
    console.log(`FAIL  ${relTs} (kept — --no-revert)`);
    continue;
  }

  // ----- Step 5: revert. Pick a one-line reason out of the vitest log.
  const blocker = classifyBlocker(stdout + '\n' + stderr);
  await fs.rename(tsPath, todoPath);
  await fs.writeFile(todoPath, restampFixme(originalSource, blocker), 'utf8');
  reverted.push({ file: todoPath, reason: blocker });
  console.log(`FAIL  ${relTs} → reverted (${blocker})`);
}

// =========================================================================
// Summary
// =========================================================================

console.log('\n--- run-fixture-lookup-migration summary ---');
console.log(`migrate-module-scope-fixture: ${flipped.length}/${todoFiles.length} flipped, ${reverted.length} reverted`);
if (skipped.length) console.log(`skipped: ${skipped.length}`);

if (reverted.length > 0) {
  console.log('\nrevert reasons:');
  const byReason = new Map();
  for (const r of reverted) {
    byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
  }
  for (const [reason, count] of [...byReason.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${count}× ${reason}`);
  }
}

if (skipped.length > 0) {
  console.log('\nskipped:');
  for (const s of skipped) {
    console.log(`  ${s.file}: ${s.reason}`);
  }
}

// --- helpers --------------------------------------------------------------

/** Pick a one-line blocker description from the vitest output. */
function classifyBlocker(combined) {
  const s = combined.toLowerCase();
  if (/cannot set properties of null/.test(s)) return FIXTURE_BLOCKER_TEXT;
  if (/cannot read properties of null/.test(s))
    return 'null deref after codemod (likely missing #fixture in DOM)';
  if (/axe is not defined/.test(s)) return 'axe global not resolved (Path-B import)';
  if (/cannot find module|failed to resolve/.test(s))
    return 'unresolved import (Path-B)';
  if (/redeclar/.test(s)) return 'identifier redeclaration (Path-B)';
  if (/timeout|timed out/.test(s)) return 'test timeout';
  if (/transform error|parse error|syntax error/.test(s))
    return 'syntax/transform error after codemod';
  if (
    /\bdone\b.*not.*function|done is not a function|done\(\) callback is deprecated/.test(
      s
    )
  )
    return "uses Mocha 'done' callback (Vitest expects async/await)";
  // Match a chai assertion *call site*. Avoid matching `assert.test.ts` —
  // there's an existing test file by that name in axe-core/test/unit. We
  // require an open paren to disambiguate a call from a path segment.
  if (/\bassert\.[a-zA-Z]+\s*\(/.test(combined))
    return "uses chai-style 'assert.*' (codemod did not convert)";
  if (/\bsinon\b/.test(s)) return 'uses sinon (replace with vi.fn / vi.spyOn)';
  if (/axe\._tree|axe\._audit/.test(combined))
    return 'uses axe._* internal state (Path-B)';
  return 'test failure post-codemod (see vitest log)';
}
