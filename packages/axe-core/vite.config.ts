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

/** Keep the license banner even after minification. */
function bannerPlugin(): Plugin {
  return {
    name: 'axe-banner',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir || resolve(__dirname, 'dist');
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && /\.(?:js|mjs|cjs)$/.test(fileName)) {
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

/** Provide browser-injectable source to Node/ESM integrations. */
function sourcePlugin(): Plugin {
  let browserSource: string;
  return {
    name: 'axe-source',
    generateBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') {
          continue;
        }
        if (options.format === 'umd') {
          // Self-serialization avoids embedding a second copy in the browser
          // bundle, matching the legacy axeFunction/source contract.
          chunk.code = `(function axeSource() {${chunk.code}\nif (typeof module === "object" && module.exports) {
module.exports.source = ${JSON.stringify(banner)} + "\\n(" + axeSource.toString() + ")();";
}\n})();\n`;
          browserSource = banner + '\n' + chunk.code;
        } else {
          if (!browserSource) {
            throw new Error('Build the UMD output before other axe formats');
          }
          // Module-format consumers still need classic-script source for
          // injection into pages and frames.
          chunk.code += `\naxe.source = ${JSON.stringify(browserSource)};\n`;
        }
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isMinify = mode === 'minify';

  return {
    plugins: [
      axeMetadataPlugin({ axeCoreRoot: __dirname }),
      bannerPlugin(),
      sourcePlugin(),
      axeAriaPlugin({ axeCorePath: __dirname })
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
          if (isMinify) {
            return 'axe.min.js';
          }
          if (format === 'es') {
            return 'axe.mjs';
          }
          if (format === 'cjs') {
            return 'axe.cjs';
          }
          return 'axe.js';
        }
      },
      rollupOptions: {
        output: {
          // Legacy modules share these bindings. Keep them inside each bundle's
          // scope, not on Node's globalThis or outside the UMD factory.
          intro: [
            'var axe = {};',
            'var window = globalThis.window || {};',
            'var document = window.document;'
          ].join('\n')
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
