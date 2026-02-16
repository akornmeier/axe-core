const errorTypes: readonly string[] = Object.freeze([
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError'
]);

export interface FrameMessageData {
  topic?: string | null;
  channelId: string;
  message: unknown;
  messageId?: string;
  keepalive?: boolean;
}

interface SerializedMessageData {
  channelId: string;
  topic?: string | null;
  messageId?: string;
  keepalive: boolean;
  source: string;
  error?: { name: string; message: string; stack?: string };
  payload?: unknown;
}

export interface ParsedMessageData {
  topic?: string | null;
  message: unknown;
  messageId?: string;
  channelId: string;
  keepalive: boolean;
}

export function stringifyMessage({
  topic,
  channelId,
  message,
  messageId,
  keepalive
}: FrameMessageData): string {
  const data: SerializedMessageData = {
    channelId,
    keepalive: !!keepalive,
    source: getSource()
  };
  if (topic !== undefined) {
    data.topic = topic;
  }
  if (messageId !== undefined) {
    data.messageId = messageId;
  }

  if (message instanceof Error) {
    const errorObj: { name: string; message: string; stack?: string } = {
      name: message.name,
      message: message.message
    };
    if (message.stack !== undefined) {
      errorObj.stack = message.stack;
    }
    data.error = errorObj;
  } else {
    data.payload = message;
  }
  return JSON.stringify(data);
}

/**
 * Parse the received message for processing
 * @param  {string} dataString Message received
 * @return {object}            Object to be used for pub/sub
 */
export function parseMessage(
  dataString: unknown
): ParsedMessageData | undefined {
  let data: SerializedMessageData;
  try {
    data = JSON.parse(dataString as string);
  } catch {
    return; // Wasn't meant for us.
  }
  if (!isRespondableMessage(data)) {
    return;
  }

  const { topic, channelId, messageId, keepalive } = data;
  const message =
    typeof data.error === 'object'
      ? buildErrorObject(
          data.error as { name: string; message: string; stack?: string }
        )
      : data.payload;

  const result: ParsedMessageData = {
    message,
    channelId,
    keepalive: !!keepalive
  };
  if (topic !== undefined) {
    result.topic = topic;
  }
  if (messageId !== undefined) {
    result.messageId = messageId;
  }
  return result;
}

/**
 * Verify the received message is from the "respondable" module
 * @private
 * @param  {Object} postedMessage The message received via postMessage
 * @return {Boolean}              `true` if the message is verified from respondable
 */
function isRespondableMessage(postedMessage: unknown): boolean {
  return (
    postedMessage !== null &&
    typeof postedMessage === 'object' &&
    typeof (postedMessage as SerializedMessageData).channelId === 'string' &&
    (postedMessage as SerializedMessageData).source === getSource()
  );
}

/**
 * Convert a javascript Error into something that can be stringified
 * @param  {Error} error  Any type of error
 * @return {Object}       Processable object
 */
function buildErrorObject(error: {
  name: string;
  message: string;
  stack?: string;
}): Error {
  let msg = error.message || 'Unknown error occurred';
  const errorName = errorTypes.includes(error.name) ? error.name : 'Error';
  const ErrConstructor =
    (window as unknown as Record<string, new (msg: string) => Error>)[
      errorName
    ] || Error;

  if (error.stack) {
    msg += '\n' + error.stack.replace(error.message, '');
  }
  return new ErrConstructor(msg);
}

/**
 * get the unique string to be used to identify our instance of axe
 * @private
 */
function getSource(): string {
  let application = 'axeAPI';
  let version = '';

  // TODO: es-modules_audit
  if (
    typeof axe !== 'undefined' &&
    axe._audit &&
    (axe._audit as Record<string, unknown>).application
  ) {
    application = (axe._audit as Record<string, unknown>).application as string;
  }
  if (typeof axe !== 'undefined') {
    // TODO: es-modules-version
    version = axe.version;
  }
  return application + '.' + version;
}
