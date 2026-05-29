// Integration suite — ARIA Authoring Practices Guide (APG) examples.
// Replaces the legacy `test/aria-practices/apg.spec.js` Selenium harness.
//
// For each `node_modules/aria-practices/content/patterns/*/examples/*.html`
// fixture, load the page in an iframe, inject `axe.js` into the iframe's
// own window, and assert zero violations under the WCAG 2.0/2.1 A+AA tag
// set. The `disabledRules` and `skippedPages` lists carry over verbatim
// from the legacy harness.
//
// Note: file discovery happens at TEST-COLLECTION time on the Node side,
// reading directly from `node_modules/aria-practices/`. The fixture server
// serves the same files at request time.
//
// Phase 3, Sprint 5c — Wave B APG migration.

import { describe, expect, inject, it } from 'vitest';
import {
  type AxeApi,
  type AxeRunResult,
  type LoadedAxeIframe,
  loadAxeInIframe
} from './_helpers/load-fixture';
import { APG_EXAMPLES_KEY } from './_helpers/inject-keys';

const exampleFiles = inject(APG_EXAMPLES_KEY) as string[];

// Rules disabled across all examples — known mismatches between APG fixture
// content and axe rules, tracked upstream in dequelabs/axe-core.
const DISABLED_RULES_GLOBAL = [
  'color-contrast',
  'target-size',
  'heading-order', // w3c/aria-practices#2119
  'scrollable-region-focusable' // w3c/aria-practices#2114
];

// Path-keyed override map for additional per-example disables. Empty in
// the legacy spec; left here as the extension point.
const DISABLED_RULES_BY_PATH: Record<string, string[]> = {};

const SKIPPED_PAGES = new Set([
  'toolbar/examples/help.html', // embedded into another page
  'tabs/examples/tabs-actions.html' // dequelabs/axe-core#4584
]);

describe('aria-practices', () => {
  it('discovers at least one APG example', () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  const runnable = exampleFiles.filter(rel => !SKIPPED_PAGES.has(rel));

  it.each(runnable)(
    'finds no issue in %s',
    {
      timeout: 50_000,
      retry: 3
    },
    async relPath => {
      const fixturePath = `/node_modules/aria-practices/content/patterns/${relPath}`;
      const handle: LoadedAxeIframe = await loadAxeInIframe(fixturePath);
      try {
        const axe: AxeApi = handle.axe;
        const disabled = [
          ...DISABLED_RULES_GLOBAL,
          ...(DISABLED_RULES_BY_PATH[relPath] ?? [])
        ];
        const ruleConfig: Record<string, { enabled: false }> = {};
        for (const id of disabled) ruleConfig[id] = { enabled: false };

        const results: AxeRunResult = await axe.run(
          { include: [['html']], exclude: [['#at-support']] },
          {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
            },
            rules: ruleConfig
          }
        );

        const violationIds = results.violations
          .map(
            v =>
              `${v.id} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`
          )
          .join(', ');
        expect(results.violations, violationIds).toHaveLength(0);
      } finally {
        handle.dispose();
      }
    }
  );
});
