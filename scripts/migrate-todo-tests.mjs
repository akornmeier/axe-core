#!/usr/bin/env node
// Codemod for converting `.test.ts.todo` files in
// `packages/axe-core/test/browser/{commons,core,rule-matches}/` into running
// `.test.ts` Vitest files.
//
// STRATEGY (Phase 3, Sprint 4, Task #3 — see brief §4):
//   The earlier Mocha→Vitest codemod converted assertions to `expect(...)`
//   but left `axe.commons.<mod>.<fn>`, `axe.utils.<fn>`, `axe.testUtils.<fn>`,
//   `assert.*`, etc. as Karma-style globals. This codemod:
//
//     1. Imports `vitest` globals (describe/it/expect/...) explicitly.
//     2. Imports `axe` and any used `testUtils` helpers from
//        `@helpers/check-helpers` (which loads the UMD bundle as a side
//        effect, populating `axe.commons` / `axe.utils`).
//     3. Replaces `axe.testUtils.<fn>` with the imported `<fn>` directly.
//        Keeps `axe.commons.X.Y` and `axe.utils.X` references AS-IS — they
//        resolve via the UMD-loaded `axe`. (Pure-ESM-direct imports for
//        commons/utils are blocked by a circular ESM-load order between
//        `lib/standards/` and `lib/commons/`. Path-B Task #4 unblocks that
//        separately. Until then, this transitional shape matches the
//        canonical `test/browser/rule-matches/heading-matches.test.ts`.)
//     4. Replaces `var fixture = document.getElementById('fixture');`
//        with a per-test fixture handle wired via `beforeEach` (matches
//        `test/browser/checks/aria/aria-busy.test.ts` shape).
//     5. Detects unrecoverable blockers (`axe._tree`, `axe._audit`,
//        `axe.run()`, sinon, chai-style `assert.*`, unknown testUtils
//        helpers like `createNestedShadowDom`) and stamps a FIXME header
//        on the original `.todo` instead of converting.
//
// USAGE:
//   node /tmp/migrate-todo-tests.mjs <file…>
//   node /tmp/migrate-todo-tests.mjs --all
//   node /tmp/migrate-todo-tests.mjs --dir <relative-or-absolute-path>
//   --no-verify : skip per-file `pnpm run test:vitest` validation step.
//   --revert-failures : after a bulk run, run the full suite once and
//     revert the `.test.ts` files whose imports / assertions failed.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const PKG = '/Users/tonykornmeier/Code/axe-core/packages/axe-core';

// Helpers exported by `_helpers/check-helpers.ts`:
const TEST_UTILS_HELPERS = new Set([
  'checkSetup',
  'queryFixture',
  'fixtureSetup',
  'flatTreeSetup',
  'shadowCheckSetup',
  'queryShadowFixture',
  'createMockCheckContext',
  'getCheckEvaluate',
  'getCheckEvaluateESM',
  'shadowSupport',
  'axe',
  'checks'
]);

// --- Blocker detection ----------------------------------------------------

