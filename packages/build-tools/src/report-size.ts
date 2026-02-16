/**
 * report-size.ts — Reports the size of built axe-core bundles.
 *
 * Usage:
 *   npx tsx packages/build-tools/src/report-size.ts
 *
 * Looks for axe.min.js and axe.js in both dist/ and package root
 * (backwards compat with the legacy Grunt build).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const AXE_CORE_PKG = resolve(
  import.meta.dirname ?? new URL('.', import.meta.url).pathname,
  '../../axe-core'
);

interface BundleInfo {
  name: string;
  path: string;
  rawBytes: number;
  gzipBytes: number;
}

function formatBytes(bytes: number): string {
  return bytes.toLocaleString('en-US');
}

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(2);
}

function resolveBundlePath(filename: string): string | undefined {
  // Prefer dist/ (new build), fall back to package root (legacy build)
  const distPath = resolve(AXE_CORE_PKG, 'dist', filename);
  if (existsSync(distPath)) {
    return distPath;
  }

  const rootPath = resolve(AXE_CORE_PKG, filename);
  if (existsSync(rootPath)) {
    return rootPath;
  }

  return undefined;
}

function measureBundle(filename: string): BundleInfo | undefined {
  const bundlePath = resolveBundlePath(filename);
  if (!bundlePath) {
    return undefined;
  }

  const contents = readFileSync(bundlePath);
  const gzipped = gzipSync(contents, { level: 9 });

  return {
    name: filename,
    path: bundlePath,
    rawBytes: contents.byteLength,
    gzipBytes: gzipped.byteLength
  };
}

function printBundle(info: BundleInfo): void {
  console.log(info.name);
  console.log(
    `  Raw:  ${formatKB(info.rawBytes)} KB (${formatBytes(info.rawBytes)} bytes)`
  );
  console.log(
    `  Gzip: ${formatKB(info.gzipBytes)} KB (${formatBytes(info.gzipBytes)} bytes)`
  );
}

// --- main ---

const bundles: BundleInfo[] = [];

const minified = measureBundle('axe.min.js');
if (minified) {
  bundles.push(minified);
}

const unminified = measureBundle('axe.js');
if (unminified) {
  bundles.push(unminified);
}

if (bundles.length === 0) {
  console.error(
    'No build artifacts found. Run the build first, then re-run this script.'
  );
  process.exit(1);
}

console.log('');
for (const bundle of bundles) {
  printBundle(bundle);
  console.log('');
}

process.exit(0);
