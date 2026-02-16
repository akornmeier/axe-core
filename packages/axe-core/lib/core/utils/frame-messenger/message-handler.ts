import { processError } from './process-error';
import { createResponder } from './create-responder';
import { parseMessage } from './message-parser';
import type { ParsedMessageData } from './message-parser';
import { assertIsFrameWindow, assertIsParentWindow } from './assert-window';
import { getReplyHandler, deleteReplyHandler } from './channel-store';
import { isNewMessage } from './message-id';

function originIsAllowed(origin: string): boolean {
  // TODO: es_modules_audit
  const { allowedOrigins } = axe._audit as Record<string, unknown>;
  const origins = allowedOrigins as string[];
  return (origins && origins.includes('*')) || origins.includes(origin);
}

/**
 * Handle incoming window messages
 * @param  {MessageEvent}
 * @param  {Function} topicHandler
 */
export function messageHandler(
  { origin, data: dataString, source: win }: MessageEvent,
  topicHandler: (
    data: ParsedMessageData,
    responder: (...args: unknown[]) => void
  ) => void
): false | undefined {
  try {
    const data = parseMessage(dataString) || ({} as ParsedMessageData);
    const { channelId, message, messageId } = data;

    if (!originIsAllowed(origin) || !isNewMessage(messageId!)) {
      return;
    }

    // An error should never come from a parent. Log it and exit.
    if (message instanceof Error && (win as Window).parent !== window) {
      (axe.log as (...args: unknown[]) => void)(message);
      return false;
    }

    try {
      if ((data as ParsedMessageData & { topic?: string }).topic) {
        const responder = createResponder(win as Window, channelId);
        assertIsParentWindow(win as Window);
        topicHandler(data, responder as (...args: unknown[]) => void);
      } else {
        callReplyHandler(win as Window, data);
      }
    } catch (error) {
      processError(win as Window, error, channelId);
    }
  } catch (error) {
    (axe.log as (...args: unknown[]) => void)(error);
    return false;
  }
}

function callReplyHandler(win: Window, data: ParsedMessageData): void {
  const { channelId, message, keepalive } = data;
  const { replyHandler, sendToParent } = getReplyHandler(channelId) || {};

  if (!replyHandler) {
    return;
  }
  sendToParent ? assertIsParentWindow(win) : assertIsFrameWindow(win);
  const responder = createResponder(win, channelId, sendToParent);

  if (!keepalive && channelId) {
    deleteReplyHandler(channelId);
  }

  try {
    replyHandler(message, keepalive, responder);
  } catch (error) {
    (axe.log as (...args: unknown[]) => void)(error);
    responder(error, keepalive);
  }
}
