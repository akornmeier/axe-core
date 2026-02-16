import { stringifyMessage } from './message-parser';
import { assertIsParentWindow, assertIsFrameWindow } from './assert-window';
import { storeReplyHandler } from './channel-store';
import { createMessageId } from './message-id';

export interface PostMessageData {
  channelId?: string;
  topic?: string | null;
  message: unknown;
  keepalive?: boolean;
}

/**
 * Posts the message to correct frame.
 * This abstraction necessary because IE9 & 10 do not support posting Objects; only strings
 * @private
 * @param  {Window}   win         The `window` to post the message to
 * @param  {Object}   data        Payload with topic, message, channelId & keepalive
 * @param  {Boolean}  sendToParent Whether the message goes to the parent or the child frame
 * @param  {Function} replyHandler Function to call with the response
 *
 * @return {Boolean} true if the message was sent
 */
export function postMessage(
  win: Window,
  data: PostMessageData,
  sendToParent: boolean,
  replyHandler?: ((...args: unknown[]) => void) | undefined
): boolean {
  // Prevent messaging to an inappropriate window
  sendToParent ? assertIsParentWindow(win) : assertIsFrameWindow(win);
  if (data.message instanceof Error && !sendToParent) {
    (axe.log as (...args: unknown[]) => void)(data.message);
    return false;
  }

  const dataString = stringifyMessage({
    messageId: createMessageId(),
    ...data
  } as {
    topic?: string | null;
    channelId: string;
    message: unknown;
    messageId: string;
    keepalive?: boolean;
  });

  // TODO: es_modules_audit
  const { allowedOrigins } = axe._audit as Record<string, unknown>;
  const origins = allowedOrigins as string[];
  if (!origins || !origins.length) {
    return false;
  }

  if (typeof replyHandler === 'function') {
    storeReplyHandler(data.channelId!, replyHandler, sendToParent);
  }
  // There is no way to know the origin of `win`, so we'll try them all.
  origins.forEach((origin: string) => {
    try {
      win.postMessage(dataString, origin);
    } catch (err) {
      if (
        err instanceof
        (win as unknown as { DOMException: typeof DOMException }).DOMException
      ) {
        throw new Error(
          `allowedOrigins value "${origin}" is not a valid origin`
        );
      }
      throw err;
    }
  });
  return true;
}
