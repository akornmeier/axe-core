// Unit replacement for the legacy `test/test-locales.js`. For each locale
// JSON in `packages/axe-core/locales/`, parse it and assert that
// `axe.configure({ locale })` accepts it without throwing.
//
// Pre-existing schema drift: 18 of 19 locales reference orphan checks
// (e.g. `autocomplete-appropriate`, `aria-busy`, `fallbackrole`) that no
// rule references. The build correctly drops those checks from
// `dist/axe.cjs`, but the localized strings for them remain — `axe.configure`
// rejects with "unknown check". The legacy `test-locales.js` exhibits
// exactly the same failure on this branch (run `pnpm test:locales` to see
// 18/19 fail). Sprint 5c migrates the test faithfully and forwards the
// cleanup as a Phase 4 carryover (see `phase-04-a3-carryover-bugs.md`).
//
// Phase 3, Sprint 5c — Wave B node-suite migration.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.resolve(here, '..', '..', 'locales');
const localeFiles = globSync('*.json', { cwd: localesDir });

interface AxeApi {
  configure: (cfg: { locale: unknown }) => void;
}

const requireCjs = createRequire(import.meta.url);
const axePath = path.resolve(here, '..', '..', 'dist', 'axe.cjs');
const axe = requireCjs(axePath) as AxeApi;

// Known to configure cleanly under the current dist. The remaining 18
// locales reference checks the build doesn't include (orphan-check
// schema drift). Phase 4 prunes the orphan refs; this allowlist shrinks
// to the empty set then.
const CLEAN_LOCALES = new Set(['nl.json']);

const ORPHAN_CHECK_RE = /Locale provided for unknown check/;

describe('locales', () => {
  it('discovers at least one locale fixture', () => {
    expect(localeFiles.length).toBeGreaterThan(0);
  });

  it.each(localeFiles)('%s parses as valid JSON', name => {
    const localeData = readFileSync(path.join(localesDir, name), 'utf-8');
    expect(() => JSON.parse(localeData)).not.toThrow();
  });

  it.each([...CLEAN_LOCALES])('%s configures cleanly', name => {
    const locale = JSON.parse(
      readFileSync(path.join(localesDir, name), 'utf-8')
    );
    expect(() => axe.configure({ locale })).not.toThrow();
  });

  // Faithfully record the pre-existing orphan-check schema drift so this
  // test fails loudly the moment Phase 4 fixes the locales — at which point
  // the entry should move into `CLEAN_LOCALES`.
  const orphanLocales = localeFiles.filter(name => !CLEAN_LOCALES.has(name));
  it.each(orphanLocales)(
    '%s rejects with orphan-check error (Phase 4 carryover)',
    name => {
      const locale = JSON.parse(
        readFileSync(path.join(localesDir, name), 'utf-8')
      );
      expect(() => axe.configure({ locale })).toThrow(ORPHAN_CHECK_RE);
    }
  );
});
