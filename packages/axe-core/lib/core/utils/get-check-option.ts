/**
 * Determines which CheckOption to use, either defined on the rule options, global check options or the check itself
 * @param  {Check} check    The Check object
 * @param  {String} ruleID  The ID of the rule
 * @param  {Object} options Options object as passed to main API
 * @return {Object}         The resolved object with `options` and `enabled` keys
 */
function getCheckOption(
  check: Record<string, unknown>,
  ruleID: string,
  options: Record<string, unknown>
): { enabled: unknown; options: unknown; absolutePaths: unknown } {
  const ruleCheckOption = (((
    (((options.rules as Record<string, unknown>) &&
      (options.rules as Record<string, Record<string, unknown>>)[ruleID]) ||
      {}) as Record<string, unknown>
  ).checks as Record<string, Record<string, unknown>>) ||
    ({} as Record<string, Record<string, unknown>>))[check.id as string] as
    | Record<string, unknown>
    | undefined;
  const checkOption = ((options.checks as Record<
    string,
    Record<string, unknown>
  >) || ({} as Record<string, Record<string, unknown>>))[check.id as string];

  let enabled = check.enabled;
  let opts = check.options;

  if (checkOption) {
    if (checkOption.hasOwnProperty('enabled')) {
      enabled = checkOption.enabled;
    }
    if (checkOption.hasOwnProperty('options')) {
      opts = checkOption.options;
    }
  }

  if (ruleCheckOption) {
    if (ruleCheckOption.hasOwnProperty('enabled')) {
      enabled = ruleCheckOption.enabled;
    }
    if (ruleCheckOption.hasOwnProperty('options')) {
      opts = ruleCheckOption.options;
    }
  }

  return {
    enabled: enabled,
    options: opts,
    absolutePaths: options.absolutePaths
  };
}

export default getCheckOption;
