import { defineConfig } from 'rolldown-vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { axeAriaPlugin } from '../build-tools/src/vite-plugin-axe-aria';
import { axeBundlePlugin } from '../build-tools/src/vite-plugin-axe-bundle';
import { axeMetadataPlugin } from '../build-tools/src/vite-plugin-axe-metadata';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
);

export default defineConfig(({ mode }) => {
  const isMinify = mode === 'minify';

  return {
    plugins: [
      axeMetadataPlugin({ axeCoreRoot: __dirname }),
      axeBundlePlugin(pkg.version),
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
