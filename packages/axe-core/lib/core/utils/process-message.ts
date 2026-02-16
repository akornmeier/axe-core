import { incompleteFallbackMessage } from '../reporters/helpers';

const dataRegex = /\$\{\s?data\s?\}/g;

/**
 * Replace a placeholder with the value of a data string or object
 * @param {String} str
 * @param {String|Object} data
 */
function substitute(
  str: string,
  data: string | Record<string, unknown> | unknown[] | unknown
): string {
  // replace all instances of ${ data } with the value of the string
  if (typeof data === 'string') {
    return str.replace(dataRegex, data);
  }

  // replace all instances of ${ data[prop] } with the value of the property
  for (const prop in data as Record<string, unknown>) {
    if ((data as Record<string, unknown>).hasOwnProperty(prop)) {
      const regex = new RegExp('\\${\\s?data\\.' + prop + '\\s?}', 'g');
      const replace =
        typeof (data as Record<string, unknown>)[prop] === 'undefined'
          ? ''
          : String((data as Record<string, unknown>)[prop]);
      str = str.replace(regex, replace);
    }
  }

  return str;
}

interface MessageObject {
  singular?: string;
  plural?: string;
  default?: string;
  incomplete?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Process a metadata message.
 * @param {String|Object} message
 * @param {Object} data
 * @return {String}
 */
function processMessage(
  message: string | MessageObject | undefined | null,
  data: unknown
): string | undefined {
  if (!message) {
    return;
  }

  // data as array
  if (Array.isArray(data)) {
    (data as unknown as Record<string, unknown>).values = (
      data as unknown[]
    ).join(', ');

    if (
      typeof (message as MessageObject).singular === 'string' &&
      typeof (message as MessageObject).plural === 'string'
    ) {
      const str =
        data.length === 1
          ? (message as MessageObject).singular!
          : (message as MessageObject).plural!;
      return substitute(str, data);
    }

    // no singular/plural message so just pass data
    return substitute(message as string, data);
  }

  // message is a string that uses data as a string or object properties
  if (typeof message === 'string') {
    return substitute(message, data as string | Record<string, unknown>);
  }

  // message is an object that uses value of data to determine message
  if (typeof data === 'string') {
    const str = (message as Record<string, string>)[data]!;
    return substitute(str, data);
  }

  // message uses value of data property to determine message
  let str: string | MessageObject =
    (message as MessageObject).default ||
    (incompleteFallbackMessage() as string);

  if (
    data &&
    (data as Record<string, unknown>).messageKey &&
    (message as Record<string, unknown>)[
      (data as Record<string, unknown>).messageKey as string
    ]
  ) {
    str = (message as Record<string, unknown>)[
      (data as Record<string, unknown>).messageKey as string
    ] as string;
  }

  return processMessage(str as string | MessageObject, data);
}

export default processMessage;
