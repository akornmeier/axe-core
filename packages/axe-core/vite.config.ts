import { defineConfig, type Plugin } from 'rolldown-vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { axeAriaPlugin } from '../build-tools/src/vite-plugin-axe-aria';
import { axeMetadataPlugin } from '../build-tools/src/vite-plugin-axe-metadata';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
);

const banner = `/*! axe v${pkg.version}
 * Copyright (c) 2015 - ${new Date().getFullYear()} Deque Systems, Inc.
 *
 * Your use of this Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This entire copyright notice must appear in every copy of this file you
 * distribute or in any file that contains substantial portions of this source
 * code.
 */`;

/**
 * Vite plugin that prepends the license banner to all generated JS files.
 * This runs after minification so the banner is never stripped.
 */
function bannerPlugin(): Plugin {
  return {
    name: 'axe-banner',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir || resolve(__dirname, 'dist');
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (
          (chunk.type === 'chunk' && fileName.endsWith('.js')) ||
          fileName.endsWith('.mjs') ||
          fileName.endsWith('.cjs')
        ) {
          const filePath = join(outDir, fileName);
          const content = readFileSync(filePath, 'utf-8');
          if (!content.startsWith('/*!')) {
            writeFileSync(filePath, banner + '\n' + content);
          }
        }
      }
    }
  };
}

/**
 * Vite plugin that injects `var axe = {};` and a `window` shim into
 * each output chunk.
 *
 * Many source files reference `axe` as an ambient global (the legacy
 * Grunt build made this available via concatenation / intro.stub).
 * The `window` shim allows the CJS/UMD bundles to load in Node.js
 * without ReferenceErrors.
 *
 * We use `writeBundle` (runs AFTER minification) so the injected code
 * is never stripped by the minifier.
 */
function axeGlobalPlugin(): Plugin {
  return {
    name: 'axe-global-inject',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir || resolve(__dirname, 'dist');
      const shim = [
        'var axe = {};',
        'if (typeof window === "undefined") { var window = typeof globalThis !== "undefined" ? globalThis : {}; }'
      ].join('\n');

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        if (
          !fileName.endsWith('.js') &&
          !fileName.endsWith('.mjs') &&
          !fileName.endsWith('.cjs')
        )
          continue;

        const filePath = join(outDir, fileName);
        const content = readFileSync(filePath, 'utf-8');

        // Skip if already injected
        if (content.includes('var axe = {}')) continue;

        // Determine where to insert the shim.
        // For all formats, insert after the banner comment if present,
        // otherwise at the very beginning.
        const bannerEnd = content.indexOf('*/');
        let insertPos: number;
        if (bannerEnd !== -1 && bannerEnd < 500) {
          // Insert after the banner comment's closing */
          insertPos = bannerEnd + 2;
        } else {
          insertPos = 0;
        }

        let updated =
          content.slice(0, insertPos) +
          '\n' +
          shim +
          '\n' +
          content.slice(insertPos);

        // Phase 2 regression fix: the rolldown-emitted UMD wrapper does
        // `global.axe = factory()`, REPLACING the outer `var axe = {}`
        // shim. Inside the factory, code does (paraphrasing):
        //
        //   Object.assign(axe, axeExport);   // seeds axe with methods/version
        //   load(default_config_default);    // sets axe._audit = new Audit(...)
        //   return axeExport;                // ← _audit lives on the shim, NOT here
        //
        // The shim accumulates `_audit` (and any other state set via
        // `axe.x = ...` in source). When the wrapper reassigns
        // `global.axe = factory()`, the shim becomes orphaned and the
        // returned axeExport — which never received those mutations —
        // is published. Result: window.axe._audit is undefined, breaking
        // every test that uses it (e.g. test/testutils.js:18).
        //
        // Fix: rewrite the wrapper's `global.axe = factory()` to merge
        // factory's return ONTO the existing shim instead of replacing
        // it. Since the shim is the same object the factory mutated,
        // the published global ends up with both axeExport's methods
        // (already copied onto the shim by the factory's early
        // `Object.assign(axe, axeExport)`) AND the shim-only state like
        // `_audit`. We also patch the CJS branch (`module.exports =
        // factory()`) so Node consumers see the merged shape too.
        //
        // The regex anchors on the full UMD wrapper expression so we
        // only patch the OUTER wrapper and never an internal
        // `module.exports = something()` that may appear in source.
        // Matches both unminified and esbuild-minified forms.
        //
        // Unminified shape:
        //   typeof exports === "object" && typeof module !== "undefined"
        //     ? module.exports = factory()
        //     : typeof define === "function" && define.amd
        //       ? define([], factory)
        //       : (global = ..., global.axe = factory());
        //
        // Minified shape (whitespace-stripped, identifiers mangled):
        //   typeof exports=="object"&&typeof module<"u"?module.exports=je()
        //     :typeof define=="function"&&define.amd?define([],je)
        //     :($t=...,$t.axe=je())
        updated = updated.replace(
          /(typeof\s+exports\s*===?\s*"object"[\s\S]{0,200}?module\.exports\s*=\s*)([a-zA-Z_$][\w$]*)\(\)/,
          '$1Object.assign(typeof axe!=="undefined"?axe:{},$2())'
        );
        updated = updated.replace(
          /(\([\s\S]{0,200}?([a-zA-Z_$][\w$]*)\s*=\s*typeof\s+globalThis[\s\S]{0,200}?\2\.axe\s*=\s*)([a-zA-Z_$][\w$]*)\(\)/,
          '$1Object.assign(typeof axe!=="undefined"?axe:($2.axe||($2.axe={})),$3())'
        );

        writeFileSync(filePath, updated);
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isMinify = mode === 'minify';

  return {
    plugins: [
      axeMetadataPlugin({
        axeCoreRoot: __dirname
      }),
      bannerPlugin(),
      axeGlobalPlugin(),
      axeAriaPlugin({
        axeCorePath: __dirname
      })
    ],
    resolve: {
      extensions: [
        '.ts',
        '.tsx',
        '.mjs',
        '.js',
        '.mts',
        '.cts',
        '.cjs',
        '.json'
      ]
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'lib/index.ts'),
        name: 'axe',
        formats: isMinify ? ['umd'] : ['umd', 'es', 'cjs'],
        fileName: format => {
          if (isMinify) return 'axe.min.js';
          if (format === 'umd') return 'axe.js';
          if (format === 'es') return 'axe.mjs';
          if (format === 'cjs') return 'axe.cjs';
          return `axe.${format}.js`;
        }
      },
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
      minify: isMinify ? 'esbuild' : false,
      emptyOutDir: !isMinify
    },
    define: {
      __AXE_VERSION__: JSON.stringify(pkg.version)
    }
  };
});
