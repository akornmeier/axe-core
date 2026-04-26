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
