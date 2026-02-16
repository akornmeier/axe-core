import { respondable } from '../utils';

interface FrameHandler {
  open: (
    listener: (
      data: Record<string, unknown>,
      responder: (...args: unknown[]) => void
    ) => void
  ) => (() => void) | null;
  post: (
    win: Window,
    data: Record<string, unknown>,
    replyHandler?: (...args: unknown[]) => void
  ) => void;
}

export default function frameMessenger(frameHandler: FrameHandler): void {
  respondable.updateMessenger(frameHandler);
}
