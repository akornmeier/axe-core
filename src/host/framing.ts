import type { Socket } from "node:net";
import { withinDepthLimit } from "./requests.js";

export const FRAME_LIMIT = 65_536;
export const RESPONSE_LIMIT = 1_048_576;

// Fixed-size header and bounded payload allocation, including fragmented/coalesced writes.
export function receiveFrames(
  socket: Socket,
  limit: number,
  receive: (value: unknown) => void,
): void {
  let header = Buffer.alloc(4);
  let payload: Buffer | undefined;
  let used = 0;
  let timer: NodeJS.Timeout | undefined;
  const resetTimer = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => socket.destroy(), 10_000);
    timer.unref();
  };
  socket.on("close", () => {
    if (timer) clearTimeout(timer);
  });
  socket.on("data", (chunk: Buffer) => {
    try {
      let offset = 0;
      while (offset < chunk.length && !socket.destroyed) {
        resetTimer();
        const destination = payload ?? header;
        const bytes = Math.min(destination.length - used, chunk.length - offset);
        chunk.copy(destination, used, offset, offset + bytes);
        used += bytes;
        offset += bytes;
        if (used !== destination.length) continue;
        if (!payload) {
          const length = header.readUInt32BE();
          if (length === 0 || length > limit) throw new Error("frame-limit");
          payload = Buffer.alloc(length);
          used = 0;
        } else {
          const text = new TextDecoder("utf-8", { fatal: true }).decode(payload);
          if (!withinDepthLimit(text)) throw new Error("frame-depth");
          const value: unknown = JSON.parse(text);
          payload = undefined;
          header = Buffer.alloc(4);
          used = 0;
          if (timer) clearTimeout(timer);
          receive(value);
        }
      }
    } catch {
      socket.destroy();
    }
  });
}

export function encodeFrame(value: unknown, limit = FRAME_LIMIT): Buffer {
  const payload = Buffer.from(JSON.stringify(value));
  if (payload.length > limit) throw new Error("frame-limit");
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  return Buffer.concat([header, payload]);
}

export function sendFrame(socket: Socket, value: unknown, limit = RESPONSE_LIMIT): void {
  if (socket.destroyed) throw new Error("connection-lost");
  const frame = encodeFrame(value, limit);
  if (socket.writableLength + frame.length > RESPONSE_LIMIT * 2) {
    socket.destroy();
    throw new Error("slow-consumer");
  }
  socket.write(frame);
}
