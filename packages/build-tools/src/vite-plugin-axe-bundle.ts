import type { Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Shared runtime bindings, legacy exports, source injection and license. */
export function axeBundlePlugin(version: string): Plugin {
  const banner = `/*! axe v${version}
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
  let browserSource: string;

  return {
    name: 'axe-bundle',
    apply: 'build',
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
    },
    writeBundle(options, bundle) {
      // Keep the license banner even after minification.
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && /\.(?:js|mjs|cjs)$/.test(fileName)) {
          const filePath = options.file ?? join(options.dir!, fileName);
          const content = readFileSync(filePath, 'utf-8');
          if (!content.startsWith('/*!')) {
            writeFileSync(filePath, banner + '\n' + content);
          }
        }
      }
    }
  };
}
