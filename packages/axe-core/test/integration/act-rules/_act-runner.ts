// Typed factory for ACT-rules suites. Replaces the legacy CommonJS
// `test/act-rules/act-runner.js`. Each `*.test.ts` file under this
// directory is a thin one-liner that calls `createActSuite({ id, title,
// axeRules, skipTests })` — same shape as the legacy `*.spec.js`.
//
// The factory pulls the wcag-act-rules `testcases.json` from
// `inject(ACT_TESTCASES_KEY)` (populated by global-setup.ts), filters to
// the testcases that target the configured rule and have an HTML/XHTML
// fixture, then emits one Vitest `it.each` per testcase. Fixtures load
// via `loadAxeInIframe`, which uses `srcdoc` + `<base href>` so relative
// URLs (CSS, images, scripts) resolve back to the fixture server.
//
// Phase 3, Sprint 5c — Wave B ACT migration.

import { describe, expect, inject, it } from 'vitest';
import { ACT_TESTCASES_KEY } from '../_helpers/inject-keys';
import { loadAxeInIframe } from '../_helpers/load-fixture';

export interface ActTestcase {
  ruleId: string;
  ruleName: string;
  expected: 'failed' | 'passed' | 'inapplicable';
  testcaseId: string;
  testcaseTitle: string;
  relativePath: string;
}

export interface CreateActSuiteOptions {
  id: string;
  title: string;
  axeRules: string[];
  /** Testcase ids to skip — typically references upstream issues. */
  skipTests?: string[];
}

const HTML_FIXTURE_RE = /\.x?html?$/i;

export function createActSuite({
  id,
  title,
  axeRules,
  skipTests = []
}: CreateActSuiteOptions): void {
  const allTestcases = inject(ACT_TESTCASES_KEY) as ActTestcase[];
  const matching = allTestcases.filter(
    t => t.ruleId === id && HTML_FIXTURE_RE.test(t.relativePath)
  );
  const skipSet = new Set(skipTests);
  const runnable = matching.filter(t => !skipSet.has(t.testcaseId));
  const skipped = matching.filter(t => skipSet.has(t.testcaseId));

  describe(`${title} (${id})`, () => {
    if (matching.length === 0) {
      it.todo(
        'no testcases discovered (testcases.json schema drift — Phase 4 carryover)'
      );
      return;
    }

    it.each(runnable)(
      '$testcaseTitle',
      { timeout: 50_000, retry: 1 },
      async testcase => {
        const fixturePath = `/WAI/content-assets/wcag-act-rules/${testcase.relativePath}`;
        const handle = await loadAxeInIframe(fixturePath);
        try {
          const results = await handle.axe.run(handle.contentDocument, {
            runOnly: { type: 'rule', values: axeRules }
          });
          if (testcase.expected !== 'failed') {
            expect(
              results.violations,
              `Expected 0 violations for testcase ${testcase.testcaseId} (${testcase.relativePath})`
            ).toHaveLength(0);
          } else {
            const issues = results.violations[0] ?? results.incomplete[0];
            expect(
              issues,
              `Expected violations or incomplete for testcase ${testcase.testcaseId} (${testcase.relativePath})`
            ).toBeDefined();
            expect(issues!.nodes.length).toBeGreaterThanOrEqual(1);
          }
        } finally {
          handle.dispose();
        }
      }
    );

    if (skipped.length > 0) {
      it.skip.each(skipped)('$testcaseTitle (skipTests entry)', () => {
        /* documentation-only — listed in skipTests at suite-creation time */
      });
    }
  });
}
