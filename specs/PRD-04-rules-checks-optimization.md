# Phase 4: Rules & Checks Optimization

**PRD Version:** 2.0
**Date:** February 16, 2026
**Status:** Draft
**Phase Duration:** 4–6 weeks
**Dependencies:** Phases 1–3 complete
**Team:** 2 engineers

---

## 1. Overview

### 1.1 Executive Summary

With TypeScript (Phase 1), Vite 8/Rolldown (Phase 2), and Vitest (Phase 3) in place, we can now optimize the rule and check system to fully leverage the new infrastructure. This phase is where the investment pays dividends.

axe-core currently has ~90+ rules composed of ~150+ checks. Rule and check definitions are JSON files with runtime JavaScript evaluators — a pattern designed for the Grunt concatenation era. The new module system and type safety enable a fundamentally better architecture: type-safe rule definitions with compile-time validation, tree-shakeable rule bundles for consumers who only need a subset, Zod-validated configuration at every boundary, and optimized check evaluators that benefit from Rolldown's dead-code elimination.

### 1.2 Objectives

- Convert all rule/check definitions from JSON + loose JS to typed TypeScript modules
- Implement Zod schema validation for rule/check definitions using schemas from `@axe-core/schemas` (catch misconfigurations at build time, not runtime)
- Enable tree-shakeable rule bundles (consumers can import only the rules they need)
- Optimize check evaluators for modern browser APIs (remove polyfill workarounds)
- Implement a typed rule registry that validates rule composition at compile time
- Improve ARIA spec data as typed, validated constants
- Reduce overall bundle size through dead-code elimination
- Expose new bundle entry points in `packages/axe-core/package.json` exports map

### 1.3 Success Criteria

- All rule/check definitions are TypeScript modules with Zod validation
- `turbo run typecheck` catches invalid rule definitions at compile time
- Tree-shakeable entry points available (e.g., `import { wcag2aaRules } from 'axe-core/bundles/wcag2aa'`)
- Bundle size reduced by ≥10% (target: ≤220KB for full `axe.min.js`)
- Check evaluators use native browser APIs (no polyfill-era workarounds)
- Rule execution performance maintained or improved (benchmarked)
- Zero regressions in accessibility detection accuracy

---

## 2. Technical Specification

### 2.1 Typed Rule Definition System

**Current architecture (JSON + loose JS):**
```
packages/axe-core/lib/rules/
├── color-contrast/
│   ├── color-contrast.json    # Rule metadata
│   └── color-contrast-after.js # After function
packages/axe-core/lib/checks/
├── color/
│   ├── color-contrast-evaluate.js
│   └── color-contrast-evaluate.json
```

The JSON files define metadata, tags, and check composition. The JS files are evaluators. These are stitched together by the `vite-plugin-axe-metadata` plugin in `packages/build-tools/`.

**New architecture (typed TypeScript modules):**

```typescript
// packages/axe-core/lib/rules/color-contrast/rule.ts
import { defineRule } from '../../core/define-rule';
import { colorContrastEvaluate } from '../../checks/color/color-contrast-evaluate';
import { colorContrastAfter } from './color-contrast-after';

export const colorContrastRule = defineRule({
  id: 'color-contrast',
  impact: 'serious',
  tags: ['cat.color', 'wcag2aa', 'wcag143', 'TTv5', 'TT13.c', 'EN-301-549', 'ACT'],
  actIds: ['afw4f7'],
  metadata: {
    description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds',
    help: 'Elements must meet minimum color contrast ratio thresholds',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/color-contrast',
  },
  selector: '*',
  matches: 'color-contrast-matches',
  excludeHidden: true,
  all: [],
  any: [colorContrastEvaluate],
  none: [],
  after: [colorContrastAfter],
});
```

### 2.2 `defineRule` and `defineCheck` — Typed Factories

These factory functions validate the rule/check definition at both compile time (TypeScript) and build time (Zod). The schemas are imported from the `@axe-core/schemas` workspace package:

