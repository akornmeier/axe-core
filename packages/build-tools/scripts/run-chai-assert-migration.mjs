#!/usr/bin/env node
/**
 * run-chai-assert-migration.mjs
 *
 * Phase 3 Sprint 4b runner. Two phases:
 *
 *   Phase A (codemod + rename): for every `.test.ts.todo` in the input list,
 *     run `migrate-chai-assert-to-vitest` to convert `assert.*(...)` →
 *     `expect(...).to*(...)`, strip the chai-assert FIXME clause, then
 *     rename to `.test.ts`. The codemod also injects vitest + axe-helper
 *     imports if the file needs them.
 *
 *   Phase B (test + revert): run `pnpm run test:vitest:browser` ONCE over
 *     all the migrated paths. Parse the output to identify failures and
 *     revert each failing file back to `.todo` form, restoring the FIXME
 *     header (with a description of the remaining blocker so the file
 *     stays discoverable).
 *
 * The two-phase design avoids paying the per-file Playwright/browser
 * startup cost (≈3s × 97 ≈ 5 minutes saved).
 *
 * Usage:
 *   node scripts/run-chai-assert-migration.mjs --list <file> \
 *     [--axe-core-dir <path>] [--codemod-only] [--no-revert]
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXME_HEADER_RE = /^\/\/\s*FIXME\(phase-3-sprint-4b\):[^\n]*\n/;

function restampFixme(originalSource, blocker) {
  const stripped = originalSource.replace(FIXME_HEADER_RE, '');
  return `// FIXME(phase-3-sprint-4b): codemod blocker — ${blocker}\n${stripped}`;
}

// --- arg parsing ----------------------------------------------------------
const argv = process.argv.slice(2);
let listFile = null;
let axeCoreDir = null;
let codemodOnly = false;
let noRevert = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--list') listFile = argv[++i];
  else if (a === '--axe-core-dir') axeCoreDir = argv[++i];
  else if (a === '--codemod-only') codemodOnly = true;
  else if (a === '--no-revert') noRevert = true;
  else if (a === '-h' || a === '--help') {
    console.log(
      `Usage: run-chai-assert-migration.mjs --list <file> [--axe-core-dir <path>] [--codemod-only] [--no-revert]`
    );
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${a}`);
    process.exit(2);
  }
}

if (!listFile) {
  console.error('--list <file> is required');
  process.exit(2);
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
  'migrate-chai-assert-to-vitest.ts'
);

// --- load the file list ---------------------------------------------------
const rawList = await fs.readFile(listFile, 'utf8');
const todoFiles = rawList
  .split('\n')
  .map(s => s.trim())
  .filter(Boolean)
  .map(p => (path.isAbsolute(p) ? p : path.resolve(resolvedAxeCoreDir, p)));

if (todoFiles.length === 0) {
  console.error(`run-chai-assert-migration: list ${listFile} is empty`);
  process.exit(1);
}

console.log(
  `run-chai-assert-migration: ${todoFiles.length} files (axe-core dir: ${resolvedAxeCoreDir})`
);

// =========================================================================
// PHASE A — codemod + rename
// =========================================================================

const renamed = []; // { todoPath, tsPath, originalSource }
const skipped = []; // { file, reason }

console.log('\n=== Phase A: codemod + rename ===');

for (const todoPath of todoFiles) {
  if (!todoPath.endsWith('.test.ts.todo')) {
    skipped.push({ file: todoPath, reason: 'not a .test.ts.todo file' });
    continue;
  }
  const stat = await fs.stat(todoPath).catch(() => null);
  if (!stat || !stat.isFile()) {
    skipped.push({ file: todoPath, reason: 'missing on disk' });
    continue;
  }

  const tsPath = todoPath.replace(/\.test\.ts\.todo$/, '.test.ts');
  const originalSource = await fs.readFile(todoPath, 'utf8');

  try {
    await execFileP('pnpm', ['exec', 'tsx', codemodScript, todoPath], {
      cwd: buildToolsRoot,
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (err) {
    skipped.push({
      file: todoPath,
      reason: `codemod failed: ${err.message?.split('\n')[0]}`
    });
    await fs.writeFile(todoPath, originalSource, 'utf8');
    continue;
  }

  // Rename to active extension.
  await fs.rename(todoPath, tsPath);
  renamed.push({ todoPath, tsPath, originalSource });
}

console.log(`  renamed: ${renamed.length}, skipped: ${skipped.length}`);

if (codemodOnly) {
  console.log('\n--codemod-only: leaving renamed files in place, skipping vitest run');
  process.exit(0);
}

// =========================================================================
// PHASE B — vitest run + per-file revert
// =========================================================================

console.log('\n=== Phase B: vitest run on the migrated batch ===');

const relTsPaths = renamed.map(r =>
  path.relative(resolvedAxeCoreDir, r.tsPath)
);

let vitestStdout = '';
let vitestStderr = '';
let vitestExitOk = false;

try {
  const child = await execFileP(
    'pnpm',
    [
      'run',
      'test:vitest:browser',
      '--',
      '--reporter=default',
      ...relTsPaths
    ],
    {
      cwd: resolvedAxeCoreDir,
      maxBuffer: 256 * 1024 * 1024,
      timeout: 600_000
    }
  );
  vitestStdout = child.stdout;
  vitestStderr = child.stderr;
  vitestExitOk = true;
} catch (err) {
  vitestStdout = (err.stdout || '').toString();
  vitestStderr = (err.stderr || '').toString();
}

// Persist the raw vitest log for the user.
const logPath = path.resolve(buildToolsRoot, 'logs', 'sprint4b-vitest.log');
await fs.mkdir(path.dirname(logPath), { recursive: true });
await fs.writeFile(
  logPath,
  `# vitest run\n# exit-ok: ${vitestExitOk}\n\n## stdout\n${vitestStdout}\n\n## stderr\n${vitestStderr}\n`,
  'utf8'
);
console.log(`  vitest log: ${logPath}`);

// Identify failed files. Vitest emits lines like:
//   `FAIL  |browser (chromium)| test/browser/core/utils/foo.test.ts`
// or `❯ |browser (chromium)| test/browser/core/utils/foo.test.ts (...)
//      ✗ ...` — both contain the path verbatim. We grep for the path and
// classify by FAIL/✗/Error markers nearby.
const combined = vitestStdout + '\n' + vitestStderr;

/** Parse a per-file pass/fail status from the vitest log. */
function fileStatus(relPath) {
  // Look for "FAIL ... <relPath>" or unhandled-error frames mentioning the
  // path.
  const failMarkers = [
    new RegExp(`FAIL[^\\n]*\\b${escapeRe(relPath)}\\b`),
    new RegExp(`Error[\\s\\S]{0,400}\\b${escapeRe(relPath)}\\b`),
    new RegExp(`✗[^\\n]*\\b${escapeRe(relPath)}\\b`)
  ];
  for (const re of failMarkers) {
    if (re.test(combined)) return 'fail';
  }
  return 'pass';
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pick a one-line blocker description from the vitest output. */
function classifyBlocker(relPath) {
  const escapedPath = escapeRe(relPath);
  // Find the first error context that mentions the file.
  const idx = combined.search(
    new RegExp(`(?:Error|FAIL|TypeError|ReferenceError|SyntaxError)[^\\n]{0,200}${escapedPath}|${escapedPath}[^\\n]{0,200}(?:Error|FAIL|TypeError|ReferenceError|SyntaxError)`)
  );
  let snippet = '';
  if (idx >= 0) {
    snippet = combined.slice(Math.max(0, idx - 200), idx + 800);
  } else {
    // Fall back to any context near the path.
    const i2 = combined.indexOf(relPath);
    if (i2 >= 0) snippet = combined.slice(Math.max(0, i2 - 200), i2 + 800);
  }
  const s = snippet.toLowerCase();
  if (/axe\.testutils/i.test(snippet))
    return 'unresolved axe.testUtils.* (Path-B helper migration)';
  if (/cannot destructure[^\\n]*axe\./.test(s))
    return 'unresolved axe.* destructure (Path-B helper migration)';
  if (/axe is not defined/.test(s))
    return 'axe global not resolved (Path-B import)';
  if (/axe\._tree|axe\._audit|axe\._memoizedfns|axe\._selectorData/i.test(snippet))
    return 'uses axe._* internal state (Path-B)';
  if (/cannot find module|failed to resolve/i.test(s))
    return 'unresolved import (Path-B)';
  if (/cannot set properties of null/i.test(s))
    return 'fixture lookup at module top level (Path-B test setup)';
  if (/timeout|timed out/i.test(s)) return 'test timeout';
  if (/redeclar/i.test(s)) return 'identifier redeclaration (Path-B)';
  if (/transform error|parse error|syntax error/i.test(s))
    return 'syntax/transform error after codemod';
  return 'test failure post-codemod (see logs)';
}

// Walk renamed files, decide pass/fail, revert failures.
const passed = [];
const reverted = []; // { file, reason }

for (const { todoPath, tsPath, originalSource } of renamed) {
  const relTs = path.relative(resolvedAxeCoreDir, tsPath);
  const status = fileStatus(relTs);

  if (status === 'pass') {
    passed.push(tsPath);
    continue;
  }

  if (noRevert) {
    reverted.push({ file: tsPath, reason: 'fail (revert disabled)' });
    continue;
  }

  // Revert: rename .ts → .ts.todo, restore source with restamped FIXME.
  const blocker = classifyBlocker(relTs);
  await fs.rename(tsPath, todoPath);
  await fs.writeFile(todoPath, restampFixme(originalSource, blocker), 'utf8');
  reverted.push({ file: todoPath, reason: blocker });
}

// =========================================================================
// Summary
// =========================================================================

console.log('\n--- run-chai-assert-migration summary ---');
console.log(`renamed:  ${renamed.length}`);
console.log(`passed:   ${passed.length}`);
console.log(`reverted: ${reverted.length}`);
console.log(`skipped:  ${skipped.length}`);

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
  console.log('\nskipped reasons:');
  for (const s of skipped) {
    console.log(`  ${s.file}: ${s.reason}`);
  }
}

// (FIXME_HEADER_RE / restampFixme moved to top of file for ordering.)
