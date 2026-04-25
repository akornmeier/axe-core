#!/usr/bin/env node
// Post-process codemod output for `test/checks/` → `test/browser/checks/`.
//
// The Mocha→Vitest codemod (packages/build-tools/src/codemods/migrate-mocha-to-vitest.ts)
// rewrites assertions and Sinon spies but leaves the legacy `axe.testUtils.*`
// global references and the Mocha-style `function () {}` callbacks intact.
// This script bridges that gap for the Sprint 3 task #10 bulk migration:
//
//   - strips `'use strict'` (codemod gap noted in Sprint 3 brief §4)
//   - rewrites `axe.testUtils.{MockCheckContext,checkSetup,queryFixture,
//     fixtureSetup,getCheckEvaluate}` to the named helpers exported from
//     `test/browser/_helpers/check-helpers.ts`
//   - deletes legacy local re-declarations like
//     `var checkSetup = axe.testUtils.checkSetup;` (now provided by the
//     imported helper) — these would otherwise become self-shadowing
//     `const X = X` after rewrite
//   - converts `var` test-scope locals to `const` where safe
//   - converts Mocha `function () {}` callbacks to arrows for the standard
//     test hooks (describe / it / before* / after*)
//   - injects the appropriate `import` statement at the top of each file
//     based on which helpers are actually used
//   - tags `.apply(ctx, params)` calls with `params as any` so the legacy
//     `[node, options, virtualNode]` tuple type-checks against
//     `getCheckEvaluate`'s wrapped signature
//
// The script is idempotent: running it twice produces identical output.
//
// Usage:
//   node scripts/post-migrate-checks.mjs 'packages/axe-core/test/browser/checks/**/*.test.ts'

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';

const HELPER_NAMES = [
  'createMockCheckContext',
  'checkSetup',
  'queryFixture',
  'fixtureSetup',
  'getCheckEvaluate',
  'flatTreeSetup',
  'shadowCheckSetup',
  'shadowSupport',
  'checks',
  'axe'
];

// Repo-anchored absolute path to the canonical helpers file.
const HELPERS_FILE = path.resolve(
  'packages/axe-core/test/browser/_helpers/check-helpers'
);

