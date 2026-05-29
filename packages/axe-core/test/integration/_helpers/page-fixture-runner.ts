// Loads an `integration/full/*` HTML fixture inside a same-origin-isolated
// iframe and harvests its in-page Mocha results via `postMessage`. The
// fixture's `test/integration/adapter.js` is the producer — it forwards
// `mocha.run()`'s `runner.stats` to the parent window using the typed
// envelope `{ type: 'axe-fixture-results', results }`.
//
// Why postMessage and not direct DOM access: the fixture server runs on a
// different port from Vitest's browser tester, which makes the iframe a
// cross-origin frame. `iframe.contentWindow.mochaResults` is unreadable in
// that case, but `postMessage` is allowed.
//
// Phase 3, Sprint 5c — Wave A harness.

import { fixtureUrl } from './load-fixture';

export interface MochaFailure {
  name: string;
  message: string;
  stack: string;
  titles: string[];
}

export interface MochaResults {
  passes: number;
  failures: number;
  duration: number;
  reports: MochaFailure[];
  [key: string]: unknown;
}

export interface RunPageFixtureOptions {
  /** Max time, in ms, to wait for the fixture to report results. */
  timeoutMs?: number;
}

/**
 * Load a page-driven fixture in an iframe and resolve with its mocha
 * results once the fixture's adapter posts them back. Rejects on timeout.
 */
export async function runPageFixture(
  relativePath: string,
  opts: RunPageFixtureOptions = {}
): Promise<MochaResults> {
  const timeoutMs = opts.timeoutMs ?? 50_000;
  const url = fixtureUrl(relativePath);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:1024px;height:768px;border:0';
  iframe.src = url;
  document.body.appendChild(iframe);

  let cleanup: () => void;

  try {
    return await new Promise<MochaResults>((resolveRun, rejectRun) => {
      const timer = setTimeout(() => {
        rejectRun(
          new Error(
            `runPageFixture: ${url} did not report results within ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      function onMessage(evt: MessageEvent) {
        if (evt.source !== iframe.contentWindow) return;
        const data = evt.data as
          | { type?: unknown; results?: unknown }
          | null
          | undefined;
        if (!data || data.type !== 'axe-fixture-results') return;
        resolveRun(data.results as MochaResults);
      }

      cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
      };

      window.addEventListener('message', onMessage);
    });
  } finally {
    cleanup!();
    iframe.remove();
  }
}

/**
 * Fail the calling test with a readable message if the fixture reported
 * any mocha failures.
 */
export function assertNoFixtureFailures(
  relativePath: string,
  results: MochaResults
): void {
  if (results.failures === 0) return;
  const detail = results.reports
    .map(r => `  - ${r.titles.concat(r.name).join(' > ')}: ${r.message}`)
    .join('\n');
  throw new Error(
    `${relativePath}: ${results.failures} failed mocha assertion(s)\n${detail}`
  );
}
