import processMessage from './process-message';
import clone from './clone';
import findBy from './find-by';
import extendMetaData from './extend-meta-data';
import incompleteFallbackMessage from '../reporters/helpers/incomplete-fallback-msg';

/**
 * Publish metadata from axe._audit.data
 * @param  {RuleResult} result Result to publish to
 * @private
 */
export default function publishMetaData(
  ruleResult: Record<string, unknown>
): void {
  // @ts-expect-error - axe is a global variable
  const checksData = (axe._audit.data.checks || {}) as Record<
    string,
    Record<string, unknown>
  >;
  // @ts-expect-error - axe is a global variable
  const rulesData = (axe._audit.data.rules || {}) as Record<
    string,
    Record<string, unknown>
  >;
  // @ts-expect-error - axe is a global variable
  const rule = (findBy(axe._audit.rules, 'id', ruleResult.id) || {}) as Record<
    string,
    unknown
  >;

  ruleResult.tags = clone(rule.tags || []);

  const shouldBeTrue = extender(checksData, true, rule);
  const shouldBeFalse = extender(checksData, false, rule);
  (ruleResult.nodes as Record<string, unknown>[]).forEach(detail => {
    (detail.any as Record<string, unknown>[]).forEach(shouldBeTrue);
    (detail.all as Record<string, unknown>[]).forEach(shouldBeTrue);
    (detail.none as Record<string, unknown>[]).forEach(shouldBeFalse);
  });
  extendMetaData(
    ruleResult,
    clone(rulesData[ruleResult.id as string] || {}) as Record<string, unknown>
  );
}

/**
 * Construct incomplete message from check.data
 * @param  {Object} checkData Check result with reason specified
 * @param  {Object} messages Source data object with message options
 * @return  {String}
 * @private
 */
function getIncompleteReason(
  checkData: Record<string, unknown> | null | undefined,
  messages: Record<string, unknown>
): unknown {
  function getDefaultMsg(message: Record<string, unknown>): unknown {
    if (
      message.incomplete &&
      (message.incomplete as Record<string, unknown>).default
    ) {
      // fall back to the default message if no reason specified
      return (message.incomplete as Record<string, unknown>).default;
    } else {
      return incompleteFallbackMessage();
    }
  }
  if (checkData && checkData.missingData) {
    try {
      const msg = (messages.incomplete as Record<string, unknown>)[
        (checkData.missingData as Record<string, unknown>[])[0]!
          .reason as string
      ];
      if (!msg) {
        throw new Error();
      }
      return msg;
    } catch {
      if (typeof checkData.missingData === 'string') {
        // return a string with the appropriate reason
        return (messages.incomplete as Record<string, unknown>)[
          checkData.missingData
        ];
      } else {
        return getDefaultMsg(messages);
      }
    }
  } else if (checkData && checkData.messageKey) {
    return (messages.incomplete as Record<string, unknown>)[
      checkData.messageKey as string
    ];
  } else {
    return getDefaultMsg(messages);
  }
}

/**
 * Extend checksData with the correct result message
 * @param  {Object} checksData The check result data
 * @param  {Boolean} shouldBeTrue Result of pass/fail check run
 * @param  {Object} rule The rule metadata
 * @return {Function}
 * @private
 */
function extender(
  checksData: Record<string, Record<string, unknown>>,
  shouldBeTrue: boolean,
  rule: Record<string, unknown>
): (check: Record<string, unknown>) => void {
  return (check: Record<string, unknown>) => {
    const sourceData = checksData[check.id as string] || {};
    const messages = (sourceData.messages || {}) as Record<string, unknown>;
    const data = Object.assign({}, sourceData) as Record<string, unknown>;
    delete data.messages;
    if (!rule.reviewOnFail && check.result === undefined) {
      // handle old doT template
      if (
        typeof messages.incomplete === 'object' &&
        !Array.isArray(check.data)
      ) {
        data.message = getIncompleteReason(
          check.data as Record<string, unknown>,
          messages
        );
      }

      // fallback to new process message style
      if (!data.message) {
        data.message = messages.incomplete;
      }
    } else {
      data.message =
        check.result === shouldBeTrue ? messages.pass : messages.fail;
    }

    // don't process doT template functions
    if (typeof data.message !== 'function') {
      data.message = processMessage(data.message as string, check.data);
    }

    extendMetaData(check, data);
  };
}
