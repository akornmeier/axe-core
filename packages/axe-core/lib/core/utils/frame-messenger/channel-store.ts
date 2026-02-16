import assert from '../assert';

export interface ReplyHandlerEntry {
  replyHandler: (...args: unknown[]) => void;
  sendToParent: boolean;
}

const channels: Record<string, ReplyHandlerEntry> = {};

export function storeReplyHandler(
  channelId: string,
  replyHandler: (...args: unknown[]) => void,
  sendToParent: boolean = true
): void {
  assert(
    !channels[channelId],
    `A replyHandler already exists for this message channel.`
  );
  channels[channelId] = { replyHandler, sendToParent };
}

export function getReplyHandler(
  channelId: string
): ReplyHandlerEntry | undefined {
  return channels[channelId];
}

export function deleteReplyHandler(channelId: string): void {
  delete channels[channelId];
}
