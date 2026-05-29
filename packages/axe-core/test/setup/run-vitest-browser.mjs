#!/usr/bin/env node
// Phase 5 Sprint 5c — Vitest browser-mode birpc cascade workaround.
//
// Symptom: occasionally `vitest run --project browser` aborts mid-suite with
//   "Failed to run the test ..." → "[birpc] rpc is closed, cannot call \"createTesters\""
// triggered by a transient orchestrator WebSocket disconnect inside
// `@vitest/browser-playwright@4.1.5`. The "failing" test file is whichever
// file was about to be dispatched when the connection dropped — the file name
// varies across runs (invalidrole, aria-hidden-body, caption-faked, etc.),
// confirming the trigger is in the transport layer, not in any specific test.
//
// Reproduction recipe (no commits required):
//   for i in $(seq 1 5); do pnpm exec vitest run --project browser \
//     2>&1 | grep -E "Failed to run|Test Files"; done
// Empirical flake rate on macOS (Sprint 5c, Apr 26 2026): ~50% per run.
//
// Investigation log (also captured in PR description):
//   • Single test, 20 iterations: 20/20 pass — not a test-local bug.
//   • `--no-file-parallelism` alone: still flakes (3/4 runs failed).
//   • `--no-isolate` corrupts state across files (124 real test failures).
//   • `--shard=1/2 + 2/2` retried: still flakes.
//   • Debug `vitest:browser:api` shows the orchestrator's WebSocket dying
//     mid-suite, which propagates `$close()` to every pending tester RPC.
//   • Root cause lives in `@vitest/browser-playwright`'s page lifecycle
//     (`openBrowserPage` closes-and-reopens pages per session). NOT fixable
//     from this repo.
//
// Mitigation policy (intentionally narrow):
//   • Re-run the failing browser project up to MAX_RETRIES times if and only
//     if the run aborted with the cascade signature ("Failed to run the test"
//     or "[birpc] rpc is closed"). Any other failure (real assertion failure,
//     timeout, etc.) fails fast as before — we are NOT silently retrying real
//     bugs.
//   • MAX_RETRIES = 4 (so up to 5 attempts total). Empirical per-attempt
//     flake rate ≈ 50% on macOS; five attempts brings expected success to
//     ~96.9%. If all five cascade we surface exit code 1 so CI flags it for
//     human attention rather than looping forever. Worst-case wall time is
//     bounded at ~5×30s ≈ 2.5 min, which CI budgets accommodate.
//
// Phase 4 follow-up: when upstream Vitest 4.2+ ships orchestrator
// reconnection (or we migrate to Vitest 5), DELETE this wrapper and revert
// `test:vitest:browser` to a plain `vitest run --project browser`.
// Tracking note: this is a vendor flake, not a product bug; the zero-false-
// positive guarantee is unaffected because every test that ran passed.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(HERE, '..', '..');

// Detect the cascade signature in a captured run log. Both strings appear in
// every observed instance of the flake; we require at least one to retry,
// AND require that the run otherwise looked healthy (no real test failures).
const CASCADE_PATTERNS = [
  /Failed to run the test/,
  /\[birpc\] rpc is closed/,
  /Browser connection was closed while running tests/
];

// Real test failure markers — if any of these appear, do NOT retry.
const REAL_FAILURE_PATTERNS = [
  /\bTests\s+\d+ failed/,
  /\bTest Files\s+\d+ failed/
];

function looksLikeCascade(out) {
  if (REAL_FAILURE_PATTERNS.some(re => re.test(out))) {
    return false;
  }
  return CASCADE_PATTERNS.some(re => re.test(out));
}

function runOnce() {
  return new Promise(resolve => {
    const args = [
      'exec',
      'vitest',
      'run',
      '--project',
      'browser',
      ...process.argv.slice(2)
    ];
    const child = spawn('pnpm', args, {
      cwd: PKG_ROOT,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    let buffer = '';
    const tee = chunk => {
      const text = chunk.toString();
      buffer += text;
      process.stdout.write(text);
    };
    child.stdout.on('data', tee);
    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      buffer += text;
      process.stderr.write(text);
    });
    child.on('close', code => resolve({ code, output: buffer }));
  });
}

const MAX_RETRIES = 4;

let attempt = 0;
let lastCode = 1;
while (attempt <= MAX_RETRIES) {
  if (attempt > 0) {
    console.error(
      `\n[run-vitest-browser] Detected birpc cascade (vendor flake in @vitest/browser-playwright@4.1.5).\n` +
        `[run-vitest-browser] Retrying (attempt ${attempt + 1} of ${
          MAX_RETRIES + 1
        }) — see test/setup/run-vitest-browser.mjs for context.\n`
    );
  }
  const result = await runOnce();
  lastCode = result.code ?? 1;
  if (lastCode === 0) {
    process.exit(0);
  }
  if (!looksLikeCascade(result.output)) {
    // Real failure — fail fast, do not retry.
    process.exit(lastCode);
  }
  attempt += 1;
}

console.error(
  `\n[run-vitest-browser] All ${MAX_RETRIES + 1} attempts cascaded. ` +
    `Surfacing failure for human attention.\n`
);
process.exit(lastCode);
