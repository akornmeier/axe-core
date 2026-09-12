import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import type { Commands, Operation, Reply, Session } from "../../src/contracts.js";
import { LocalClient } from "../../src/host/client.js";
import { isTerminal, LOCAL_POLICY, SessionHost } from "../../src/host/runtime.js";
import type { HostOptions } from "../../src/host/runtime.js";
import { startLocalServer } from "../../src/host/server.js";
import type { LocalServerOptions } from "../../src/host/server.js";

export const meta = () => ({ protocol: "propellr/0.1" as const, requestId: randomUUID() });
export function unwrap<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(JSON.stringify(reply.diagnostic));
  return reply.value;
}
export function playbookInput(
  session: Session,
  timeoutMs = 1000,
): Commands["runPlaybook"]["input"] {
  const document = session.documents?.[0];
  if (!document) throw new Error("No live document");
  return {
    ...meta(),
    sessionId: session.id,
    playbook: { id: "dialog-open-close", version: "1" },
    inputs: { timeoutMs },
    bindings: { document: { ...document, path: [] } },
    secretRefs: {},
  };
}
export async function terminal(client: LocalClient, operation: Operation): Promise<Operation> {
  for (let attempt = 0; attempt < 150; attempt++) {
    const inspected = unwrap(
      await client.inspect({
        ...meta(),
        sessionId: operation.sessionId,
        operationId: operation.id,
      }),
    );
    if (inspected.selectedOperation && isTerminal(inspected.selectedOperation))
      return inspected.selectedOperation;
    await delay(20);
  }
  throw new Error("Operation did not terminate");
}
export async function withHost<T>(
  run: (harness: {
    client: LocalClient;
    server: Awaited<ReturnType<typeof startLocalServer>>;
    reconnect: (lease?: string) => Promise<LocalClient>;
    open: (browser?: "chromium" | "firefox" | "webkit") => Promise<Session>;
  }) => Promise<T>,
  options: HostOptions = {},
  transport: Pick<LocalServerOptions, "maxLeases" | "maxRequests"> = {},
): Promise<T> {
  const directory = await mkdtemp("/tmp/pplr-");
  const host = new SessionHost(options);
  const server = await startLocalServer({ directory, host, ...transport });
  const clients: LocalClient[] = [];
  const reconnect = async (lease?: string) => {
    const client = await LocalClient.connect(server.path, lease);
    clients.push(client);
    return client;
  };
  try {
    const client = await reconnect();
    return await run({
      client,
      server,
      reconnect,
      open: async (browser = "chromium") =>
        unwrap(
          await client.open({
            ...meta(),
            policy: LOCAL_POLICY,
            target: { kind: "managed", browser },
          }),
        ),
    });
  } finally {
    for (const client of clients) client.close();
    await server.close();
    await rm(directory, { recursive: true });
  }
}
