/**
 * validate-definitions.ts
 *
 * Standalone script that validates axe-core rule and check JSON definition files.
 * Ported from packages/axe-core/build/tasks/validate.js to modern TypeScript with Zod.
 *
 * Usage:
 *   npx tsx packages/build-tools/src/validate-definitions.ts
 *
 * Exit codes:
 *   0 - All definitions are valid
 *   1 - One or more validation errors found
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { exit } from 'node:process';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(
  import.meta.dirname ?? new URL('.', import.meta.url).pathname,
  '../../..'
);
const AXE_CORE_ROOT = join(REPO_ROOT, 'packages', 'axe-core');
const RULES_DIR = join(AXE_CORE_ROOT, 'lib', 'rules');
const CHECKS_DIR = join(AXE_CORE_ROOT, 'lib', 'checks');

const IMPACT_VALUES = ['minor', 'moderate', 'serious', 'critical'] as const;

// ---------------------------------------------------------------------------
// Zod schemas — stricter than @axe-core/schemas for build-time validation
// ---------------------------------------------------------------------------

const ImpactSchema = z.enum(IMPACT_VALUES);

const CheckReferenceSchema = z.union([
  z.string(),
  z.object({ id: z.string() }).passthrough()
]);

const CheckDefinitionFileSchema = z.object({
  id: z.string(),
  excludeHidden: z.boolean().optional(),
  evaluate: z.string(),
  after: z.string().optional(),
  matches: z.string().optional(),
  options: z.unknown().optional(),
  enabled: z.boolean().optional(),
  metadata: z.object({
    impact: ImpactSchema.optional(),
    messages: z
      .object({
        pass: z
          .union([z.string(), z.record(z.string(), z.string())])
          .optional(),
        fail: z
          .union([z.string(), z.record(z.string(), z.string())])
          .optional(),
        incomplete: z
          .union([z.string(), z.record(z.string(), z.string())])
          .optional()
      })
      .refine(
        msgs => {
          const keys = Object.keys(msgs).filter(
            k => msgs[k as keyof typeof msgs] !== undefined
          );
          return keys.length >= 2;
        },
        {
          message:
            'Must have at least two valid message outcomes (pass/fail/incomplete)'
        }
      )
  })
});

const RuleDefinitionFileSchema = z.object({
  id: z.string(),
  selector: z.string().optional(),
  impact: ImpactSchema,
  excludeHidden: z.boolean().optional(),
  enabled: z.boolean().optional(),
  pageLevel: z.boolean().optional(),
  any: z.array(CheckReferenceSchema).optional(),
  all: z.array(CheckReferenceSchema).optional(),
  none: z.array(CheckReferenceSchema).optional(),
  tags: z.array(z.string()).optional(),
  actIds: z.array(z.string()).optional(),
  matches: z.string().optional(),
  reviewOnFail: z.boolean().optional(),
  metadata: z.object({
    description: z.string(),
    help: z.string()
  })
});

// ---------------------------------------------------------------------------
// Tag validation (ported from validate.js)
// ---------------------------------------------------------------------------

const MISC_TAGS = ['ACT', 'experimental', 'review-item', 'deprecated'];

const CATEGORIES = [
  'aria',
  'color',
  'forms',
  'keyboard',
  'language',
  'name-role-value',
  'parsing',
  'semantics',
  'sensory-and-visual-cues',
  'structure',
  'tables',
  'text-alternatives',
  'time-and-media'
];

interface StandardTagDef {
  name: string;
  standardRegex: RegExp;
  criterionRegex: RegExp;
  wcagLevelRegex?: RegExp;
}

const STANDARDS_TAGS: StandardTagDef[] = [
  {
    // Must be first — others rely on the WCAG level getting picked up first
    name: 'WCAG',
    standardRegex: /^wcag2(1|2)?a{1,3}(-obsolete)?$/,
    criterionRegex: /^wcag\d{3,4}$/
  },
  {
    name: 'Section 508',
    standardRegex: /^section508$/,
    criterionRegex: /^section508\.\d{1,2}\.[a-z]$/,
    wcagLevelRegex: /^wcag2aa?$/
  },
  {
    name: 'Trusted Tester',
    standardRegex: /^TTv5$/,
    criterionRegex: /^TT\d{1,3}\.[a-z]$/,
    wcagLevelRegex: /^wcag2aa?$/
  },
  {
    name: 'EN 301 549',
    standardRegex: /^EN-301-549$/,
    criterionRegex: /^EN-9\.[1-4]\.[1-9]\.\d{1,2}$/,
    wcagLevelRegex: /^wcag21?aa?$/
  },
  {
    name: 'RGAA',
    standardRegex: /^RGAAv4$/,
    criterionRegex: /^RGAA-\d{1,2}\.\d{1,2}\.\d{1,2}$/,
    wcagLevelRegex: /^wcag21?aa?$/
  }
];

function startsWith(arr1: string[], arr2: string[]): boolean {
  return arr2.every((item, i) => item === arr1[i]);
}

function removeTags(tags: string[], tagsToRemove: string[]): string[] {
  return tags.filter(tag => !tagsToRemove.includes(tag));
}

function findTagIssues(tags: string[]): string[] {
  const issues: string[] = [];
  const catTags = tags.filter(tag => tag.startsWith('cat.'));
  const bestPracticeTags = tags.filter(tag => tag === 'best-practice');

  // Category
  if (catTags.length !== 1) {
    issues.push(`Must have exactly one cat. tag, got ${String(catTags.length)}`);
  }
  if (catTags.length > 0 && !CATEGORIES.includes(catTags[0]!.slice(4))) {
    issues.push(`Invalid category tag: ${catTags[0]!}`);
  }
  if (!startsWith(tags, catTags)) {
    issues.push(`Tag ${catTags[0] ?? '(none)'} must be before ${tags[0] ?? '(none)'}`);
  }
  tags = removeTags(tags, catTags);

  // Best practice
  if (bestPracticeTags.length > 1) {
    issues.push(
      `Only one best-practice tag is allowed, got ${String(bestPracticeTags.length)}`
    );
  }
  if (bestPracticeTags.length > 0 && !startsWith(tags, bestPracticeTags)) {
    issues.push(
      `Tag ${bestPracticeTags[0]!} must be before ${tags[0] ?? '(none)'}`
    );
  }
  tags = removeTags(tags, bestPracticeTags);

  const standards: Record<
    string,
    { name: string; standardTag: string | null; criterionTags: string[] }
  > = {};

  // WCAG, Section 508, Trusted Tester, EN 301 549, RGAA
  for (const { name, standardRegex, criterionRegex, wcagLevelRegex } of STANDARDS_TAGS) {
    const standardTags = tags.filter(tag => standardRegex.test(tag));
    const criterionTags = tags.filter(tag => criterionRegex.test(tag));
    if (standardTags.length === 0 && criterionTags.length === 0) {
      continue;
    }

    standards[name] = {
      name,
      standardTag: standardTags[0] ?? null,
      criterionTags
    };

    if (name !== 'RGAA' && bestPracticeTags.length !== 0) {
      issues.push(`${name} tags cannot be used along side best-practice tag`);
    }
    if (standardTags.length === 0) {
      issues.push(`Expected one ${name} tag, got 0`);
    } else if (standardTags.length > 1) {
      issues.push(
        `Expected one ${name} tag, got: ${standardTags.join(', ')}`
      );
    }
    if (criterionTags.length === 0) {
      issues.push(`Expected at least one ${name} criterion tag, got 0`);
    }

    if (wcagLevelRegex && standards['WCAG']) {
      const wcagLevel = standards['WCAG'].standardTag;
      if (wcagLevel && !wcagLevelRegex.test(wcagLevel)) {
        issues.push(`${name} rules not allowed on ${wcagLevel}`);
      }
    }

    // EN 301 549 must match WCAG criteria
    if (name === 'EN 301 549' && standards['WCAG']) {
      const wcagCriteria = standards['WCAG'].criterionTags.map(tag =>
        tag.slice(4)
      );
      const enCriteria = criterionTags.map(tag =>
        tag.slice(5).replaceAll('.', '')
      );
      if (
        wcagCriteria.length !== enCriteria.length ||
        !startsWith(wcagCriteria, enCriteria)
      ) {
        issues.push(
          `Expect WCAG and EN criteria numbers to match: ${wcagCriteria.join(
            ', '
          )} vs ${enCriteria.join(', ')}}`
        );
      }
    }
    tags = removeTags(tags, [...standardTags, ...criterionTags]);
  }

  // Other tags
  const usedMiscTags = MISC_TAGS.filter(tag => tags.includes(tag));
  const unknownTags = removeTags(tags, usedMiscTags);
  if (unknownTags.length > 0) {
    issues.push(`Invalid tags: ${unknownTags.join(', ')}`);
  }

  // Check misc tag ordering
  tags = removeTags(tags, unknownTags);
  if (!startsWith(tags, usedMiscTags)) {
    issues.push(
      `Tags [${tags.join(', ')}] should be sorted like [${usedMiscTags.join(
        ', '
      )}]`
    );
  }

  return issues;
}

function validateRuleMetadata(
  rule: z.infer<typeof RuleDefinitionFileSchema>
): string[] {
  const { tags, metadata } = rule;
  if (!Array.isArray(tags) || typeof metadata !== 'object') {
    return [];
  }
  const issues: string[] = [];
  const prohibitedWord = tags.includes('best-practice') ? 'must' : 'should';
  const { description, help } = metadata;

  if (description.toLowerCase().includes(prohibitedWord)) {
    issues.push(
      `metadata.description can not contain the word '${prohibitedWord}'.`
    );
  }

  if (help.toLowerCase().includes(prohibitedWord)) {
    issues.push(`metadata.help can not contain the word '${prohibitedWord}'.`);
  }

  issues.push(...findTagIssues(tags));
  return issues;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries: string[];
    try {
      entries = readdirSync(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(current, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (entry.endsWith('.json')) {
          results.push(fullPath);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  }

  walk(dir);
  return results.sort();
}

// ---------------------------------------------------------------------------
// Validation runner
// ---------------------------------------------------------------------------

interface ValidationError {
  file: string;
  message: string;
}

function validateChecks(files: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Map<string, string>();

  for (const filePath of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      errors.push({
        file: filePath,
        message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`
      });
      continue;
    }

    const result = CheckDefinitionFileSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          file: filePath,
          message: `${issue.path.join('.')} — ${issue.message}`
        });
      }
      continue;
    }

    const check = result.data;

    // Unique ID check
    const existingPath = seenIds.get(check.id);
    if (existingPath !== undefined) {
      errors.push({
        file: filePath,
        message: `Duplicate check id "${check.id}" (first seen in ${existingPath})`
      });
    } else {
      seenIds.set(check.id, filePath);
    }

    // Messages must have at least two outcomes (pass/fail/incomplete)
    const msgKeys = Object.keys(check.metadata.messages);
    if (msgKeys.length < 2) {
      errors.push({
        file: filePath,
        message: `metadata.messages must have at least two outcomes (pass/fail/incomplete), got ${String(msgKeys.length)}`
      });
    }
  }

  return errors;
}

function validateRules(files: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenIds = new Map<string, string>();

  for (const filePath of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (err) {
      errors.push({
        file: filePath,
        message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`
      });
      continue;
    }

    const result = RuleDefinitionFileSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          file: filePath,
          message: `${issue.path.join('.')} — ${issue.message}`
        });
      }
      continue;
    }

    const rule = result.data;

    // Unique ID check
    const existingPath = seenIds.get(rule.id);
    if (existingPath !== undefined) {
      errors.push({
        file: filePath,
        message: `Duplicate rule id "${rule.id}" (first seen in ${existingPath})`
      });
    } else {
      seenIds.set(rule.id, filePath);
    }

    // Rule-specific tag and metadata validation
    const ruleIssues = validateRuleMetadata(rule);
    for (const issue of ruleIssues) {
      errors.push({ file: filePath, message: issue });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('Validating axe-core definitions...\n');

  const checkFiles = findJsonFiles(CHECKS_DIR);
  const ruleFiles = findJsonFiles(RULES_DIR);

  console.log(`Found ${String(checkFiles.length)} check definition(s)`);
  console.log(`Found ${String(ruleFiles.length)} rule definition(s)\n`);

  if (checkFiles.length === 0) {
    console.error('ERROR: No check JSON files found in ' + CHECKS_DIR);
    exit(1);
  }
  if (ruleFiles.length === 0) {
    console.error('ERROR: No rule JSON files found in ' + RULES_DIR);
    exit(1);
  }

  const checkErrors = validateChecks(checkFiles);
  const ruleErrors = validateRules(ruleFiles);
  const allErrors = [...checkErrors, ...ruleErrors];

  if (allErrors.length > 0) {
    console.error(`Found ${String(allErrors.length)} validation error(s):\n`);
    for (const err of allErrors) {
      console.error(`  ${err.file}`);
      console.error(`    ${err.message}\n`);
    }
    exit(1);
  }

  console.log('All definitions are valid.');
}

main();
