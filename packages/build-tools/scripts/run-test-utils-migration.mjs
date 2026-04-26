#!/usr/bin/env node
/**
 * run-test-utils-migration.mjs
 *
 * Phase 3 Sprint 4b #1 runner. Drives the
 * `migrate-test-utils-destructure` codemod across every `.test.ts.todo`
 * file whose Sprint-4b FIXME header flags a testUtils blocker. Per file,
 * the pipeline is:
 *
 *   1. Identify the file set. We grep for the four blocker phrasings the
 *      previous codemod stamped into FIXME headers (default behaviour),
 *      OR consume an explicit `--list <file>` if one is supplied.
 *   2. Strip the leading `// FIXME(phase-3-sprint-4b): …` line.
 *   3. Run the codemod against the stripped source. If the codemod returns
 *      `skipped: true`, leave the file as `.todo` and stamp a refined FIXME
 *      naming the offending helper(s).
 *   4. If the codemod rewrote the file, rename `.test.ts.todo` →
 *      `.test.ts`, then run `pnpm --filter axe-core test:vitest <relPath>`.
 *      Pass: keep the rename. Fail: rename back to `.todo` and restore a
 *      refined FIXME header that quotes the first stderr line so the
 *      blocker is discoverable.
 *
 * The per-file vitest invocation is intentional — Sprint 4b #1 expects the
 * post-codemod pass-rate to be high enough that paying the per-file
 * Playwright startup is still net-fast. If we discover the rate is low we
 * can switch to batched runs (mirroring `run-chai-assert-migration.mjs`)
 * later.
 *
 * Summary line at exit:
 *
 *   migrate-test-utils-destructure: X/Y files flipped, Z skipped, W reverted
 *
 * Usage:
 *   node scripts/run-test-utils-migration.mjs
 *   node scripts/run-test-utils-migration.mjs --list <file>
 *   node scripts/run-test-utils-migration.mjs --axe-core-dir <path> --no-vitest
 *   node scripts/run-test-utils-migration.mjs --dry-run
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The literal Sprint 4b FIXME header line — one regex covers any phrasing. */
const FIXME_HEADER_RE = /^\/\/\s*FIXME\(phase-3-sprint-4b\):[^\n]*\n/;

/** Phrases the prior codemod stamped that flag a testUtils blocker. */
const BLOCKER_PHRASES = [
  'unresolved axe.testUtils',
  'testUtils helper not exposed',
  'destructures.*from axe.testUtils',
  'unresolved bare `axe` reference'
];

/**
 * Stamp a refined FIXME header onto the source. The runner replaces any
 * existing header with this one — keeping the file discoverable AFTER the
 * skip/revert decision.
 */
function refineFixme(originalSource, blocker) {
  const stripped = originalSource.replace(FIXME_HEADER_RE, '');
  return `// FIXME(phase-3-sprint-4b): codemod blocker — ${blocker}\n${stripped}`;
}

