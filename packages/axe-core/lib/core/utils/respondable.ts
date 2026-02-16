import { v4 as createUuid } from './uuid';
import assert from './assert';
import { setDefaultFrameMessenger } from './frame-messenger';

type TopicHandler = (
  message: unknown,
  keepalive: boolean | undefined,
  responder: (...args: unknown[]) => void
) => void;

type ReplyHandler = (...args: unknown[]) => void;

let closeHandler: (() => void) | null;
let postMessage: (
  win: Window,
  data: Record<string, unknown>,
  replyHandler?: ReplyHandler
) => void;

const topicHandlers: Record<string, TopicHandler> = {};

/**
 * Post a message to a window who may or may not respond to it.
 * @param  {Window}   win      The window to post the message to
 * @param  {String}   topic    The topic of the message
 * @param  {Object}   message  The message content
 * @param  {Boolean}  keepalive Whether to allow multiple responses - default is false
 * @param  {Function} replyHandler The function to invoke when/if the message is responded to
 */
function respondable(
  win: Window,
  topic: string,
  message: unknown,
  keepalive: boolean | undefined,
  replyHandler?: ReplyHandler
): unknown {
  const data = {
    topic,
    message,
    channelId: `${createUuid()}:${createUuid()}`,
    keepalive
  };

  return postMessage(win, data, replyHandler);
}

/**
 * Handle incoming window messages
 * @param  {Object} data
 * @param {Function} responder
 */
function messageListener(
  data: Record<string, unknown>,
  responder: (...args: unknown[]) => void
): void {
  const { topic, message, keepalive } = data;
  const topicHandler = topicHandlers[topic as string];
  if (!topicHandler) {
    return;
  }

  try {
    topicHandler(message, keepalive as boolean | undefined, responder);
  } catch (error) {
    // @ts-expect-error - axe is a global variable
    axe.log(error);
    responder(error, keepalive);
  }
}

/**
 * Update how respondable communicates with iframes.
 * @param {Function} frameHandler  Object with open, post, and close functions
 */
respondable.updateMessenger = function updateMessenger({
  open,
  post
}: {
  open: (listener: typeof messageListener) => (() => void) | null;
  post: (
    win: Window,
    data: Record<string, unknown>,
    replyHandler?: ReplyHandler
  ) => void;
}): void {
  assert(typeof open === 'function', 'open callback must be a function');
  assert(typeof post === 'function', 'post callback must be a function');

  if (closeHandler) {
    closeHandler();
  }

  const close = open(messageListener);

  if (close) {
    assert(
      typeof close === 'function',
      'open callback must return a cleanup function'
    );
    closeHandler = close;
  } else {
    closeHandler = null;
  }

  postMessage = post;
};

/**
 * Subscribe to messages sent via the `respondable` module.
 *
 * Axe._load uses this to listen for messages from other frames
 *
 * @param  {String}   topic    The topic to listen to
 * @param  {Function} topicHandler The function to invoke when a message is received
 */
respondable.subscribe = function subscribe(
  topic: string,
  topicHandler: TopicHandler
): void {
  assert(
    typeof topicHandler === 'function',
    'Subscriber callback must be a function'
  );
  assert(!topicHandlers[topic], `Topic ${topic} is already registered to.`);

  topicHandlers[topic] = topicHandler;
};

/**
 * checks if the current context is inside a frame
 * @return {Boolean}
 */
respondable.isInFrame = function isInFrame(win: Window = window): boolean {
  return !!win.frameElement;
};

setDefaultFrameMessenger(
  respondable as unknown as Parameters<typeof setDefaultFrameMessenger>[0]
);

export default respondable;
