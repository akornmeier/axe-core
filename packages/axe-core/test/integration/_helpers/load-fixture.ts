// Browser-side helpers for the Vitest integration project. Tests use
// `loadAxe()` to attach the built axe-core UMD to the page exactly once,
// and `fixtureUrl(path)` to resolve any package-relative path against the
// fixture server's listening origin.
//
// Phase 3, Sprint 5c — Wave A harness.

import { inject } from 'vitest';
import { FIXTURE_URL_KEY } from './inject-keys';

function injectFixtureUrl(): string {
  // `inject` returns `unknown` without explicit typing; the runtime value is
  // whatever `global-setup.ts` passed to `provide(FIXTURE_URL_KEY, ...)`.
  return inject(FIXTURE_URL_KEY) as string;
}

export interface AxeRunResult {
  violations: Array<{ id: string; nodes: unknown[] }>;
  incomplete: Array<{ id: string; nodes: unknown[] }>;
  passes: Array<{ id: string; nodes: unknown[] }>;
  inapplicable: Array<{ id: string; nodes: unknown[] }>;
  [key: string]: unknown;
}

export interface AxeApi {
  run: (ctx: unknown, opts?: unknown) => Promise<AxeRunResult>;
  configure: (cfg: unknown) => void;
  reset: () => void;
  [key: string]: unknown;
}

declare global {
  interface Window {
    axe: AxeApi;
  }
}

let loadPromise: Promise<AxeApi> | null = null;

/**
 * Load `dist/axe.js` from the fixture server into the current test page.
 * Cached: subsequent calls within the same browser context return the same
 * `window.axe` instance. On error the cache is cleared so a retry can
 * re-attempt cleanly instead of returning the same rejection forever.
 */
export function loadAxe(): Promise<AxeApi> {
  if (loadPromise) return loadPromise;
  const pending = new Promise<AxeApi>((resolveLoad, rejectLoad) => {
    if (window.axe) {
      resolveLoad(window.axe);
      return;
    }
    const script = document.createElement('script');
    script.src = `${injectFixtureUrl()}/axe.js`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.axe) {
        resolveLoad(window.axe);
      } else {
        rejectLoad(new Error('axe.js loaded but window.axe is undefined'));
      }
    };
    script.onerror = () =>
      rejectLoad(new Error(`failed to load ${script.src}`));
    document.head.appendChild(script);
  });
  pending.catch(() => {
    loadPromise = null;
  });
  loadPromise = pending;
  return pending;
}

/**
 * Resolve a path against the fixture server's base URL. Accepts both
 * leading-slash and bare paths.
 */
export function fixtureUrl(relativePath: string): string {
  const base = injectFixtureUrl();
  return relativePath.startsWith('/')
    ? `${base}${relativePath}`
    : `${base}/${relativePath}`;
}

export interface LoadedAxeIframe {
  /** The `axe` object captured from the iframe's own window. */
  readonly axe: AxeApi;
  readonly iframe: HTMLIFrameElement;
  readonly contentDocument: Document;
  /** Removes the iframe from the parent document. Idempotent. */
  dispose(): void;
}

/**
 * Load a fixture page into an iframe via `srcdoc` (same-origin) and inject
 * `axe.js` into the iframe's own window. The returned `axe` runs in the
 * iframe's realm, so passing `contentDocument` to `axe.run(...)` avoids
 * the cross-realm `instanceof window.Node` failure that bites parent-realm
 * axe calls.
 *
 * Why srcdoc (not src):
 *   The fixture server runs on a different origin than the Vitest browser
 *   tester (different port = different origin). A cross-origin iframe
 *   denies the parent any access to `contentWindow`/`contentDocument`,
 *   which makes axe-via-iframe-realm impossible. srcdoc loads the HTML
 *   inline as same-origin; relative URLs resolve via an injected `<base>`
 *   tag pointing back at the fixture-server origin.
 *
 * Used by ACT-rules and APG suites where the fixture is a static HTML
 * page with no in-page Mocha runner.
 */
export async function loadAxeInIframe(
  relativePath: string,
  opts: { timeoutMs?: number } = {}
): Promise<LoadedAxeIframe> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const url = fixtureUrl(relativePath);

  // Fetch the fixture HTML, then rewrite it for srcdoc loading.
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `loadAxeInIframe: fixture ${url} returned HTTP ${response.status}`
    );
  }
  const rawHtml = await response.text();

  // <base href> so relative URLs in the fixture (CSS, JS, images) resolve
  // back to the fixture-server origin. The href must end in `/` so paths
  // resolve as siblings of the fixture, not the fixture itself.
  const baseHref = url.replace(/[^/]+$/, '');
  const baseTag = `<base href="${baseHref}">`;
  const srcdoc = injectIntoHead(rawHtml, baseTag);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:1024px;height:768px;border:0';
  document.body.appendChild(iframe);

  let dispose = (): void => {
    iframe.remove();
    dispose = () => {
      /* idempotent */
    };
  };

  try {
    await new Promise<void>((resolveLoad, rejectLoad) => {
      const timer = setTimeout(() => {
        rejectLoad(new Error(`loadAxeInIframe: ${url} timed out`));
      }, timeoutMs);
      iframe.addEventListener(
        'load',
        () => {
          clearTimeout(timer);
          resolveLoad();
        },
        { once: true }
      );
      iframe.addEventListener(
        'error',
        () => {
          clearTimeout(timer);
          rejectLoad(new Error(`loadAxeInIframe: ${url} failed to load`));
        },
        { once: true }
      );
      iframe.srcdoc = srcdoc;
    });

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      throw new Error(`loadAxeInIframe: ${url} produced no contentWindow`);
    }

    const axeUrl = fixtureUrl('/axe.js');
    await new Promise<void>((resolveScript, rejectScript) => {
      const script = doc.createElement('script');
      script.src = axeUrl;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolveScript();
      script.onerror = () =>
        rejectScript(new Error(`loadAxeInIframe: failed to load ${axeUrl}`));
      doc.head.appendChild(script);
    });

    const iframeAxe = (win as unknown as { axe?: AxeApi }).axe;
    if (!iframeAxe) {
      throw new Error(
        `loadAxeInIframe: ${url} loaded axe.js but iframe.window.axe is undefined`
      );
    }

    return {
      axe: iframeAxe,
      iframe,
      contentDocument: doc,
      dispose: () => dispose()
    };
  } catch (err) {
    dispose();
    throw err;
  }
}

function injectIntoHead(html: string, snippet: string): string {
  // Insert AFTER <head> if present so the snippet wins ordering against
  // existing in-head tags. Fall back to prepending to <html>, then to
  // raw prepend. Crude but adequate for static fixture HTML.
  const headMatch = /<head\b[^>]*>/i.exec(html);
  if (headMatch) {
    const insertAt = headMatch.index + headMatch[0].length;
    return html.slice(0, insertAt) + snippet + html.slice(insertAt);
  }
  const htmlMatch = /<html\b[^>]*>/i.exec(html);
  if (htmlMatch) {
    const insertAt = htmlMatch.index + htmlMatch[0].length;
    return (
      html.slice(0, insertAt) + `<head>${snippet}</head>` + html.slice(insertAt)
    );
  }
  return `<head>${snippet}</head>` + html;
}
