// Unit replacement for the legacy `test/test-rule-help-version.js`. Pings
// dequeuniversity.com to confirm the rule-help docs page for the current
// minor version exists. Network-dependent — gated behind CI so local runs
// stay fast and offline-safe.
//
// Phase 3, Sprint 5c — Wave B node-suite migration.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.resolve(here, '..', '..', 'package.json'), 'utf-8')
) as { version: string };

const [major, minor] = pkg.version.split('.');
const minorVersion = `${major}.${minor}`;
const helpUrl = `https://dequeuniversity.com/rules/axe/${minorVersion}`;

describe('rule help docs', () => {
  it.skipIf(!process.env.CI)(
    `latest axe minor version (${minorVersion}) help page returns 2xx`,
    async () => {
      const res = await fetch(helpUrl, { redirect: 'follow' });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    },
    30_000
  );
});
