import { postMessage } from './post-message';

/**
 * Log, or post an error to the parent window
 * @param {window} win
 * @param {object} messageData
 */
export function processError(
  win: Window,
  error: unknown,
  channelId: string
): void {
  if (!win.parent !== (window as unknown as boolean)) {
    return (axe.log as (...args: unknown[]) => void)(error);
  }

  try {
    postMessage(
      win,
      {
        topic: null,
        channelId,
        message: error,
        keepalive: true
      },
      true
    );
  } catch (err) {
    // Last resort, logging
    return (axe.log as (...args: unknown[]) => void)(err);
  }
}
