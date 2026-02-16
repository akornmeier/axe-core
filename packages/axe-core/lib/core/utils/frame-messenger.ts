import { postMessage, PostMessageData } from './frame-messenger/post-message';
import { messageHandler } from './frame-messenger/message-handler';

/**
 * Setup default axe frame messenger (make a function so we can
 * call it during tests to reset respondable to default state).
 * @param {Object} respondable
 */
export const frameMessenger = {
  open(topicHandler: (...args: unknown[]) => void): (() => void) | undefined {
    if (typeof window.addEventListener !== 'function') {
      return;
    }

    const handler = function (messageEvent: MessageEvent) {
      messageHandler(messageEvent, topicHandler);
    };
    window.addEventListener('message', handler, false);

    return () => {
      window.removeEventListener('message', handler, false);
    };
  },

  post(
    win: Window,
    data: Record<string, unknown>,
    replyHandler: unknown
  ): boolean | undefined {
    if (typeof window.addEventListener !== 'function') {
      return false;
    }
    return postMessage(
      win,
      data as unknown as PostMessageData,
      false,
      replyHandler as (...args: unknown[]) => void
    );
  }
};

/**
 * Setup default axe frame messenger (make a function so we can
 * call it during tests to reset respondable to default state).
 * @param {Object} respondable
 */
export function setDefaultFrameMessenger(respondable: {
  updateMessenger: (messenger: typeof frameMessenger) => void;
}): void {
  respondable.updateMessenger(frameMessenger);
}
