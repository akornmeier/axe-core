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
    outputOptions(options) {
      const classicScript = options.format === 'iife';
      options.intro = [
        'var axe = {};',
        classicScript
          ? 'var window = axeWindow;'
          : 'var window = globalThis.window || {};',
        'var document = window.document;'
      ].join('\n');
      options.banner = banner;
      if (classicScript) {
        // The legacy API publishes to AMD, CommonJS and the supplied window
        // independently. Standard UMD wrappers choose only one destination.
        options.banner += '\n(function axeSource(axeWindow) {';
        options.footer = `
if (typeof define === "function" && define.amd) {
  define("axe-core", [], function () { return axe; });
}
if (typeof module === "object" && module.exports) {
  axe.source = ${JSON.stringify(banner)} + "\\n(" + axeSource.toString() + ")(typeof window === 'object' ? window : this);";
  module.exports = axe;
}
if (typeof axeWindow.getComputedStyle === "function") {
  axeWindow.axe = axe;
}
})(typeof window === "object" ? window : this || {});`;
      }
      return options;
    },
    generateBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') {
          continue;
        }
        if (options.format === 'iife') {
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
        formats: isMinify ? ['iife'] : ['iife', 'es', 'cjs'],
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