/** Drop the existing FIXME header from a source string. */
function stripFixmeHeader(source) {
  return source.replace(FIXME_HEADER_RE, '');
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let listFile = null;
let axeCoreDir = null;
let runVitest = true;
let dryRun = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--list') listFile = argv[++i];
  else if (a === '--axe-core-dir') axeCoreDir = argv[++i];
  else if (a === '--no-vitest') runVitest = false;
  else if (a === '--dry-run') {
    dryRun = true;
    runVitest = false;
  } else if (a === '-h' || a === '--help') {
    console.log(
      'Usage: run-test-utils-migration.mjs [--list <file>] [--axe-core-dir <path>] [--no-vitest] [--dry-run]'
    );
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${a}`);
    process.exit(2);
  }
}

// ---------------------------------------------------------------------------
// Locate package roots
// ---------------------------------------------------------------------------

const buildToolsRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(buildToolsRoot, '..', '..');
const resolvedAxeCoreDir = axeCoreDir
  ? path.resolve(axeCoreDir)
  : path.resolve(repoRoot, 'packages', 'axe-core');

const codemodScript = path.resolve(
  buildToolsRoot,
  'src',
  'codemods',
  'migrate-test-utils-destructure.ts'
);

// ---------------------------------------------------------------------------
// Resolve the candidate file list.
// ---------------------------------------------------------------------------

async function listCandidatesViaGrep() {
  // Use `grep -rln` over the full set of blocker phrasings. We OR them with
  // `-E` and one combined alternation pattern. The runner doesn't care about
  // shell ordering — it dedupes via Set.
  const browserDir = path.resolve(resolvedAxeCoreDir, 'test', 'browser');
  const pattern = BLOCKER_PHRASES.join('\\|');
  try {
    const { stdout } = await execFileP(
      'grep',
      ['-rln', pattern, browserDir],
      { maxBuffer: 32 * 1024 * 1024 }
    );
    return [
      ...new Set(
        stdout
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
          .filter(p => p.endsWith('.test.ts.todo'))
      )
    ];
  } catch (err) {
    // grep exits non-zero when there are no matches — that's fine, treat as
    // an empty list. Any other error is fatal.
    if (err && err.code === 1 && (!err.stdout || err.stdout === '')) return [];
    throw err;
  }
}

let todoFiles;
if (listFile) {
  const raw = await fs.readFile(listFile, 'utf8');
  todoFiles = raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => (path.isAbsolute(p) ? p : path.resolve(resolvedAxeCoreDir, p)));
} else {
  todoFiles = await listCandidatesViaGrep();
}

if (todoFiles.length === 0) {
  console.log('migrate-test-utils-destructure: no candidate files found.');
  process.exit(0);
}

console.log(
  `migrate-test-utils-destructure: ${todoFiles.length} candidate file(s) (axe-core dir: ${resolvedAxeCoreDir})`
);

// ---------------------------------------------------------------------------
// Per-file pipeline
// ---------------------------------------------------------------------------

const flipped = []; // .test.ts paths that survived vitest
const skipped = []; // { file, reason } (left as .todo)
const reverted = []; // { file, reason } (rewritten then reverted)
const codemodErrors = []; // { file, reason }

for (const todoPath of todoFiles) {
  if (!todoPath.endsWith('.test.ts.todo')) {
    codemodErrors.push({ file: todoPath, reason: 'not a .test.ts.todo file' });
    continue;
  }
  const stat = await fs.stat(todoPath).catch(() => null);
  if (!stat || !stat.isFile()) {
    codemodErrors.push({ file: todoPath, reason: 'missing on disk' });
    continue;
  }

  const tsPath = todoPath.replace(/\.test\.ts\.todo$/, '.test.ts');
  const originalSource = await fs.readFile(todoPath, 'utf8');

  // 1. Strip the FIXME header and run the codemod against the in-memory
  //    stripped source. We do this through a child process invocation so we
  //    inherit the same module resolution as the chai codemod runner.
  const tmpPath = todoPath + '.codemod-input.ts';
  const stripped = stripFixmeHeader(originalSource);
  await fs.writeFile(tmpPath, stripped, 'utf8');

  let codemodStdout = '';
  let codemodStderr = '';
  let codemodExit = 0;
  try {
    const { stdout, stderr } = await execFileP(
      'pnpm',
      ['exec', 'tsx', codemodScript, '--emit-skip', tmpPath],
      { cwd: buildToolsRoot, maxBuffer: 32 * 1024 * 1024 }
    );
    codemodStdout = stdout;
    codemodStderr = stderr;
  } catch (err) {
    codemodStdout = (err.stdout || '').toString();
    codemodStderr = (err.stderr || '').toString();
    codemodExit = typeof err.code === 'number' ? err.code : 1;
  }

  // Parse skip-signal: the codemod emits `SKIP: <reason>` and exits 2.
  const skipMatch = codemodStdout.match(/^SKIP:\s*(.+)$/m);
  if (skipMatch || codemodExit === 2) {
    const reason =
      (skipMatch ? skipMatch[1] : 'unknown skip reason').trim() || 'unknown';
    skipped.push({ file: todoPath, reason });
    if (!dryRun) {
      await fs.writeFile(
        todoPath,
        refineFixme(originalSource, reason),
        'utf8'
      );
    }
    await fs.rm(tmpPath, { force: true });
    continue;
  }

  if (codemodExit !== 0) {
    codemodErrors.push({
      file: todoPath,
      reason: `codemod exit=${codemodExit}: ${codemodStderr.split('\n')[0] || codemodStdout.split('\n')[0] || 'unknown'}`
    });
    await fs.rm(tmpPath, { force: true });
    continue;
  }

  // The codemod rewrote `tmpPath` in place. Read it back.
  const rewritten = await fs.readFile(tmpPath, 'utf8');
  await fs.rm(tmpPath, { force: true });

  if (dryRun) {
    flipped.push(tsPath);
    continue;
  }

  // 2. Write the rewritten source to `tsPath` and remove the `.todo`.
  await fs.writeFile(tsPath, rewritten, 'utf8');
  await fs.rm(todoPath, { force: true });

  if (!runVitest) {
    flipped.push(tsPath);
    continue;
  }

  // 3. Run vitest against the single migrated file. We target `:browser`
  //    explicitly — running `test:vitest` with no project filter pulls in
  //    the typecheck project as well, which emits noisy banner output and
  //    has nothing to verify for these files.
  const relTs = path.relative(resolvedAxeCoreDir, tsPath);
  let vitestStdout = '';
  let vitestStderr = '';
  let vitestOk = false;
  try {
    const { stdout, stderr } = await execFileP(
      'pnpm',
      ['--filter', 'axe-core', 'run', 'test:vitest:browser', relTs],
      {
        cwd: repoRoot,
        maxBuffer: 64 * 1024 * 1024,
        timeout: 180_000
      }
    );
    vitestStdout = stdout;
    vitestStderr = stderr;
    vitestOk = true;
  } catch (err) {
    vitestStdout = (err.stdout || '').toString();
    vitestStderr = (err.stderr || '').toString();
  }

  if (vitestOk) {
    flipped.push(tsPath);
    continue;
  }

  // 4. Revert: rename `.ts` back to `.todo` and restore source with refined FIXME.
  // Pull the first *substantive* error line. Vitest 4 prints lots of banner
  // chatter (project headers, "Testing types …", "Breaking changes might
  // not follow SemVer", port-in-use retries) before the actual error, so we
  // search across stdout AND stderr for the first line that looks like an
  // error frame. Heuristic: `Caused by:` or a `Error|TypeError|ReferenceError`
  // or a `FAIL` marker — falling back to the first non-noise line.
  const combined = vitestStdout + '\n' + vitestStderr;
  const isNoise = l =>
    !l.trim() ||
    /^Testing types/.test(l) ||
    /^Breaking changes might/.test(l) ||
    /^Port \d+ is in use/.test(l) ||
    /^\s*include:/.test(l) ||
    /^\s*exclude:/.test(l) ||
    /^\s*\|.*\|\s*$/.test(l) ||
    /^\s*RUN /.test(l) ||
    /^\s*>\s/.test(l) ||
    /^\s*[─━⎯]+/.test(l) ||
    /ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL/.test(l) ||
    /^\s*Exit status/.test(l);
  const errorRe = /(?:Caused by:|^FAIL\b|^\s*ReferenceError|^\s*TypeError|^\s*SyntaxError|^\s*Error:|^\s*AssertionError)/;
  const lines = combined.split('\n');
  const errorLine =
    lines.find(l => !isNoise(l) && errorRe.test(l)) ||
    lines.find(l => !isNoise(l)) ||
    'unknown vitest failure';
  const blocker = `unresolved axe.testUtils.* (Path-B helper migration); post-codemod failure: ${errorLine.trim().slice(0, 200)}`;
  await fs.writeFile(todoPath, refineFixme(originalSource, blocker), 'utf8');
  await fs.rm(tsPath, { force: true });
  reverted.push({ file: todoPath, reason: blocker });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n--- migrate-test-utils-destructure summary ---');
console.log(
  `migrate-test-utils-destructure: ${flipped.length}/${todoFiles.length} files flipped, ${skipped.length} skipped, ${reverted.length} reverted`
);

if (skipped.length > 0) {
  console.log('\nskipped:');
  const byReason = new Map();
  for (const s of skipped) {
    byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
  }
  for (const [reason, count] of [...byReason.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${count}× ${reason}`);
  }
}

if (reverted.length > 0) {
  console.log('\nreverted:');
  for (const r of reverted) {
    console.log(`  ${path.basename(r.file)}: ${r.reason}`);
  }
}

if (codemodErrors.length > 0) {
  console.log('\ncodemod errors:');
  for (const e of codemodErrors) {
    console.log(`  ${e.file}: ${e.reason}`);
  }
}

process.exit(codemodErrors.length > 0 ? 1 : 0);