```typescript
// packages/axe-core/lib/core/define-rule.ts
import { RuleDefinitionSchema, type RuleDefinition } from '@axe-core/schemas';

export function defineRule(definition: RuleDefinition): RuleDefinition {
  if (process.env.NODE_ENV !== 'production') {
    RuleDefinitionSchema.parse(definition);
  }
  return definition;
}
```

```typescript
// packages/axe-core/lib/core/define-check.ts
import { CheckDefinitionSchema, type CheckDefinition } from '@axe-core/schemas';

export function defineCheck(definition: CheckDefinition): CheckDefinition {
  if (process.env.NODE_ENV !== 'production') {
    CheckDefinitionSchema.parse(definition);
  }
  return definition;
}
```

The actual Zod schema definitions live in `packages/schemas/src/`:

```typescript
// packages/schemas/src/rule-definition.schema.ts
import { z } from 'zod';

const ImpactSchema = z.enum(['minor', 'moderate', 'serious', 'critical']);

export const RuleDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  impact: ImpactSchema.optional(),
  tags: z.array(z.string()).min(1),
  actIds: z.array(z.string()).optional(),
  metadata: z.object({
    description: z.string().min(10),
    help: z.string().min(10),
    helpUrl: z.string().url(),
  }),
  selector: z.string().optional(),
  matches: z.union([z.string(), z.function()]).optional(),
  excludeHidden: z.boolean().optional(),
  all: z.array(z.any()), // Check references
  any: z.array(z.any()),
  none: z.array(z.any()),
  after: z.array(z.function()).optional(),
  enabled: z.boolean().optional().default(true),
});

export type RuleDefinition = z.infer<typeof RuleDefinitionSchema>;
```

```typescript
// packages/schemas/src/check-definition.schema.ts
import { z } from 'zod';

export const CheckDefinitionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  evaluate: z.function(),
  after: z.function().optional(),
  options: z.record(z.unknown()).optional(),
  metadata: z.object({
    impact: z.enum(['minor', 'moderate', 'serious', 'critical']),
    messages: z.object({
      pass: z.union([z.string(), z.function()]),
      fail: z.union([z.string(), z.function()]),
      incomplete: z.union([z.string(), z.record(z.string())]).optional(),
    }),
  }),
});

export type CheckDefinition = z.infer<typeof CheckDefinitionSchema>;
```

### 2.3 Tree-Shakeable Rule Bundles

With rules defined as TypeScript modules, we can create subset entry points:

```typescript
// packages/axe-core/lib/bundles/wcag2a.ts — Only WCAG 2.0 Level A rules
export { documentTitleRule } from '../rules/document-title/rule';
export { htmlHasLangRule } from '../rules/html-has-lang/rule';
export { imageAltRule } from '../rules/image-alt/rule';
// ... other Level A rules

// packages/axe-core/lib/bundles/wcag2aa.ts — WCAG 2.0 Level A + AA
export * from './wcag2a';
export { colorContrastRule } from '../rules/color-contrast/rule';
export { linkNameRule } from '../rules/link-name/rule';
// ... other Level AA rules

// packages/axe-core/lib/bundles/best-practices.ts
export { headingOrderRule } from '../rules/heading-order/rule';
export { regionRule } from '../rules/region/rule';
// ... other best practice rules
```

Consumers can import specific bundles:

```typescript
// Consumer code — only loads WCAG 2 AA rules
import axe from 'axe-core';
import { wcag2aaRules } from 'axe-core/bundles/wcag2aa';

axe.configure({ rules: wcag2aaRules });
const results = await axe.run();
```

This is exposed via `packages/axe-core/package.json` exports:

```jsonc
{
  "exports": {
    ".": {
      "import": { "types": "./dist/axe.d.ts", "default": "./dist/axe.mjs" },
      "require": { "types": "./dist/axe.d.ts", "default": "./dist/axe.cjs" }
    },
    "./bundles/wcag2a": { "import": "./dist/bundles/wcag2a.mjs" },
    "./bundles/wcag2aa": { "import": "./dist/bundles/wcag2aa.mjs" },
    "./bundles/wcag2aaa": { "import": "./dist/bundles/wcag2aaa.mjs" },
    "./bundles/wcag21a": { "import": "./dist/bundles/wcag21a.mjs" },
    "./bundles/wcag21aa": { "import": "./dist/bundles/wcag21aa.mjs" },
    "./bundles/wcag22aa": { "import": "./dist/bundles/wcag22aa.mjs" },
    "./bundles/best-practices": { "import": "./dist/bundles/best-practices.mjs" },
    "./bundles/section508": { "import": "./dist/bundles/section508.mjs" },
    "./locales/*": "./locales/*.json"
  }
}
```

