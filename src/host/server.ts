import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, chmod, unlink } from "node:fs/promises";
import type { Stats } from "node:fs";
import { createServer } from "node:net";
import type { Socket } from "node:net";
import { join } from "node:path";
import { z } from "zod";
import type { EventDelivery } from "../contracts.js";
import { decodeRequest } from "./requests.js";
import { FRAME_LIMIT, receiveFrames, sendFrame } from "./framing.js";
import { denied, SessionHost } from "./runtime.js";
import type { HostReply } from "./runtime.js";

const helloSchema = z.strictObject({
  kind: z.literal("hello"),
  lease: z.string().uuid().optional(),
});
const frameSchema = z.strictObject({ kind: z.literal("request"), request: z.unknown() });
interface LedgerEntry {
  readonly digest: string;
  readonly reply: Promise<HostReply>;
  readonly subscription: boolean;
}
export interface LocalServerOptions {
  readonly directory: string;
  readonly host?: SessionHost;
  readonly maxLeases?: number;
  readonly maxRequests?: number;
}

// Refuse unsafe existing paths. Never unlink an unknown/stale socket automatically.
export async function verifyPrivateDirectory(directory: string): Promise<void> {
  try {
    await mkdir(directory, { mode: 0o700 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
  const stat = await lstat(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== process.getuid?.() ||
    (stat.mode & 0o777) !== 0o700
  )
    throw new Error("IPC directory must be owned by this user with mode 0700");
}

export async function startLocalServer(options: LocalServerOptions) {
  if (process.platform === "win32") throw new Error("Windows IPC is not supported");
  const maxLeases = z
    .number()
    .int()
    .min(1)
    .max(32)
    .parse(options.maxLeases ?? 32);
  const maxRequests = z
    .number()
    .int()
    .min(1)
    .max(256)
    .parse(options.maxRequests ?? 256);
  await verifyPrivateDirectory(options.directory);
  const path = join(options.directory, "host.sock");
  const host = options.host ?? new SessionHost();
  const leases = new Map<string, Map<string, LedgerEntry>>();
  const sockets = new Set<Socket>();
  const pending = new Set<Promise<void>>();
  let closing = false;
  let ready = false;
  let shutdown: Promise<void> | undefined;
  const server = createServer((socket) => {
    if (!ready || closing || sockets.size >= 32) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    socket.on("error", () => {});
    let ledger: Map<string, LedgerEntry> | undefined;
    let handshakeRejected = false;
    let subscription: AsyncIterator<EventDelivery> | undefined;
    let subscriptionReserved = false;
    let inFlight = 0;
    const helloTimer = setTimeout(() => socket.destroy(), 10_000);
    helloTimer.unref();
    socket.on("close", () => {
      clearTimeout(helloTimer);
      sockets.delete(socket);
      void subscription?.return?.();
    });
    const reply = (requestId: string, value: HostReply) =>
      sendFrame(socket, { kind: "reply", requestId, reply: value });
    receiveFrames(socket, FRAME_LIMIT, (value) => {
      if (handshakeRejected) return;
      if (!ledger) {
        const hello = helloSchema.safeParse(value);
        if (!hello.success) {
          socket.destroy();
          return;
        }
        let lease = hello.data.lease;
        if (lease) ledger = leases.get(lease);
        else if (leases.size < maxLeases) {
          lease = randomUUID();
          ledger = new Map();
          leases.set(lease, ledger);
        }
        clearTimeout(helloTimer);
        if (!ledger) {
          handshakeRejected = true;
          sendFrame(socket, {
            kind: "hello",
            ok: false,
            code: hello.data.lease ? "lease-lost" : "lease-limit",
          });
          socket.end(() => socket.destroy());
        } else sendFrame(socket, { kind: "hello", ok: true, lease });
        return;
      }
      const frame = frameSchema.safeParse(value);
      if (!frame.success || inFlight >= 8) {
        socket.destroy();
        return;
      }
      const text = JSON.stringify(frame.data.request);
      if (text === undefined) {
        socket.destroy();
        return;
      }
      const decoded = decodeRequest(text);
      if (!decoded.ok) {
        host.auditDecision("invalid", decoded.diagnostic.code);
        sendFrame(socket, { kind: "protocol-error", diagnostic: decoded.diagnostic });
        return;
      }
      const request = decoded.value;
      const { requestId } = request.input;
      const digest = createHash("sha256").update(text).digest("hex");
      const previous = ledger.get(requestId);
      if (previous && previous.digest !== digest) {
        host.auditDecision(
          request.command,
          "request-conflict",
          request.command === "open" ? undefined : request.input.sessionId,
          "operationId" in request.input ? request.input.operationId : undefined,
        );
        reply(requestId, denied("request-conflict", "Request ID was used with different content"));
        return;
      }
      if (!previous && ledger.size >= maxRequests) {
        reply(
          requestId,
          denied("replay-limit", "Request ledger full; this lease cannot accept new work"),
        );
        return;
      }
      if (
        previous?.subscription ||
        (!previous && request.command === "subscribe" && subscriptionReserved)
      ) {
        const conflict = denied(
          "subscription-conflict",
          "Reconnect with a fresh subscription request ID and cursor",
        );
        if (!previous)
          ledger.set(requestId, { digest, reply: Promise.resolve(conflict), subscription: false });
        reply(requestId, conflict);
        return;
      }
      if (!previous && request.command === "subscribe") subscriptionReserved = true;
      const entry = previous ?? {
        digest,
        reply: host.execute(text),
        subscription: false,
      };
      ledger.set(requestId, entry);
      inFlight++;
      const task = (async () => {
        const result = await entry.reply;
        if (request.command === "subscribe" && result.ok) {
          // Concurrent copies may await the same result; establish its stream only once.
          if (ledger?.get(requestId)?.subscription) {
            if (!socket.destroyed)
              reply(
                requestId,
                denied("subscription-conflict", "Subscription requires a fresh request ID"),
              );
            return;
          }
          // execute() returns an iterable only for this command; no iterable crosses the wire.
          const events = result.value as AsyncIterable<EventDelivery>;
          subscription = events[Symbol.asyncIterator]();
          // Replace the ledger's iterator reference with a small terminal acknowledgment.
          ledger?.set(requestId, {
            ...entry,
            subscription: true,
            reply: Promise.resolve(
              denied("subscription-conflict", "Subscription requires a fresh request ID"),
            ),
          });
          if (socket.destroyed) {
            await subscription.return?.();
            return;
          }
          sendFrame(socket, { kind: "reply", requestId, reply: { ok: true, value: null } });
          void (async () => {
            try {
              for await (const delivery of events)
                sendFrame(socket, { kind: "delivery", requestId, delivery });
              sendFrame(socket, { kind: "complete", requestId });
            } catch {
              socket.destroy();
            } finally {
              subscription = undefined;
              subscriptionReserved = false;
            }
          })();
        } else {
          if (!previous && request.command === "subscribe") subscriptionReserved = false;
          if (!socket.destroyed) reply(requestId, result);
        }
      })()
        .catch(() => {
          socket.destroy();
        })
        .finally(() => {
          inFlight--;
          pending.delete(task);
        });
      pending.add(task);
    });
  });
  let socketIdentity: Stats | undefined;
  const close = (): Promise<void> => {
    if (shutdown) return shutdown;
    closing = true;
    shutdown = (async () => {
      const closed = new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const socket of sockets) socket.destroy();
      // Mark the host stopping before pending opens finish; all callers await the same cleanup.
      const hostClosed = host.close();
      const results = await Promise.allSettled([hostClosed, Promise.all(pending), closed]);
      // Node normally removes its socket. Only remove our inode if still present.
      try {
        const stat = await lstat(path);
        if (socketIdentity && stat.ino === socketIdentity.ino && stat.dev === socketIdentity.dev)
          await unlink(path);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
      const failure = results.find((result) => result.status === "rejected");
      if (failure) throw failure.reason;
    })();
    return shutdown;
  };
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(path, () => {
      server.off("error", reject);
      resolve();
    });
  });
  try {
    await chmod(path, 0o600);
    socketIdentity = await lstat(path);
    ready = true;
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "IPC startup and cleanup failed");
    }
    throw error;
  }
  return { path, host, close };
}
