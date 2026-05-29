// Synthetic-audit helper — builds a minimal `Audit`-shaped object from the
// engine's evaluator map and per-check JSON manifests, without depending on
// `axe._audit` at all.
//
// =============================================================================
// Why this exists (Sprint 5 #16-C)
// =============================================================================
//
// Many older check tests reach into `axe._audit.checks[id]` to call the
// evaluator. After Sprint 5 #16-A removed the UMD-bundle import, the cleanest
// migration target for those tests is a stand-alone factory that hands back
// a plain object shaped like the runtime `Audit`:
//
//   const audit = createSyntheticAudit(['fallbackrole']);
//   audit.checks['fallbackrole'].evaluate(actualNode, options, virtualNode);
//
// The factory is **fully static** — at import time, Vite eagerly inlines:
//   - `lib/core/base/metadata-function-map.ts` (evaluator function lookup), and
//   - every `lib/checks/<category>/<id>.json` file (metadata/options/after).
//
// Construction is cheap (object spread + map lookups), so callers can build
// per-test audits without worrying about cost. There is intentionally no
// caching, no async fetch, and no rule registry — tests that need
// cross-rule helpers (`audit.rules`, `_audit.<rule>`) should stay on
// `.test.ts.todo` and be revisited in Sprint 5b.

import metadataFunctionMap from '../../../lib/core/base/metadata-function-map';

// Vite eagerly inlines every check JSON manifest at build time. The keys are
// the absolute-from-repo-root paths (e.g. `/lib/checks/aria/aria-busy.json`);
// values are the parsed JSON objects. We re-key by `id` below.
//
// `import.meta.glob` with `eager: true` and a JSON pattern is the canonical
// Vite-native way to bulk-import static data; no `fs` access at runtime.
const checkManifestModules = import.meta.glob<CheckManifest>(
  '../../../lib/checks/**/*.json',
  { eager: true, import: 'default' }
);

interface CheckManifest {
  id: string;
  evaluate: string;
  after?: string;
  options?: unknown;
  metadata?: unknown;
  deprecated?: boolean;
}

const manifestById: Record<string, CheckManifest> = {};
for (const manifest of Object.values(checkManifestModules)) {
  if (manifest && typeof manifest === 'object' && 'id' in manifest) {
    manifestById[manifest.id] = manifest;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EvaluateFn = (
  this: any,
  node: any,
  options: any,
  virtualNode: any,
  context?: any
) => any;

export interface SyntheticCheck {
  id: string;
  evaluate: EvaluateFn;
  after?: EvaluateFn;
  options?: unknown;
  metadata?: unknown;
}

export interface SyntheticAudit {
  checks: Record<string, SyntheticCheck>;
  rules?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/**
 * Build a minimal audit-shaped object containing the requested checks.
 *
 * For tests that previously reached into `axe._audit.checks[id]`. Tests that
 * need `audit.rules` or richer state should stay on `.test.ts.todo` for
 * Sprint 5b — this helper deliberately does not synthesize a rule registry.
 */
export function createSyntheticAudit(checkIds: string[]): SyntheticAudit {
  const checks: Record<string, SyntheticCheck> = {};
  for (const id of checkIds) {
    const manifest = manifestById[id];
    if (!manifest) {
      throw new Error(
        `createSyntheticAudit: unknown check id "${id}". ` +
          `Looked under lib/checks/**/*.json — make sure the JSON manifest exists.`
      );
    }
    const evaluateKey = manifest.evaluate;
    const evaluateFn = (
      metadataFunctionMap as Record<string, EvaluateFn | undefined>
    )[evaluateKey];
    if (!evaluateFn) {
      throw new Error(
        `createSyntheticAudit: evaluator "${evaluateKey}" not found in ` +
          `metadata-function-map for check "${id}".`
      );
    }
    const afterFn = manifest.after
      ? (metadataFunctionMap as Record<string, EvaluateFn | undefined>)[
          manifest.after
        ]
      : undefined;
    checks[id] = {
      id,
      evaluate: evaluateFn,
      ...(afterFn ? { after: afterFn } : {}),
      ...(manifest.options !== undefined ? { options: manifest.options } : {}),
      ...(manifest.metadata !== undefined
        ? { metadata: manifest.metadata }
        : {})
    };
  }
  return { checks };
}