**Bundle size impact:** Consumers importing only WCAG 2 AA rules would see ~40–50% smaller bundles compared to the full `axe.min.js`. This is a major win for performance-sensitive environments like CI runners and browser extensions.

### 2.4 Check Evaluator Modernization

With polyfills removed (Phase 3) and modern browser targets established, check evaluators can use native APIs directly:

#### 2.4.1 Color Contrast — Use CSS Typed OM

```typescript
// Before (polyfill-era)
function getComputedStyle(node) {
  // Various fallbacks for IE, old WebKit, etc.
  if (node.currentStyle) { /* IE path */ }
  return window.getComputedStyle(node);
}

// After (modern)
function getForegroundColor(el: HTMLElement): string {
  return el.computedStyleMap().get('color')?.toString() ?? '';
}
```

#### 2.4.2 Focus Management — Use `:focus-visible`

```typescript
// Before (polyfill-era)
function isFocusable(el) {
  // Complex logic to determine focus-visibility across browsers
}

// After (modern)
function isFocusVisible(el: Element): boolean {
  return el.matches(':focus-visible');
}
```

#### 2.4.3 Target Size — Use `getClientRects()`

```typescript
// Modern target size check — no polyfills needed
function getTargetSize(element: Element): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}
```

#### 2.4.4 ARIA Validation — Typed Spec Data

```typescript
// packages/axe-core/lib/standards/aria-roles.ts — fully typed from Phase 1
import { AriaRoleSchema, type AriaRole } from '@axe-core/schemas';

// The role definitions are now compile-time validated
export const ariaRoles: Record<string, AriaRole> = {
  alert: {
    type: 'live',
    requiredAttrs: [],
    supportedAttrs: ['aria-atomic', 'aria-busy', 'aria-label', 'aria-labelledby'],
    nameFrom: ['author'],
    childrenPresentational: false,
  },
  // ... all other roles
};
```

### 2.5 Rule Configuration Validation

With Zod schemas from `@axe-core/schemas`, `axe.configure()` can validate rule overrides at development time:

```typescript
// packages/axe-core/lib/core/public/configure.ts
import { ConfigurationSchema } from '@axe-core/schemas';
import { ruleRegistry } from '../rule-registry';

export function configure(config: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    const result = ConfigurationSchema.safeParse(config);
    if (!result.success) {
      throw new TypeError(
        `axe.configure(): Invalid configuration.\n` +
        result.error.issues.map(i =>
          `  - ${i.path.join('.')}: ${i.message}`
        ).join('\n')
      );
    }

    // Validate that referenced rule IDs actually exist
    if (result.data.rules) {
      for (const ruleId of Object.keys(result.data.rules)) {
        if (!ruleRegistry.has(ruleId)) {
          console.warn(
            `axe.configure(): Unknown rule "${ruleId}". ` +
            `This rule will be ignored. Available rules: ${ruleRegistry.listIds().join(', ')}`
          );
        }
      }
    }
  }

  // Apply configuration...
}
```

### 2.6 Performance Benchmarking

A benchmark suite is added to track rule execution performance across releases:

```typescript
// packages/axe-core/bench/rules.bench.ts
import { bench, describe } from 'vitest';
import { run } from '../lib/core/public/run';

describe('axe.run() performance', () => {
  bench('full scan — simple page', async () => {
    document.body.innerHTML = '<h1>Title</h1><p>Content</p><img src="test.png" alt="test">';
    await run(document);
  });

  bench('full scan — complex page (100 elements)', async () => {
    document.body.innerHTML = generateComplexPage(100);
    await run(document);
  });

  bench('wcag2aa only — simple page', async () => {
    document.body.innerHTML = '<h1>Title</h1><p>Content</p>';
    await run(document, { runOnly: { type: 'tag', values: ['wcag2aa'] } });
  });
});
```

