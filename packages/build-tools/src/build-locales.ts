/**
 * build-locales.ts
 *
 * Standalone Node script that builds locale-specific versions of axe-core.
 *
 * For each locale JSON file in packages/axe-core/locales/ (excluding _template.json):
 *   - Generates dist/axe.{locale}.js (UMD)
 *   - Generates dist/axe.{locale}.min.js (UMD minified)
 *
 * Also regenerates locales/_template.json (the locale template with English messages).
 *
 * Usage:
 *   npx tsx packages/build-tools/src/build-locales.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { globSync } from 'glob';
import { axeBundlePlugin } from './vite-plugin-axe-bundle';
import {
  generateConfig,
  generateDefaultConfig,
  type LocaleData
} from './vite-plugin-axe-metadata';

// Resolve axe-core root (two levels up from build-tools/src/)
const buildToolsSrc = path.dirname(new URL(import.meta.url).pathname);
const axeCoreRoot = path.resolve(buildToolsSrc, '../../axe-core');

// ---------------------------------------------------------------------------
// Part 1: Build locale-specific bundles
// ---------------------------------------------------------------------------

async function buildLocaleBundles(): Promise<void> {
  // Dynamically import vite build API (may be rolldown-vite or vite)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let viteBuild: (config: any) => Promise<unknown>;
  try {
    const vite = await import('rolldown-vite');
    viteBuild = vite.build;
  } catch {
    const vite = await import('vite');
    viteBuild = vite.build;
  }

  const localesDir = path.join(axeCoreRoot, 'locales');
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter(
      (f: string) =>
        f.endsWith('.json') && !f.startsWith('_') && f !== 'README.md'
    );

  const pkg = JSON.parse(
    fs.readFileSync(path.join(axeCoreRoot, 'package.json'), 'utf-8')
  );

  console.log(
    `[build-locales] Found ${localeFiles.length} locale files to process`
  );

  // Save original default-config.ts to restore after all builds
  const generatedDir = path.join(axeCoreRoot, 'lib/core/generated');
  fs.mkdirSync(generatedDir, { recursive: true });
  const defaultConfigPath = path.join(generatedDir, 'default-config.ts');
  const originalConfig = fs.readFileSync(defaultConfigPath, 'utf-8');

  try {
    for (const localeFile of localeFiles) {
      const localeName = localeFile.replace('.json', '');
      const localePath = path.join(localesDir, localeFile);
      const localeData: LocaleData = JSON.parse(
        fs.readFileSync(localePath, 'utf-8')
      );

      console.log(`[build-locales] Building axe.${localeName}.js ...`);

      // Generate locale-specific config and write it to default-config.ts
      const { configData } = generateConfig(axeCoreRoot, localeData);
      fs.writeFileSync(
        defaultConfigPath,
        generateDefaultConfig(configData),
        'utf-8'
      );

      // Keep the locale config; the normal metadata plugin regenerates English.
      // Both entry points share runtime bindings and legacy export behavior.
      for (const minify of [false, true]) {
        await viteBuild({
          configFile: false,
          root: axeCoreRoot,
          logLevel: 'warn',
          plugins: [axeBundlePlugin(pkg.version)],
          build: {
            lib: {
              entry: path.resolve(axeCoreRoot, 'lib/index.ts'),
              name: 'axe',
              formats: ['iife'],
              fileName: () => `axe.${localeName}${minify ? '.min' : ''}.js`
            },
            outDir: path.join(axeCoreRoot, 'dist'),
            sourcemap: true,
            target: 'es2022',
            minify: minify ? 'esbuild' : false,
            emptyOutDir: false
          },
          define: {
            __AXE_VERSION__: JSON.stringify(pkg.version)
          }
        });
      }

      console.log(
        `[build-locales] Built axe.${localeName}.js and axe.${localeName}.min.js`
      );
    }
  } finally {
    // Restore original default-config.ts
    fs.writeFileSync(defaultConfigPath, originalConfig, 'utf-8');
  }
}

// ---------------------------------------------------------------------------
// Part 2: Generate locale template (_template.json)
// ---------------------------------------------------------------------------

export function generateLocaleTemplate(cwd: string): string {
  const rules = readJsonFiles<RuleJson>('lib/rules/**/*.json', cwd);
  const checks = readJsonFiles<CheckJson>('lib/checks/**/*.json', cwd);
  const misc = readJsonFiles<MiscJson>('lib/misc/**/*.json', cwd);

  const template: {
    lang: string;
    rules: Record<string, Record<string, string>>;
    checks: Record<string, Record<string, unknown>>;
    failureSummaries: Record<string, Record<string, string>>;
    incompleteFallbackMessage: string;
  } = {
    lang: 'xyz',
    rules: {},
    checks: {},
    failureSummaries: {},
    incompleteFallbackMessage: ''
  };

  // Build rules section — extract description and help from each rule's metadata
  for (const rule of rules) {
    if (rule.metadata) {
      template.rules[rule.id] = {};
      if (rule.metadata.description) {
        template.rules[rule.id]!.description = rule.metadata.description;
      }
      if (rule.metadata.help) {
        template.rules[rule.id]!.help = rule.metadata.help;
      }
    }
  }

  // Build checks section — extract messages from each check's metadata
  for (const check of checks) {
    if (check.metadata?.messages) {
      template.checks[check.id] = {};
      for (const [key, value] of Object.entries(check.metadata.messages)) {
        (template.checks[check.id] as Record<string, unknown>)[key] = value;
      }
    }
  }

  // Build failureSummaries section
  for (const item of misc) {
    if (item.type && item.metadata?.failureMessage) {
      template.failureSummaries[item.type] = {
        failureMessage: item.metadata.failureMessage
      };
    }
  }

  // Get incompleteFallbackMessage
  const incompleteSummary = misc.find(
    m => typeof m.incompleteFallbackMessage === 'string'
  );
  template.incompleteFallbackMessage = incompleteSummary
    ? incompleteSummary.incompleteFallbackMessage!
    : '';

  return JSON.stringify(template, null, '  ');
}

