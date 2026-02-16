declare const axe: {
  _audit: {
    data: {
      incompleteFallbackMessage: string | (() => string);
    };
  };
};

/**
 * Provides a fallback message in case incomplete checks don't provide one
 * This mechanism allows the string to be localized.
 * @return fallback message string
 */
export default function incompleteFallbackMessage(): string {
  let { incompleteFallbackMessage: message } = axe._audit.data;
  if (typeof message === 'function') {
    message = message();
  }
  if (typeof message !== 'string') {
    return '';
  }
  return message;
}
