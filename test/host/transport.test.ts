import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { chmod, lstat, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { encodeFrame, FRAME_LIMIT, receiveFrames, RESPONSE_LIMIT } from "../../src/host/framing.js";
import { startLocalServer, verifyPrivateDirectory } from "../../src/host/server.js";
import { BoundedStream } from "../../src/host/stream.js";
import { meta, withHost } from "../support/host.js";
import { sessionIdSchema } from "../../src/validation.js";

async function rawConnection(path: string, allowHalfOpen = false) {
  const socket = createConnection({ path, allowHalfOpen });
  socket.on("error", () => {});
  const messages = new BoundedStream<unknown>();
  receiveFrames(socket, RESPONSE_LIMIT, (message) => messages.push(message));
  socket.on("close", () => messages.close());
  await once(socket, "connect");
  return { socket, messages };
}

describe("bounded transport", () => {
  test("fragmented/coalesced frames, malformed request redaction, and oversized framing", async () => {
    await withHost(async ({ server }) => {
      const { socket, messages } = await rawConnection(server.path);
      try {
        const hello = encodeFrame({ kind: "hello" });
        socket.write(hello.subarray(0, 2));
        socket.write(hello.subarray(2, 7));
        socket.write(hello.subarray(7));
        expect((await messages.next()).value).toMatchObject({ kind: "hello", ok: true });
        const first = {
          kind: "request",
          request: { command: "inspect", input: { ...meta(), sessionId: "session_unknown" } },
        };
        const second = {
          kind: "request",
          request: { command: "open", input: { secret: "do-not-echo" } },
        };
        socket.write(Buffer.concat([encodeFrame(first), encodeFrame(second)]));
        const responses = [(await messages.next()).value, (await messages.next()).value];
        expect(responses).toContainEqual(
          expect.objectContaining({
            kind: "protocol-error",
            diagnostic: { code: "invalid-request", message: "Request does not match propellr/0.1" },
          }),
        );
        expect(JSON.stringify(responses)).not.toContain("do-not-echo");
        const closed = once(socket, "close");
        const header = Buffer.alloc(4);
        header.writeUInt32BE(FRAME_LIMIT + 1);
        socket.write(header);
        await closed;
        expect(socket.destroyed).toBe(true);
      } finally {
        socket.destroy();
      }
    });
  });

  test("failed subscription replies replay unchanged, including concurrent copies and reconnect", async () => {
    await withHost(async ({ client, server, open, reconnect }) => {
      const session = await open();
      const input = { ...meta(), sessionId: session.id, after: "session_other.0" };
      const request = { kind: "request", request: { command: "subscribe", input } };
      const expected = {
        kind: "reply",
        requestId: input.requestId,
        reply: { ok: false, diagnostic: { code: "invalid-cursor" } },
      };
      const { socket, messages } = await rawConnection(server.path);
      try {
        socket.write(encodeFrame({ kind: "hello", lease: client.lease }));
        expect((await messages.next()).value).toMatchObject({ ok: true });
        socket.write(Buffer.concat([encodeFrame(request), encodeFrame(request)]));
        expect((await messages.next()).value).toMatchObject(expected);
        expect((await messages.next()).value).toMatchObject(expected);
        const live = {
          kind: "request",
          request: { command: "subscribe", input: { ...meta(), sessionId: session.id } },
        };
        socket.write(Buffer.concat([encodeFrame(live), encodeFrame(live)]));
        const established = [
          (await messages.next()).value,
          (await messages.next()).value,
          (await messages.next()).value,
        ];
        expect(established).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ kind: "reply", reply: { ok: true, value: null } }),
            expect.objectContaining({
              kind: "reply",
              reply: expect.objectContaining({
                ok: false,
                diagnostic: expect.objectContaining({ code: "subscription-conflict" }),
              }),
            }),
            expect.objectContaining({ kind: "delivery" }),
          ]),
        );
        socket.write(encodeFrame(request));
        expect((await messages.next()).value).toMatchObject(expected);
        socket.write(encodeFrame(live));
        expect((await messages.next()).value).toMatchObject({
          kind: "reply",
          reply: { ok: false, diagnostic: { code: "subscription-conflict" } },
        });
      } finally {
        socket.destroy();
      }
      const next = await reconnect(client.lease);
      expect(await next.subscribe(input)).toMatchObject(expected.reply);
    });
  });

  test("rejected handshake is terminal even when more frames arrive before the peer closes", async () => {
    await withHost(
      async ({ server, reconnect }) => {
        const { socket, messages } = await rawConnection(server.path, true);
        try {
          const ended = once(socket, "end");
          socket.write(
            Buffer.concat([
              encodeFrame({ kind: "hello", lease: randomUUID() }),
              encodeFrame({ kind: "hello" }),
              encodeFrame({
                kind: "request",
                request: { command: "inspect", input: { ...meta(), sessionId: "session_unknown" } },
              }),
            ]),
          );
          expect((await messages.next()).value).toMatchObject({
            kind: "hello",
            ok: false,
            code: "lease-lost",
          });
          await ended;
          expect(server.host.audit).toEqual([]);
          // The rejected socket cannot consume the only remaining lease via its second hello.
          const next = await reconnect();
          expect(next.lease).toBeTruthy();
        } finally {
          socket.destroy();
        }
      },
      {},
      { maxLeases: 2 },
    );
  });

  test("in-flight overflow bounds reply waiters without losing replay history", async () => {
    await withHost(async ({ client, server, reconnect }) => {
      const { socket, messages } = await rawConnection(server.path);
      const inputs = Array.from({ length: 8 }, () => ({
        ...meta(),
        sessionId: "session_unknown" as const,
      }));
      const first = inputs[0];
      if (!first) throw new Error("Expected request");
      try {
        socket.write(encodeFrame({ kind: "hello", lease: client.lease }));
        expect((await messages.next()).value).toMatchObject({ ok: true });
        const closed = once(socket, "close");
        socket.write(
          Buffer.concat(
            [...inputs, first].map((input) =>
              encodeFrame({ kind: "request", request: { command: "inspect", input } }),
            ),
          ),
        );
        await closed;
        expect(server.host.audit).toHaveLength(8);
      } finally {
        socket.destroy();
      }
      const next = await reconnect(client.lease);
      const reply = await next.inspect({
        ...first,
        sessionId: sessionIdSchema.parse(first.sessionId),
      });
      expect(reply).toMatchObject({ ok: false, diagnostic: { code: "permission-denied" } });
      expect(server.host.audit).toHaveLength(8); // Cached reply, not another admission/execution.
    });
  });

  test("missing handshake and deeply nested frames close without executing", async () => {
    await withHost(async ({ server }) => {
      for (const frame of [
        encodeFrame({ kind: "request", request: { command: "open" } }),
        encodeFrame(JSON.parse(`${"[".repeat(33)}0${"]".repeat(33)}`)),
      ]) {
        const { socket } = await rawConnection(server.path);
        const closed = once(socket, "close");
        socket.write(frame);
        await closed;
        expect(socket.destroyed).toBe(true);
      }
      expect(server.host.audit).toEqual([]);
    });
  });

  test("unsafe directory and existing socket/file are preserved, never taken over", async () => {
    const directory = await mkdtemp("/tmp/pplr-path-");
    const link = `${directory}-link`;
    try {
      await chmod(directory, 0o755);
      await expect(verifyPrivateDirectory(directory)).rejects.toThrow("0700");
      await chmod(directory, 0o700);
      await symlink(directory, link);
      await expect(verifyPrivateDirectory(link)).rejects.toThrow("0700");
      await writeFile(join(directory, "host.sock"), "preserve");
      await expect(startLocalServer({ directory })).rejects.toThrow();
      expect((await lstat(join(directory, "host.sock"))).isFile()).toBe(true);
    } finally {
      await rm(link, { force: true });
      await rm(directory, { recursive: true });
    }
  });

  test("undefined is delivered as a queued payload, not mistaken for an empty stream", async () => {
    const stream = new BoundedStream<number | undefined>();
    stream.push(undefined);
    stream.push(1);
    stream.close();
    expect(await stream.next()).toEqual({ done: false, value: undefined });
    expect(await stream.next()).toEqual({ done: false, value: 1 });
    expect(await stream.next()).toEqual({ done: true, value: undefined });
  });

  test("explicit stream return discards queued delivery while natural close drains it", async () => {
    const stream = new BoundedStream<number>();
    stream.push(1);
    stream.push(2);
    stream.close();
    expect(await stream.next()).toEqual({ done: false, value: 1 });
    expect(await stream.return()).toEqual({ done: true, value: undefined });
    expect(await stream.next()).toEqual({ done: true, value: undefined });
    const cancelled = new BoundedStream<number>();
    cancelled.push(3);
    await cancelled.return();
    expect(await cancelled.next()).toEqual({ done: true, value: undefined });
  });

  test("slow consumers fail explicitly instead of retaining unbounded events", async () => {
    let closed = false;
    const stream = new BoundedStream<number>(1, () => {
      closed = true;
    });
    stream.push(1);
    stream.push(2);
    expect(closed).toBe(true);
    await expect(stream.next()).rejects.toThrow("event-overflow");
  });

  test("host restart invalidates leases and does not recreate browser sessions", async () => {
    await withHost(async ({ client, server, open, reconnect }) => {
      const session = await open();
      client.close();
      await server.close();
      const replacement = await startLocalServer({ directory: join(server.path, "..") });
      try {
        await expect(reconnect(client.lease)).rejects.toThrow("lease-lost");
        const next = await reconnect();
        expect(await next.inspect({ ...meta(), sessionId: session.id })).toMatchObject({
          ok: false,
          diagnostic: { code: "permission-denied" },
        });
      } finally {
        await replacement.close();
      }
    });
  });

  test("emitted CLI shares the SDK protocol and returns nonzero on denial", async () => {
    await withHost(async ({ server }) => {
      const child = spawn(process.execPath, ["dist/host/cli.js", server.path], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      const output: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
      const finished = once(child, "close");
      child.stdin.end(
        JSON.stringify({ command: "inspect", input: { ...meta(), sessionId: "session_unknown" } }),
      );
      expect((await finished)[0]).toBe(1);
      const result: unknown = JSON.parse(Buffer.concat(output).toString("utf8"));
      expect(result).toMatchObject({
        lease: expect.any(String),
        reply: { ok: false, diagnostic: { code: "permission-denied" } },
      });
    });
  });
});