function transform(src, fileAbsPath) {
  // Skip files that already use the ESM-direct path (hand-authored). Those
  // import an evaluator from `lib/checks/` and use `getCheckEvaluateESM` —
  // re-running the post-processor over them would inject the legacy
  // `getCheckEvaluate` / `checks` helpers, breaking the imports.
  if (
    /from ['"][^'"]*lib\/checks\//.test(src) ||
    /\bgetCheckEvaluateESM\b/.test(src)
  ) {
    return src;
  }

  let out = src;

  // 1. Strip 'use strict'
  out = out.replace(/^\s*['"]use strict['"];?\s*\n/gm, '');

  // 2. Delete legacy local re-declarations of helper names sourced from the
  //    `axe.testUtils` global. After we add the named import, keeping these
  //    produces a self-shadowing `const X = X` that breaks the test file.
  //    Match three forms:
  //      (var|let|const) <name> = axe.testUtils.<name>;
  //      (var|let|const) <name> = <name>;       (residue from a buggy first pass)
  //      (var|let|const) { <name>, <name>, ... } = axe.testUtils;
  out = out.replace(
    /^\s*(?:var|let|const)\s+(checkSetup|queryFixture|fixtureSetup|getCheckEvaluate|flatTreeSetup|shadowCheckSetup|shadowSupport|queryShadowFixture)\s*=\s*axe\.testUtils\.\1(?:\.\w+)?\s*;?\s*\n/gm,
    ''
  );
  out = out.replace(
    /^\s*(?:var|let|const)\s+(checkSetup|queryFixture|fixtureSetup|getCheckEvaluate|flatTreeSetup|shadowCheckSetup|shadowSupport|queryShadowFixture)\s*=\s*\1\s*;?\s*\n/gm,
    ''
  );
  // Legacy `var shadowSupported = axe.testUtils.shadowSupport.v1;` — rewrite
  // to `const shadowSupported = shadowSupport.v1;` (helper is exported).
  out = out.replace(
    /^(\s*)(?:var|let|const)\s+shadowSupported\s*=\s*axe\.testUtils\.shadowSupport\.v1\s*;?/gm,
    '$1const shadowSupported = shadowSupport.v1;'
  );
  out = out.replace(
    /^\s*(?:var|let|const)\s+\{\s*[\w,\s]+\s*\}\s*=\s*axe\.testUtils\s*;?\s*\n/gm,
    ''
  );

  // 3. Rewrite axe.testUtils.* references. Allow whitespace/newlines between
  //    `axe.testUtils` and the method name (the codemod often wraps long
  //    chains across multiple lines).
  const ws = '\\s*';
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}MockCheckContext\\(\\)`, 'g'),
    'createMockCheckContext()'
  );
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}queryFixture\\b`, 'g'),
    'queryFixture'
  );
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}checkSetup\\b`, 'g'),
    'checkSetup'
  );
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}fixtureSetup\\b`, 'g'),
    'fixtureSetup'
  );
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}getCheckEvaluate\\(`, 'g'),
    'getCheckEvaluate('
  );
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}flatTreeSetup\\b`, 'g'),
    'flatTreeSetup'
  );
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}shadowCheckSetup\\b`, 'g'),
    'shadowCheckSetup'
  );
  out = out.replace(
    new RegExp(`\\baxe\\.testUtils${ws}\\.${ws}shadowSupport\\b`, 'g'),
    'shadowSupport'
  );

  // 4. `var` → `const` rewrite. Skipped intentionally: a regex pass cannot
  //    detect when `var X = ...; X = ...;` reassigns later in the same
  //    scope, which would produce a `const`-redeclaration error after the
  //    rewrite (esbuild rejects the file). The codemod's AST pass is the
  //    proper place for this; we leave `var` alone here.

  // 4b. Legacy `(var|const) fixture = document.getElementById('fixture');` /
  //     `document.querySelector('#fixture')` runs at describe time, but our
  //     per-test fixture is created in vitest.setup.ts's `beforeEach`. Move
  //     the lookup into a beforeEach so each test's `fixture` reference
  //     points at the per-test element.
  out = out.replace(
    /^(\s*)(?:var|let|const)\s+fixture\s*=\s*document\.(?:getElementById\(\s*['"]fixture['"]\s*\)|querySelector\(\s*['"]#fixture['"]\s*\))\s*;?\s*\n/gm,
    (_m, indent) =>
      `${indent}let fixture: HTMLElement;\n` +
      `${indent}beforeEach(() => {\n` +
      `${indent}  fixture = document.getElementById('fixture') as HTMLElement;\n` +
      `${indent}});\n`
  );

  // 5. Mocha `function () {}` callbacks for hooks → arrow functions.
  out = out.replace(
    /\b(describe|it|before|beforeAll|beforeEach|after|afterAll|afterEach)\(\s*((?:'[^']*'|"[^"]*"|`[^`]*`)\s*,\s*)?function\s*\(\s*\)\s*\{/g,
    (_match, hook, label) => `${hook}(${label ?? ''}() => {`
  );

  // 5b. Mocha's `xit` (skipped test) is not exposed as a global in Vitest 4.
  //     Replace `xit` with `it.skip` everywhere — including ternary forms
  //     like `(supported ? it : xit)(...)` which the codemod copies as-is.
  out = out.replace(/\bxit\b/g, 'it.skip');

  // 6. Cast `.apply(ctx, params)` to `params as any` so the helper's typed
  //    wrapper signature accepts the legacy 3-tuple. Idempotent: skip when
  //    the cast is already present.
  out = out.replace(
    /\.apply\(([\w$.]+),\s*params\)/g,
    '.apply($1, params as any)'
  );
  out = out.replace(/\.apply\(([\w$.]+), params as any as any\)/g, '.apply($1, params as any)');

  // 7. Cast `.apply(ctx, [n, o, vNode])` literal tuples too.
  out = out.replace(
    /\.apply\(([\w$.]+),\s*\[([^\]]+)\]\)(?!\s*as\s+any)/g,
    (_m, ctx, args) => `.apply(${ctx}, [${args}] as any)`
  );

  // 8. Inject helper imports. We look at the post-rewrite source to find
  //    which helper names actually appear, then prepend a single import
  //    line. We also pull in `vitest` named imports for any test hooks
  //    that the file uses; the legacy globals (`describe`, `it`,
  //    `expect`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`) need
  //    explicit imports under Vitest.
  // Detect helper usage. The bare word `checks` matches too liberally
  // (e.g., comments, string literals, the substring `_audit.checks`); only
  // count it when followed by `.` or `[`, indicating a property access on
  // the registry object. Likewise for `axe` — only count it when it appears
  // as `axe.something` (a method/property access on the global), not as a
  // substring of unrelated identifiers.
  const usedHelpers = HELPER_NAMES.filter(name => {
    if (name === 'checks') {
      return /(?<![\w.])checks\s*[.\[]/.test(out);
    }
    if (name === 'axe') {
      return /(?<![\w.])axe\s*\./.test(out);
    }
    return new RegExp(`\\b${name}\\b`).test(out);
  });

  const VITEST_HOOKS = [
    'describe',
    'it',
    'expect',
    'beforeEach',
    'afterEach',
    'beforeAll',
    'afterAll',
    'vi'
  ];
  const usedVitest = VITEST_HOOKS.filter(name =>
    new RegExp(`\\b${name}\\b`).test(out)
  );

  // Compute the helpers import specifier as a relative path from the test
  // file's directory. This is the only way to get the depth right across
  // nested categories (e.g., `aria/x.test.ts` vs `aria/sub/y.test.ts`).
  let helpersPath = path.relative(path.dirname(fileAbsPath), HELPERS_FILE);
  if (!helpersPath.startsWith('.')) helpersPath = './' + helpersPath;

  out = mergeNamedImport(
    out,
    'vitest',
    usedVitest,
    /(import\s*\{\s*([^}]*)\s*\}\s*from\s*['"]vitest['"]\s*;?)/
  );
  out = mergeNamedImport(
    out,
    helpersPath,
    usedHelpers,
    /(import\s*\{\s*([^}]*)\s*\}\s*from\s*['"][^'"]*_helpers\/check-helpers['"]\s*;?)/
  );

  return out;
}

/**
 * Merge `wantedNames` into a named-import statement targeting `modulePath`.
 * If an import already exists (matched by `existingRe`), add any missing
 * names to it. If not, prepend a new `import { ... } from '<modulePath>';`
 * line. Returns `src` unchanged when `wantedNames` is empty.
 */
function mergeNamedImport(src, modulePath, wantedNames, existingRe) {
  if (wantedNames.length === 0) return src;
  const m = src.match(existingRe);
  if (m) {
    const existing = m[2]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...existing, ...wantedNames]));
    return src.replace(
      existingRe,
      `import { ${merged.join(', ')} } from '${modulePath}';`
    );
  }
  return `import { ${wantedNames.join(', ')} } from '${modulePath}';\n` + src;
}

async function main() {
  const pattern = process.argv[2];
  if (!pattern) {
    console.error('usage: post-migrate-checks.mjs <glob>');
    process.exit(1);
  }
  const files = await glob(pattern, { absolute: true });
  for (const file of files) {
    const src = await fs.readFile(file, 'utf8');
    const out = transform(src, file);
    if (out !== src) {
      await fs.writeFile(file, out);
      console.log(`processed: ${path.relative(process.cwd(), file)}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
