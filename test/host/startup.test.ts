import { chmod, lstat, mkdtemp, rm } from "node:fs/promises";
import { createConnection } from "node:net";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { encodeFrame } from "../../src/host/framing.js";
import { LOCAL_POLICY, SessionHost } from "../../src/host/runtime.js";
import { startLocalServer } from "../../src/host/server.js";
import { meta } from "../support/host.js";

vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof import("node:fs/promises")>();
  return { ...fs, chmod: vi.fn(fs.chmod) };
});

test("permission setup failure admits no requests and awaits full startup teardown", async () => {
  const directory = await mkdtemp("/tmp/pplr-start-");
  const host = new SessionHost();
  vi.mocked(chmod).mockImplementationOnce(async (path) => {
    if (typeof path !== "string") throw new Error("Expected socket path");
    const socket = createConnection(path);
    socket.on("error", () => {});
    socket.once("connect", () =>
      socket.write(
        Buffer.concat([
          encodeFrame({ kind: "hello" }),
          encodeFrame({
            kind: "request",
            request: { command: "inspect", input: { ...meta(), sessionId: "session_unknown" } },
          }),
        ]),
      ),
    );
    socket.once("data", () => socket.destroy());
    await new Promise<void>((resolve) => socket.once("close", () => resolve()));
    throw new Error("injected chmod failure");
  });
  try {
    await expect(startLocalServer({ directory, host })).rejects.toThrow("injected chmod failure");
    expect(host.audit).toEqual([]);
    await expect(lstat(join(directory, "host.sock"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await host.execute(
        JSON.stringify({
          command: "open",
          input: {
            ...meta(),
            policy: LOCAL_POLICY,
            target: { kind: "managed", browser: "chromium" },
          },
        }),
      ),
    ).toMatchObject({ ok: false, diagnostic: { code: "host-stopping" } });
  } finally {
    await host.close();
    await rm(directory, { recursive: true });
  }
});
