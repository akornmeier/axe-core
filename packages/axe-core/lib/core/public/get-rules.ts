import type { RuleMetadata } from '@axe-core/schemas';

declare const axe: {
  _audit: {
    rules: Array<{ id: string; tags: string[]; actIds?: string[] }>;
    data: {
      rules?: Record<
        string,
        { description?: string; help?: string; helpUrl?: string }
      >;
    };
  };
};

/**
 * Searches and returns rules that contain a tag in the list of tags.
 * @param  tags  Optional array of tags
 * @return Array of rules
 */
function getRules(tags?: string[]): RuleMetadata[] {
  tags = tags || [];
  const matchingRules = !tags.length
    ? axe._audit.rules
    : axe._audit.rules.filter(item => {
        return !!tags!.filter(tag => {
          return item.tags.indexOf(tag) !== -1;
        }).length;
      });

  const ruleData = axe._audit.data.rules || {};
  return matchingRules.map(matchingRule => {
    const rd = ruleData[matchingRule.id] || {};
    return {
      ruleId: matchingRule.id,
      description: rd.description || '',
      help: rd.help || '',
      helpUrl: rd.helpUrl || '',
      tags: matchingRule.tags,
      actIds: matchingRule.actIds
    };
  });
}

export default getRules;