function detectBlockers(content) {
  const blockers = [];
  if (/\baxe\._tree\b/.test(content))
    blockers.push('uses axe._tree (internal state)');
  if (/\baxe\._audit\b/.test(content))
    blockers.push('uses axe._audit (internal state)');
  if (/\baxe\._memoizedFns\b/.test(content))
    blockers.push(
      'uses axe._memoizedFns (deprecated registry — see Sprint 4 Task #1)'
    );
  if (/\baxe\.run\s*\(/.test(content))
    blockers.push('uses axe.run() (full audit — out of scope)');
  if (/\bsinon\b/.test(content))
    blockers.push('uses sinon (replace with vi.fn / vi.spyOn)');
  if (/\bassert\.[a-zA-Z]/.test(content))
    blockers.push("uses chai-style 'assert.*' (codemod did not convert)");
  if (/\bassert\s*\(/.test(content))
    blockers.push("uses chai-style 'assert(...)' (codemod did not convert)");
  if (/\baxe\.testUtils\.createNestedShadowDom\b/.test(content))
    blockers.push(
      'uses axe.testUtils.createNestedShadowDom (not in @helpers/check-helpers)'
    );
  // Mocha-style `done` callback: Vitest deprecates this — needs async/await rewrite.
  if (/\bfunction\s*\(\s*done\s*\)/.test(content) || /\(\s*done\s*\)\s*=>/.test(content))
    blockers.push("uses Mocha 'done' callback (Vitest expects async/await)");

  // Unknown testUtils helpers
  for (const m of content.matchAll(/\baxe\.testUtils\.([a-zA-Z_$][\w$]*)/g)) {
    if (!TEST_UTILS_HELPERS.has(m[1]) && m[1] !== 'createNestedShadowDom') {
      blockers.push(`uses unknown axe.testUtils.${m[1]} helper`);
    }
  }
  // Destructure form: const { foo, bar } = axe.testUtils;
  for (const m of content.matchAll(
    /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*axe\.testUtils/g
  )) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/[:\s]+/)[0];
      if (
        name &&
        !TEST_UTILS_HELPERS.has(name) &&
        name !== 'createNestedShadowDom'
      ) {
        blockers.push(`uses unknown axe.testUtils.${name} helper (destructure)`);
      }
    }
  }
  return [...new Set(blockers)];
}

// --- Reference extraction -------------------------------------------------

function extractTestUtilsRefs(content) {
  const refs = new Set();
  for (const m of content.matchAll(/\baxe\.testUtils\.([a-zA-Z_$][\w$]*)/g)) {
    refs.add(m[1]);
  }
  for (const m of content.matchAll(
    /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*axe\.testUtils/g
  )) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/[:\s]+/)[0];
      if (name) refs.add(name);
    }
  }
  return [...refs];
}

