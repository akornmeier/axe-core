/**
 * Ensure all rules that are expected to run exist
 */
export default function normalizeRunOptions(
  options: Record<string, unknown> = {}
): Record<string, unknown> {
  const tags: string[] = [];
  const ruleIds: string[] = [];
  // @ts-expect-error - axe is a global
  axe._audit.rules.forEach((rule: Record<string, unknown>) => {
    ruleIds.push(rule.id as string);
    (rule.tags as string[]).forEach(tag => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });
  });
  // Validate runOnly
  if (['object', 'string'].includes(typeof options.runOnly)) {
    if (typeof options.runOnly === 'string') {
      options.runOnly = [options.runOnly];
    }
    if (Array.isArray(options.runOnly)) {
      const hasTag = (options.runOnly as string[]).find(value =>
        tags.includes(value)
      );
      const hasRule = (options.runOnly as string[]).find(value =>
        ruleIds.includes(value)
      );
      if (hasTag && hasRule) {
        throw new Error('runOnly cannot be both rules and tags');
      }
      if (hasRule) {
        options.runOnly = {
          type: 'rule',
          values: options.runOnly
        };
      } else {
        options.runOnly = {
          type: 'tag',
          values: options.runOnly
        };
      }
    }
    const only = options.runOnly as Record<string, unknown>;
    if (only.value && !only.values) {
      only.values = only.value;
      delete only.value;
    }
    if (
      !Array.isArray(only.values) ||
      (only.values as unknown[]).length === 0
    ) {
      throw new Error('runOnly.values must be a non-empty array');
    }
    if (['rule', 'rules'].includes(only.type as string)) {
      only.type = 'rule';
      (only.values as string[]).forEach(ruleId => {
        if (!ruleIds.includes(ruleId)) {
          throw new Error('unknown rule `' + ruleId + '` in options.runOnly');
        }
      });
    } else if (
      ['tag', 'tags', undefined].includes(only.type as string | undefined)
    ) {
      only.type = 'tag';

      const unmatchedTags = (only.values as string[]).filter(
        tag => !tags.includes(tag) && !/wcag2[1-3]a{1,3}/.test(tag)
      );
      if (unmatchedTags.length !== 0) {
        // @ts-expect-error - axe is a global
        axe.log('Could not find tags `' + unmatchedTags.join('`, `') + '`');
      }
    } else {
      throw new Error(`Unknown runOnly type '${only.type}'`);
    }
  }
  if (typeof options.rules === 'object') {
    Object.keys(options.rules as Record<string, unknown>).forEach(ruleId => {
      if (!ruleIds.includes(ruleId)) {
        throw new Error('unknown rule `' + ruleId + '` in options.rules');
      }
    });
  }
  return options;
}