Run with: `pnpm --filter axe-core vitest bench`

---

## 3. Migration Plan

### Sprint 1: Rule/Check Conversion (Weeks 1–2)
- Implement `defineRule()` and `defineCheck()` factory functions importing schemas from `@axe-core/schemas`
- Add `RuleDefinitionSchema` and `CheckDefinitionSchema` to `packages/schemas/src/`
- Convert 10 representative rules (mix of simple and complex) to TypeScript modules
- Verify the build produces identical output for converted rules via `turbo run build`
- Implement the typed rule registry

### Sprint 2: Bulk Conversion (Weeks 3–4)
- Convert all remaining rules and checks to TypeScript modules
- Create tree-shakeable bundle entry points in `packages/axe-core/lib/bundles/`
- Update `packages/axe-core/vite.config.ts` to build bundle entry points
- Remove all rule/check JSON definition files
- Simplify `vite-plugin-axe-metadata` in `packages/build-tools/` (or replace with direct imports)

### Sprint 3: Optimization & Benchmarking (Weeks 5–6)
- Modernize check evaluators to use native browser APIs
- Update ARIA spec data to fully typed constants validated by `@axe-core/schemas`
- Implement performance benchmark suite
- Measure and optimize bundle size for each bundle entry point
- Update `packages/axe-core/package.json` exports map with bundle entry points
- Final integration testing across all downstream packages

---

## 4. Technical Considerations

### 4.1 Backward Compatibility — Rule Configuration

Consumers use `axe.configure({ rules: { 'color-contrast': { enabled: false } } })`. This API must continue to work exactly as before. The internal representation changes (typed modules instead of JSON), but the public configuration API is unchanged.

### 4.2 Custom Rules

axe-core supports custom rules via `axe.configure()`. The `defineRule()` and `defineCheck()` functions should be exported for custom rule authors:

```typescript
import { defineRule, defineCheck } from 'axe-core';

const myCheck = defineCheck({
  id: 'my-custom-check',
  evaluate: (node) => { /* ... */ return true; },
  metadata: {
    impact: 'moderate',
    messages: { pass: 'Check passed', fail: 'Check failed' },
  },
});

const myRule = defineRule({
  id: 'my-custom-rule',
  tags: ['custom'],
  metadata: {
    description: 'My custom accessibility rule',
    help: 'Custom check help text',
    helpUrl: 'https://example.com/rules/my-custom-rule',
  },
  any: [myCheck],
  all: [],
  none: [],
});
```

### 4.3 Locale Integration

Localized messages are currently loaded from JSON and patched into rule/check metadata at runtime. With typed definitions, locales become type-checked overlays:

```typescript
// packages/axe-core/lib/core/locale-loader.ts
import type { RuleDefinition } from '@axe-core/schemas';
import { LocaleSchema } from '@axe-core/schemas';

export function applyLocale(
  rules: Map<string, RuleDefinition>,
  locale: unknown
): void {
  const validated = LocaleSchema.parse(locale);

  for (const [ruleId, translations] of Object.entries(validated.rules)) {
    const rule = rules.get(ruleId);
    if (rule) {
      rule.metadata.description = translations.description;
      rule.metadata.help = translations.help;
    }
  }
}
```

### 4.4 Bundle Size Projections

| Bundle | Current (est.) | Projected | Reduction |
|---|---|---|---|
| `axe.min.js` (all rules) | ~250KB | ~220KB | ~12% |
| `wcag2aa` bundle | N/A (not possible) | ~140KB | New capability |
| `wcag2a` bundle | N/A | ~90KB | New capability |
| `best-practices` bundle | N/A | ~50KB | New capability |

Reductions come from: better tree-shaking (Rolldown), dead-code elimination of dev-only Zod validation, removal of polyfills, and modern minification (Oxc minifier).

### 4.5 Turborepo Caching for Rule Development

