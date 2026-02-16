import serializeError from './serialize-error';

interface RuleErrorOptions {
  error: Error;
  ruleId?: string;
  method?: string;
  errorNode?: unknown;
}

export default class RuleError extends Error {
  ruleId?: string;
  method?: string;
  errorNode?: unknown;

  constructor({ error, ruleId, method, errorNode }: RuleErrorOptions) {
    super();
    this.name = error.name ?? 'RuleError';
    this.message = error.message;
    if (error.stack) {
      this.stack = error.stack;
    }
    if (error.cause) {
      this.cause = serializeError(error.cause);
    }
    if (ruleId) {
      this.ruleId = ruleId;
      this.message += ` Skipping ${this.ruleId} rule.`;
    }
    if (method) {
      this.method = method;
    }
    if (errorNode) {
      this.errorNode = errorNode;
    }
  }
}
