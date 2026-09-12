import { mkdtemp, rm } from "node:fs/promises";
import { setImmediate as yieldTurn } from "node:timers/promises";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import { expect, test, vi } from "vitest";
import { DIALOG_HTML, FIXTURE_URL } from "../../src/host/fixture.js";
import { LOCAL_POLICY } from "../../src/host/runtime.js";
import { meta, playbookInput, terminal, unwrap, withHost } from "../support/host.js";

test("ending a subscribed session completes delivery without losing the end reply", async () => {
  await withHost(async ({ client, open }) => {
    const session = await open();
    const events = unwrap(await client.subscribe({ ...meta(), sessionId: session.id }));
    const timeout = setTimeout(() => client.close(), 5000);
    try {
      expect(unwrap(await client.end({ ...meta(), sessionId: session.id })).state).toBe("ended");
      const states = [];
      for await (const delivery of events) {
        if (delivery.type === "event" && delivery.event.type === "session")
          states.push(delivery.event.session.state);
      }
      expect(states).toEqual(["active", "ending", "ended"]);
      expect(unwrap(await client.inspect({ ...meta(), sessionId: session.id })).session.state).toBe(
        "ended",
      );
      // Terminal-session replay is finite too, and a completed stream frees the connection slot.
      const replay = unwrap(await client.subscribe({ ...meta(), sessionId: session.id }));
      let count = 0;
      for await (const delivery of replay) if (delivery.type === "event") count++;
      expect(count).toBe(3);
    } finally {
      clearTimeout(timeout);
    }
  });
});

test("available playbooks honor the runPlaybook command grant", async () => {
  await withHost(
    async ({ client, open }) => {
      const session = await open();
      expect(unwrap(await client.inspect({ ...meta(), sessionId: session.id })).playbooks).toEqual(
        [],
      );
      expect(await client.runPlaybook(playbookInput(session))).toMatchObject({
        ok: false,
        diagnostic: { code: "permission-denied" },
      });
    },
    { commands: ["open", "inspect", "end"] },
  );
});

test("embedded host shutdown waits for an in-flight real browser launch and release", async () => {
  const started = Promise.withResolvers<void>();
  const resume = Promise.withResolvers<void>();
  const launched = Promise.withResolvers<Browser>();
  const launch = chromium.launch.bind(chromium);
  const spy = vi.spyOn(chromium, "launch").mockImplementation(async (options) => {
    started.resolve();
    await resume.promise;
    const browser = await launch(options);
    launched.resolve(browser);
    return browser;
  });
  try {
    await withHost(async ({ client, server }) => {
      const pending = client.open({
        ...meta(),
        policy: LOCAL_POLICY,
        target: { kind: "managed", browser: "chromium" },
      });
      await started.promise;
      let closed = false;
      const closing = server.host.close().then(() => {
        closed = true;
      });
      try {
        await yieldTurn();
        expect(closed).toBe(false);
      } finally {
        resume.resolve();
      }
      expect(await pending).toMatchObject({ ok: false, diagnostic: { code: "host-stopping" } });
      await closing;
      expect((await launched.promise).isConnected()).toBe(false);
    });
  } finally {
    resume.resolve();
    spy.mockRestore();
  }
});

test("persistent borrowed context requires fixture and preserves ownership/loss", async () => {
  const profile = await mkdtemp("/tmp/pplr-profile-");
  const context = await chromium.launchPersistentContext(profile, { headless: true });
  try {
    // Pinned Playwright 1.63.0 supplies a Browser for normal persistent contexts.
    expect(context.browser()).not.toBeNull();
    const page = context.pages()[0] ?? (await context.newPage());
    await page.route(FIXTURE_URL, (route) =>
      route.fulfill({ contentType: "text/html", body: DIALOG_HTML }),
    );
    expect(page.url()).toBe("about:blank");
    await withHost(
      async ({ client }) => {
        const input = {
          ...meta(),
          policy: LOCAL_POLICY,
          target: { kind: "attached", targetId: "persistent" },
        } as const;
        expect(await client.open(input)).toMatchObject({
          ok: false,
          diagnostic: { code: "target-unavailable" },
        });
        await page.goto(FIXTURE_URL);
        const first = unwrap(await client.open({ ...input, ...meta() }));
        unwrap(await client.end({ ...meta(), sessionId: first.id }));
        expect(page.isClosed()).toBe(false);
        const second = unwrap(await client.open({ ...input, ...meta() }));
        await context.close();
        expect(unwrap(await client.inspect({ ...meta(), sessionId: first.id })).session.state).toBe(
          "ended",
        );
        expect(
          unwrap(await client.inspect({ ...meta(), sessionId: second.id })).session,
        ).toMatchObject({ state: "lost", documents: [] });
      },
      { borrowed: new Map([["persistent", page]]) },
    );
  } finally {
    await context.close();
    await rm(profile, { recursive: true });
  }
});

test("document invalidation before deferred execution cannot rebind the accepted journey", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route(FIXTURE_URL, (route) =>
      route.fulfill({ contentType: "text/html", body: DIALOG_HTML }),
    );
    await page.goto(FIXTURE_URL);
    await withHost(
      async ({ client, server }) => {
        const session = unwrap(
          await client.open({
            ...meta(),
            policy: LOCAL_POLICY,
            target: { kind: "attached", targetId: "fixture" },
          }),
        );
        const pending = server.host.execute(
          JSON.stringify({ command: "runPlaybook", input: playbookInput(session) }),
        );
        if (!("emit" in page) || typeof page.emit !== "function")
          throw new Error("Expected Playwright event emitter for fault injection");
        page.emit("framenavigated", page.mainFrame());
        const operation = unwrap(await pending);
        if (!("kind" in operation)) throw new Error("Expected operation");
        expect(await terminal(client, operation)).toMatchObject({
          state: "failed",
          sideEffects: "none",
          checkpoints: [{ state: "skipped" }, { state: "skipped" }],
        });
        expect(await page.locator("#dialog").isVisible()).toBe(false);
        const current = unwrap(await client.inspect({ ...meta(), sessionId: session.id })).session;
        expect(current.documents[0]?.documentId).not.toBe(session.documents[0]?.documentId);
      },
      { borrowed: new Map([["fixture", page]]) },
    );
  } finally {
    await browser.close();
  }
});
