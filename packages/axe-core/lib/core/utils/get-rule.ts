/**
 * Get an axe rule by id.
 * @param {String} ruelId the rule id
 * @return {Rule}
 */
export default function getRule(ruleId: string): unknown {
  // TODO: es-modules_audit
  // @ts-expect-error - axe is a global
  const rule = axe._audit.rules.find(({ id }: { id: string }) => id === ruleId);

  if (!rule) {
    throw new Error(`Cannot find rule by id: ${ruleId}`);
  }

  return rule;
}
