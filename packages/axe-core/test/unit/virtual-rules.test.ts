// @vitest-environment jsdom
//
// Unit replacement for the legacy `test/test-virtual-rules.js`. Loads each
// fixture under `test/integration/virtual-rules/` and lets it register its
// own `describe`/`it` declarations against the in-process Vitest runner.
//
// The 47 fixture files use chai-style globals (`describe`, `it`, `assert`,
// `axe`). Sprint 5c installs them as globals so the fixtures load unchanged
// — Phase 4 codemods will flip them to Vitest-native imports once the
// chai/mocha devDeps retire.
//
// Note on environment: `axe.runVirtualRule` calls into
// `getEnvironmentData → getOrientation` which reads `window.screen.orientation`.
// Pure node has no `window`, so this file pins to the jsdom environment
// even though it lives under `test/unit/`. The DOM is unused; jsdom is
// only there to satisfy axe's environment probes.
//
// Phase 3, Sprint 5c — Wave B node-suite migration.

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import {
  afterAll,
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  describe,
  it
} from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, '..', 'integration', 'virtual-rules');
const fixtureFiles = globSync('*.js', { cwd: fixtureDir }).map(name =>
  path.join(fixtureDir, name)
);

interface AxeApi {
  runVirtualRule: (
    ruleId: string,
    node: { nodeName: string; attributes?: Record<string, unknown> }
  ) => unknown;
  [key: string]: unknown;
}

const requireCjs = createRequire(import.meta.url);
const axePath = path.resolve(here, '..', '..', 'dist', 'axe.cjs');
const axe = requireCjs(axePath) as AxeApi;

// The fixture files reference `describe`/`it` at module top level (suite
// declarations) and `assert`/`axe` inside test callbacks. Install all four
// as globals BEFORE requiring fixtures so test discovery sees the suites.
type GlobalShim = typeof globalThis & {
  describe?: typeof describe;
  it?: typeof it;
  beforeEach?: typeof beforeEach;
  afterEach?: typeof afterEach;
  assert?: typeof assert;
  axe?: AxeApi;
};
const g = globalThis as GlobalShim;
g.describe = describe;
g.it = it;
g.beforeEach = beforeEach;
g.afterEach = afterEach;

beforeAll(() => {
  g.assert = assert;
  g.axe = axe;
});

afterAll(() => {
  delete g.assert;
  delete g.axe;
});

describe('virtual-rule node tests', () => {
  if (fixtureFiles.length === 0) {
    it('discovered zero fixtures (regression — expected ~47)', () => {
      throw new Error(`No virtual-rule fixtures found in ${fixtureDir}`);
    });
    return;
  }
  // Each `requireCjs(file)` evaluates a fixture whose top level is a
  // `describe(...)` call — Vitest collects those nested suites.
  for (const file of fixtureFiles) {
    requireCjs(file);
  }
});