function extractVitestGlobals(content) {
  const globals = new Set();
  if (/\bdescribe\s*[.(]/.test(content)) globals.add('describe');
  if (/\bit\s*[.(]/.test(content)) globals.add('it');
  if (/\bexpect\s*\(/.test(content)) globals.add('expect');
  if (/\bbeforeEach\s*\(/.test(content)) globals.add('beforeEach');
  if (/\bafterEach\s*\(/.test(content)) globals.add('afterEach');
  if (/\bbeforeAll\s*\(/.test(content)) globals.add('beforeAll');
  if (/\bafterAll\s*\(/.test(content)) globals.add('afterAll');
  // Mocha aliases `before(...)` / `after(...)` (without -All) → beforeAll/afterAll.
  if (/(?<![A-Za-z_$])before\s*\(/.test(content)) globals.add('beforeAll');
  if (/(?<![A-Za-z_$])after\s*\(/.test(content)) globals.add('afterAll');
  if (/\bvi\s*\./.test(content)) globals.add('vi');
  return [...globals];
}

// Returns true if `body` references `axe` at all (either `axe.X` or bare).
function usesAxe(body) {
  return /\baxe\b/.test(body);
}

// --- Transformation -------------------------------------------------------

function migrate(content) {
  let body = content;

  // 1. Detect blockers up front.
  const blockers = detectBlockers(body);
  if (blockers.length) {
    return { ok: false, reasons: blockers };
  }

  // 2. Extract testUtils refs (these become named imports).
  const testUtilsRefs = extractTestUtilsRefs(body);

  // 3. Rewrite `axe.testUtils.<fn>` → `<fn>` (so the imported name resolves).
  body = body.replace(/\baxe\.testUtils\.([a-zA-Z_$][\w$]*)/g, (_, fn) => fn);
  // Drop `var fn = fn;` aliases that became no-ops after the rewrite above.
  body = body.replace(
    /^\s*(?:var|let|const)\s+([a-zA-Z_$][\w$]*)\s*=\s*\1\s*;\s*$/gm,
    ''
  );
  // Drop `const { a, b } = ;` (left over from `… = axe.testUtils;` destructure).
  // The destructured names are now imported, so the destructure is redundant.
  body = body.replace(
    /^\s*(?:var|let|const)\s*\{[^}]+\}\s*=\s*axe\.testUtils\s*;\s*$/gm,
    ''
  );

  // 4. Replace top-level `var fixture = document.getElementById('fixture')`
  //    with a per-test handle wired via `beforeEach`.
  const fixtureRegex =
    /^(\s*)(?:var|let|const)\s+fixture\s*=\s*document\.getElementById\(\s*['"]fixture['"]\s*\)\s*;?\s*$/m;
  let needsFixtureHandle = false;
  if (fixtureRegex.test(body)) {
    needsFixtureHandle = true;
    body = body.replace(fixtureRegex, '');
  }

  // 5. Build the import header.
  const vitestNames = new Set(extractVitestGlobals(body));
  if (needsFixtureHandle) vitestNames.add('beforeEach');

  const helperNames = new Set();
  // Import `axe` from helpers if the file references `axe.commons` / `axe.utils`
  // / bare `axe.<x>` patterns. Don't auto-import if the file ONLY used
  // `axe.testUtils.<fn>` (those got replaced in step 3).
  const stillUsesAxe =
    /\baxe\.commons\b/.test(body) ||
    /\baxe\.utils\b/.test(body) ||
    /\baxe\.setup\b/.test(body) ||
    /\baxe\.teardown\b/.test(body) ||
    /\baxe\.configure\b/.test(body) ||
    /\baxe\.reset\b/.test(body) ||
    /\baxe\.log\b/.test(body) ||
    /\baxe\.version\b/.test(body) ||
    /\baxe\.plugins\b/.test(body) ||
    /\baxe\.cleanup\b/.test(body) ||
    /\baxe\.runVirtualRule\b/.test(body) ||
    /\baxe\.finishRun\b/.test(body) ||
    /\baxe\.runPartial\b/.test(body) ||
    /\baxe\.getRules\b/.test(body) ||
    /\baxe\.frameMessenger\b/.test(body);

  if (stillUsesAxe) helperNames.add('axe');
  for (const name of testUtilsRefs) {
    if (TEST_UTILS_HELPERS.has(name)) helperNames.add(name);
  }

  const importLines = [];
  const sortedVitest = [...vitestNames].sort();
  if (sortedVitest.length) {
    importLines.push(`import { ${sortedVitest.join(', ')} } from 'vitest';`);
  }
  const sortedHelpers = [...helperNames].sort();
  if (sortedHelpers.length) {
    importLines.push(
      `import { ${sortedHelpers.join(', ')} } from '@helpers/check-helpers';`
    );
  }

  // 6. Inject the per-test fixture wiring inside the first describe block.
  if (needsFixtureHandle) {
    const fixtureSnippet =
      "  let fixture: HTMLElement;\n" +
      '  beforeEach(() => {\n' +
      "    fixture = document.getElementById('fixture') as HTMLElement;\n" +
      '  });\n\n';
    body = body.replace(
      /(\bdescribe\s*\([^)]*?,\s*(?:function\s*\(\s*\)\s*|\(\s*\)\s*=>\s*)?\{\s*\n?)/,
      (m) => m + fixtureSnippet
    );
  }

  // 7. Tidy whitespace.
  body = body.replace(/\n{3,}/g, '\n\n').replace(/^\s*\n+/, '');

  // 8. Final guards.
  //    8a. Stray bare `axe` reference without an `axe` import → reject.
  if (!sortedHelpers.includes('axe') && /\baxe\b/.test(body)) {
    return {
      ok: false,
      reasons: ['unresolved bare `axe` reference after rewrite']
    };
  }
  //    8b. Detect `var X = X.something` patterns where X collides with one
  //        of our imports (e.g. `var shadowSupport = shadowSupport.v1`).
  //        Those create a TDZ error and must be reworked by hand.
  for (const helperName of sortedHelpers) {
    const collide = new RegExp(
      `(?:var|let|const)\\s+${helperName}\\b[^=]*=\\s*${helperName}\\b`,
      'm'
    );
    if (collide.test(body)) {
      return {
        ok: false,
        reasons: [
          `name collision: redeclares '${helperName}' which is imported from @helpers/check-helpers`
        ]
      };
    }
  }
  //    8c. Detect `let X = axe.utils.X` patterns that leave a residual
  //        `axe` reference but we should still be OK (axe is imported).
  //        No action.

  const code =
    importLines.join('\n') + (importLines.length ? '\n\n' : '') + body;
  return { ok: true, code: code.endsWith('\n') ? code : code + '\n' };
}

// --- Main -----------------------------------------------------------------

async function walkTodos(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkTodos(full)));
    else if (e.isFile() && full.endsWith('.test.ts.todo')) out.push(full);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error(
      'Usage: node migrate-todo-tests.mjs [--no-verify] <file…> | --all | --dir <path>'
    );
    process.exit(1);
  }

  let runVerify = false; // off by default — bulk runs use --revert-failures.
  let revertFailures = false;
  const filtered = args.filter((a) => {
    if (a === '--no-verify') {
      runVerify = false;
      return false;
    }
    if (a === '--verify') {
      runVerify = true;
      return false;
    }
    if (a === '--revert-failures') {
      revertFailures = true;
      return false;
    }
    return true;
  });

  let files = [];
  if (filtered[0] === '--all') {
    files = await walkTodos(path.join(PKG, 'test/browser'));
  } else if (filtered[0] === '--dir') {
    const dir = path.isAbsolute(filtered[1])
      ? filtered[1]
      : path.join(PKG, filtered[1]);
    files = await walkTodos(dir);
  } else {
    files = filtered.map((f) =>
      path.isAbsolute(f) ? f : path.join(PKG, f)
    );
  }

  const stats = { migrated: [], blocked: [] };

  for (const todoPath of files) {
    const tsPath = todoPath.replace(/\.todo$/, '');
    let content;
    try {
      content = await fs.readFile(todoPath, 'utf8');
    } catch (e) {
      console.error(`SKIP (cannot read) ${todoPath}: ${e.message}`);
      continue;
    }

    // Skip already-stamped FIXME blockers — they were rejected in a prior run.
    if (content.startsWith('// FIXME(phase-3-sprint-4b)')) {
      console.log(`SKIP     ${path.relative(PKG, todoPath)} (already stamped)`);
      continue;
    }

    const result = migrate(content);
    if (result.ok) {
      await fs.writeFile(tsPath, result.code, 'utf8');
      await fs.unlink(todoPath);

      if (runVerify) {
        const ok = await verifyOrRevert(todoPath, tsPath, content);
        if (!ok) {
          stats.blocked.push({ path: todoPath, reason: 'vitest verify failed' });
          console.log(
            `REVERTED ${path.relative(PKG, todoPath)}: vitest verify failed`
          );
          continue;
        }
      }
      stats.migrated.push(tsPath);
      console.log(`MIGRATED ${path.relative(PKG, tsPath)}`);
    } else {
      const reason = result.reasons.join('; ');
      const headerLine = `// FIXME(phase-3-sprint-4b): codemod blocker — ${reason}\n`;
      const stamped = content.startsWith('// FIXME(phase-3-sprint-4b)')
        ? content
        : headerLine + content;
      await fs.writeFile(todoPath, stamped, 'utf8');
      stats.blocked.push({ path: todoPath, reason });
      console.log(`BLOCKED  ${path.relative(PKG, todoPath)}: ${reason}`);
    }
  }

  if (revertFailures && stats.migrated.length) {
    await revertSuiteFailures(stats);
  }

  console.log(
    `\n--- Summary ---\nMigrated: ${stats.migrated.length}\nBlocked:  ${stats.blocked.length}`
  );
}

async function verifyOrRevert(todoPath, tsPath, originalContent) {
  const { spawnSync } = await import('node:child_process');
  const rel = path.relative(PKG, tsPath);
  const res = spawnSync(
    'pnpm',
    [
      'run',
      '--silent',
      'test:vitest',
      '--',
      rel,
      '--reporter=basic',
      '--no-color'
    ],
    { cwd: PKG, encoding: 'utf8' }
  );
  if (res.status === 0) return true;

  const tail = (res.stdout || '') + (res.stderr || '');
  const errLine =
    tail
      .split('\n')
      .map((l) => l.trim())
      .find((l) =>
        /Error|FAIL|ReferenceError|TypeError|SyntaxError/.test(l)
      ) ?? 'vitest run failed';
  const reason = errLine.replace(/\s+/g, ' ').slice(0, 200);
  const headerLine = `// FIXME(phase-3-sprint-4b): codemod-output failed vitest — ${reason}\n`;
  const stamped = originalContent.startsWith('// FIXME(phase-3-sprint-4b)')
    ? originalContent
    : headerLine + originalContent;
  await fs.writeFile(todoPath, stamped, 'utf8');
  await fs.unlink(tsPath);
  return false;
}

/**
 * Run the full Vitest suite once, parse the failed test files from the
 * output, and revert each failed `.test.ts` back to `.test.ts.todo` with
 * a stamped FIXME reason. Stash original `.todo` contents from
 * `stats.migrated` mapping (we re-read from git).
 */
async function revertSuiteFailures(stats) {
  const { spawnSync } = await import('node:child_process');
  console.log('\n--- Running full vitest suite to detect failures... ---');
  const res = spawnSync(
    'pnpm',
    [
      'run',
      '--silent',
      'test:vitest',
      '--',
      '--reporter=basic',
      '--no-color'
    ],
    { cwd: PKG, encoding: 'utf8' }
  );
  const out = (res.stdout || '') + (res.stderr || '');
  // Failed file paths typically appear in lines like:
  //   FAIL  |browser (chromium)| test/browser/.../foo.test.ts [ test/.../foo.test.ts ]
  // OR:
  //   ❯ |browser (chromium)| test/browser/.../foo.test.ts (3 tests | 3 failed)
  const failed = new Set();
  for (const line of out.split('\n')) {
    const m =
      line.match(/(test\/browser\/[^\s]+\.test\.ts)\s+\[/) ??
      line.match(/(test\/browser\/[^\s]+\.test\.ts)\s+\(/);
    if (m) failed.add(m[1]);
  }
  console.log(`--- Detected ${failed.size} failed test file(s) ---`);

  for (const rel of failed) {
    const tsPath = path.join(PKG, rel);
    if (!stats.migrated.includes(tsPath)) {
      // Not one of ours — leave alone.
      continue;
    }
    // Restore original .todo from git, then re-read it for stamping.
    const originalTodo = tsPath + '.todo';
    spawnSync('git', ['checkout', '--', path.relative(PKG, originalTodo)], {
      cwd: PKG
    });
    let originalContent = '';
    try {
      originalContent = await fs.readFile(originalTodo, 'utf8');
    } catch {
      console.error(`Could not restore ${originalTodo} from git`);
      continue;
    }
    // Find a 1-line failure reason from the output (search for the file name).
    const reasonLine =
      out
        .split('\n')
        .find((l) => l.includes(rel) && /Error|FAIL/.test(l)) ??
      'vitest run failed';
    const reason = reasonLine.replace(/\s+/g, ' ').slice(0, 200);
    const headerLine = `// FIXME(phase-3-sprint-4b): codemod-output failed vitest — ${reason}\n`;
    const stamped = originalContent.startsWith('// FIXME(phase-3-sprint-4b)')
      ? originalContent
      : headerLine + originalContent;
    await fs.writeFile(originalTodo, stamped, 'utf8');
    // Remove the failing .test.ts.
    try {
      await fs.unlink(tsPath);
    } catch {
      // ignore
    }
    // Move from migrated to blocked.
    stats.migrated = stats.migrated.filter((p) => p !== tsPath);
    stats.blocked.push({ path: originalTodo, reason });
    console.log(`REVERTED ${rel}: ${reason}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