// ---------------------------------------------------------------------------
// JSON file readers (same structure as vite-plugin-axe-metadata)
// ---------------------------------------------------------------------------

interface CheckJson {
  id: string;
  metadata?: {
    impact?: string;
    messages?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

interface RuleJson {
  id: string;
  metadata?: {
    description?: string;
    help?: string;
  };
  [key: string]: unknown;
}

interface MiscJson {
  type?: string;
  metadata?: {
    failureMessage?: string;
  };
  incompleteFallbackMessage?: string;
}

function readJsonFiles<T>(pattern: string, cwd: string): T[] {
  const files = globSync(pattern, { cwd, posix: true }).sort();
  return files.map(f => {
    const content = fs.readFileSync(path.join(cwd, f), 'utf-8');
    return JSON.parse(content) as T;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('[build-locales] Generating locale template...');
  const templateContent = generateLocaleTemplate(axeCoreRoot);
  const templatePath = path.join(axeCoreRoot, 'locales', '_template.json');

  // Format with Prettier
  let formatted = templateContent;
  try {
    const prettier = await import('prettier');
    formatted = await prettier.format(templateContent, {
      ...(await prettier.resolveConfig(templatePath)),
      filepath: templatePath
    });
  } catch {
    console.warn(
      '[build-locales] Prettier formatting failed, writing unformatted content'
    );
  }

  fs.writeFileSync(templatePath, formatted, 'utf-8');
  console.log('[build-locales] Generated locales/_template.json');

  console.log('[build-locales] Building locale-specific bundles...');
  await buildLocaleBundles();
  console.log('[build-locales] Done!');
}

main().catch(err => {
  console.error('[build-locales] Build failed:', err);
  process.exit(1);
});
