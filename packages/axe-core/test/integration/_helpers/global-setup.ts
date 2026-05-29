// Vitest globalSetup: starts the fixture server once for the whole
// `integration` project run, exposes the server URL via Vitest's
// `provide`/`inject` channel, and shuts the server down at teardown.
//
// Also populates Node-side fixture indices (file lists obtained via glob)
// so integration tests running in the browser can use `inject(...)` to
// drive `it.each(...)` over them without doing filesystem access.
//
// Phase 3, Sprint 5c — Wave A harness, extended in Wave B.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import type { TestProject } from 'vitest/node';
import { startFixtureServer } from './fixture-server';
import {
  ACT_TESTCASES_KEY,
  APG_EXAMPLES_KEY,
  FIXTURE_URL_KEY
} from './inject-keys';

const here = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(here, '..', '..', '..');

function discoverApgExamples(): string[] {
  const apgRoot = path.resolve(
    PACKAGE_ROOT,
    'node_modules',
    'aria-practices',
    'content',
    'patterns'
  );
  const matches = globSync('*/examples/*.html', {
    cwd: apgRoot,
    posix: true
  });
  return matches.sort();
}

interface ActTestcase {
  ruleId: string;
  ruleName: string;
  expected: 'failed' | 'passed' | 'inapplicable';
  testcaseId: string;
  testcaseTitle: string;
  relativePath: string;
}

function loadActTestcases(): ActTestcase[] {
  const jsonPath = path.resolve(
    PACKAGE_ROOT,
    'node_modules',
    'wcag-act-rules',
    'content-assets',
    'wcag-act-rules',
    'testcases.json'
  );
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8')) as {
    testcases: ActTestcase[];
  };
  return data.testcases;
}

export default async function setup({ provide }: TestProject) {
  const server = await startFixtureServer();
  provide(FIXTURE_URL_KEY, server.url);
  provide(APG_EXAMPLES_KEY, discoverApgExamples());
  provide(ACT_TESTCASES_KEY, loadActTestcases());
  return async () => {
    await server.close();
  };
}