With the monorepo structure, most rule-focused PRs only touch `packages/axe-core/lib/rules/` and `packages/axe-core/lib/checks/`. Turborepo caches the `@axe-core/schemas` and `@axe-core/build-tools` builds, so the CI cycle for a rule-only change is:

1. `schemas` build → **cache hit** (0.2s)
2. `build-tools` build → **cache hit** (0.2s)
3. `axe-core` build → **rebuild** (~6s)
4. `axe-core` test → **rebuild** (~15s)

Total CI time for a typical rule PR: ~25s vs. current ~3–4 minutes.

---

## 5. Deliverables

| Deliverable | Description |
|---|---|
| `packages/schemas/src/rule-definition.schema.ts` | Zod schema for rule definitions |
| `packages/schemas/src/check-definition.schema.ts` | Zod schema for check definitions |
| `packages/axe-core/lib/core/define-rule.ts` | Typed rule factory with Zod validation |
| `packages/axe-core/lib/core/define-check.ts` | Typed check factory with Zod validation |
| `packages/axe-core/lib/core/rule-registry.ts` | Central typed registry for all rules |
| `packages/axe-core/lib/rules/**/*.ts` | All rules converted to TypeScript modules |
| `packages/axe-core/lib/checks/**/*.ts` | All checks converted to TypeScript modules |
| `packages/axe-core/lib/bundles/*.ts` | Tree-shakeable bundle entry points |
| `packages/axe-core/lib/standards/aria-roles.ts` | Typed ARIA role definitions |
| `packages/axe-core/bench/rules.bench.ts` | Performance benchmark suite |
| Updated `packages/axe-core/package.json` exports | Bundle + schemas entry points |

---

## 5.1 Phase 3 Carryover — Known Regressions

Surfaced during Phase 3 Sprint 1 pilot migration (2026-04-25); deferred to Phase 4 because they live in `lib/commons/color/` which Phase 3's scope guard forbids modifying.

| Item | Location | Symptom | Notes |
|---|---|---|---|
| Color-algebra NaN | `lib/commons/color/flatten-colors.ts`, `lib/commons/color/stacking-context.ts` | `flatten-colors` returns `#0NaN0NaN0NaN` for the color-contrast pass case under Vitest Browser Mode + Playwright (Chromium). Computed-style read is correct (real `rgb()` values reach the function); NaN appears during stacking-context blending. | Karma+Mocha pipeline did not surface this — possibly because the pilot test asserts on the raw output where the legacy test asserted only on a derived contrast ratio. Phase 4 must pick up the algebra fix as part of `lib/checks/color/` modernization. Pilot test (`test/browser/checks/color/color-contrast.test.ts`) is currently asserting against the broken state with a `// FIXME(phase-04)` comment so Phase 3 CI stays green. |

## 6. Open Questions

1. **Tree-shakeable bundles — semver implications**: Exposing `axe-core/bundles/wcag2aa` as a public entry point means it becomes part of the public API. Adding/removing rules from a bundle would need to follow semver. Is this acceptable? **Leaning yes** — rule additions to a WCAG level bundle are additive (minor), rule removals are breaking (major). This aligns with how consumers already think about WCAG versions.
2. **Custom rule author DX**: Should `defineRule` / `defineCheck` require Zod schemas for custom checks' `data` return values? This would improve type safety but adds friction. **Recommendation:** No — keep the `data` field as `z.unknown()` for custom rules. Typed first-party rules can use stricter schemas internally.
3. **ARIA spec data sourcing**: Should we auto-generate the ARIA role data from the WAI-ARIA spec, or continue hand-maintaining it? **Recommendation:** Semi-automated — scrape the spec into a JSON file, then import and validate against `AriaRoleSchema` from `@axe-core/schemas`. Human review on each spec update.
4. **Rule deprecation strategy**: Some rules may become obsolete as browser support improves. Should we add a `deprecated` flag to `defineRule` and emit warnings? **Recommendation:** Yes — add `deprecated: z.boolean().optional()` to `RuleDefinitionSchema`. Emit console.warn in dev mode when deprecated rules are enabled.
