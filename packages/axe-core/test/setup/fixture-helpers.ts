// Fixture helpers — replacement for the legacy `test/testutils.js` shim.
//
// IMPORTANT: This module is consumed by the `browser` and `integration`
// Vitest projects ONLY. The `unit` (Node) project has no DOM and no
// Playwright `page` object; importing these helpers from a unit test will
// fail at runtime. If a unit test wants a small DOM, wire it in via
// `happy-dom` per-test, do NOT import from this file.
//
// Three helpers (matches PRD-03 §2.1 and the Phase 3 plan task #3 brief):
//   • createFixture(initialHTML?)  — extra-fixture container creation
//   • loadHTMLFixture(path)        — fetches HTML from `test/fixtures/`
//   • runAxeOnPage(url)            — Playwright page.goto + axe.run() bridge
//
// Phase 3, Task 3.

// `page` from `@vitest/browser/context` is the iframe-driving locator API,
// not Playwright's full Page. Vitest browser mode runs each test inside an
// iframe whose `window` IS the page under test — navigation is just
// `window.location.assign` and evaluation is just calling code directly.
//
// For tests that genuinely need Playwright's `page.goto` / `page.evaluate`
// (cross-origin navigation, network interception), drop into a Playwright
// command via `@vitest/browser/context`'s `commands` object — that is task
// 11's problem, not task 3's.

/**
 * Create and append a fresh fixture `<div>` to the document body. The global
 * setup hook in `vitest.setup.ts` already creates one auto-fixture per test;
 * use `createFixture` only when a test legitimately needs a SECOND container
 * (e.g. cross-fixture assertions, isolation-within-isolation tests).
 *
 * Browser/integration projects only.
 */
export function createFixture(initialHTML = ''): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error(
      'createFixture() requires a DOM. Call it from the `browser` or ' +
        '`integration` Vitest project, not `unit`.'
    );
  }
  const el = document.createElement('div');
  el.classList.add('axe-fixture');
  if (initialHTML) {
    el.innerHTML = initialHTML;
  }
  document.body.appendChild(el);
  return el;
}

/**
 * Fetch an HTML fixture file from `test/fixtures/`. Returns the raw HTML
 * string for tests that want to inject it into a fixture container.
 *
 * Browser projects only — uses `fetch()` against the Vitest dev server.
 * For Node-side tests that need to read fixtures, use `node:fs/promises`
 * directly; the path conventions are different enough that a unified API
 * would create more confusion than it removes.
 *
 * Convention: pass the path relative to `packages/axe-core/`, e.g.
 *   await loadHTMLFixture('test/fixtures/landmarks/main.html')
 */
export async function loadHTMLFixture(path: string): Promise<string> {
  if (typeof fetch === 'undefined') {
    throw new Error(
      'loadHTMLFixture() requires fetch(). Call it from the `browser` or ' +
        '`integration` Vitest project.'
    );
  }
  const url = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `loadHTMLFixture: failed to fetch ${url} — ${response.status} ${response.statusText}`
    );
  }
  return response.text();
}

/**
 * Navigate the test iframe to `url` and run axe against the loaded page.
 * Returns the raw `axe.run()` output — typically validated against
 * `AxeResultsSchema` via the `toMatchSchema` matcher.
 *
 * Integration project only. Requires axe-core to be loaded into the page
 * (typically via a `<script>` tag in the fixture HTML).
 *
 * Note: Vitest browser mode's `page` is the iframe locator, NOT Playwright's
 * full Page object — navigation is performed via `window.location.assign`
 * inside the iframe, and evaluation is just direct script execution. Cross-
 * origin or network-interception tests should drop into a custom Playwright
 * command (Phase 3 task 11).
 */
export async function runAxeOnPage(url: string): Promise<unknown> {
  if (typeof window === 'undefined') {
    throw new Error(
      'runAxeOnPage() requires a browser. Call it from the `integration` Vitest project.'
    );
  }
  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      window.removeEventListener('load', onLoad);
      resolve();
    };
    const onError = (event: ErrorEvent) => {
      window.removeEventListener('error', onError);
      reject(event.error ?? new Error(`Navigation to ${url} failed`));
    };
    window.addEventListener('load', onLoad, { once: true });
    window.addEventListener('error', onError, { once: true });
    window.location.assign(url);
  });
  const axe = (window as unknown as { axe?: { run: () => Promise<unknown> } })
    .axe;
  if (!axe) {
    throw new Error(
      'runAxeOnPage: window.axe is undefined — the fixture must load axe-core before this helper runs.'
    );
  }
  return axe.run();
}
