import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Page } from "playwright";
import type {
  Checkpoint,
  Commands,
  Event,
  EventDelivery,
  Operation,
  OperationId,
  Reply,
  Session,
  SessionId,
  VersionRef,
} from "../contracts.js";
import { operationIdSchema, sessionIdSchema } from "../validation.js";
import type { CommandName, Request } from "../validation.js";
import { admitRequest, decodeRequest } from "./requests.js";
import { BrowserTarget, launchTarget } from "./browser.js";
import type { browserTypes } from "./browser.js";
import {
  dialogInputs,
  dialogManifest,
  dialogVersion,
  runDialog,
  scanUnavailable,
} from "./playbook.js";
import { BoundedStream } from "./stream.js";

export const LOCAL_POLICY = { id: "local-fixture", version: "1" } as const;
const configuration = { id: "local-host", version: "1" } as const;
const limitsSchema = z.strictObject({
  sessions: z.number().int().min(1).max(8).default(8),
  operations: z.number().int().min(1).max(32).default(32),
  events: z.number().int().min(1).max(64).default(64),
});
export interface HostOptions {
  readonly policy?: VersionRef;
  readonly browsers?: readonly (keyof typeof browserTypes)[];
  readonly borrowed?: ReadonlyMap<string, Page>;
  readonly origins?: readonly string[];
  readonly actions?: readonly string[];
  readonly commands?: readonly CommandName[];
  readonly limits?: z.input<typeof limitsSchema>;
}
interface ActiveOperation {
  readonly id: OperationId;
  readonly abort: AbortController;
  readonly done: Promise<void>;
  readonly checkpoints: Checkpoint[];
}
interface RecordState {
  session: Session;
  target: BrowserTarget | undefined;
  readonly operations: Map<OperationId, Operation>;
  readonly events: Event[];
  readonly streams: Set<BoundedStream<EventDelivery>>;
  sequence: number;
  active: ActiveOperation | undefined;
  ending: Promise<Session> | undefined;
}
export interface AuditEntry {
  readonly time: string;
  readonly command: CommandName | "invalid";
  readonly decision: string;
  readonly sessionId?: SessionId;
  readonly operationId?: OperationId;
}
export type HostReply = Reply<Commands[keyof Commands]["output"]>;
export function denied(code: string, message: string): Reply<never> {
  return { ok: false, diagnostic: { code, message } };
}
export function isTerminal(operation: Operation): boolean {
  return !["queued", "running", "cancelling"].includes(operation.state);
}

export class SessionHost {
  private readonly sessions = new Map<SessionId, RecordState>();
  private readonly borrowed: ReadonlyMap<string, Page>;
  private readonly borrowedInUse = new Set<Page>();
  private readonly policy: VersionRef;
  private readonly browsers: readonly (keyof typeof browserTypes)[];
  private readonly origins: readonly string[];
  private readonly actions: readonly string[];
  private readonly commands: readonly CommandName[];
  private readonly limits: z.infer<typeof limitsSchema>;
  private readonly auditEntries: AuditEntry[] = [];
  private opening = 0;
  private stopping = false;

  constructor(options: HostOptions = {}) {
    this.policy = { ...(options.policy ?? LOCAL_POLICY) };
    this.browsers = [...(options.browsers ?? ["chromium", "firefox", "webkit"])];
    this.borrowed = new Map(options.borrowed);
    if (this.borrowed.size > 8) throw new Error("At most eight borrowed targets may be registered");
    this.origins = [...(options.origins ?? dialogManifest.permissions.origins)];
    this.actions = [...(options.actions ?? dialogManifest.permissions.actions)];
    this.commands = [
      ...(options.commands ?? [
        "open",
        "inspect",
        "scan",
        "runPlaybook",
        "subscribe",
        "cancel",
        "end",
      ]),
    ];
    this.limits = limitsSchema.parse(options.limits ?? {});
  }

  get audit(): readonly AuditEntry[] {
    return structuredClone(this.auditEntries);
  }

  private permittedActions(): boolean {
    return (
      dialogManifest.permissions.origins.every((origin) => this.origins.includes(origin)) &&
      dialogManifest.permissions.actions.every((action) => this.actions.includes(action))
    );
  }

  private emit(
    record: RecordState,
    event:
      | Omit<Extract<Event, { type: "session" }>, "sessionId" | "cursor">
      | Omit<Extract<Event, { type: "operation" }>, "sessionId" | "cursor">
      | Omit<Extract<Event, { type: "checkpoint" }>, "sessionId" | "cursor">,
  ): void {
    const full: Event = {
      ...event,
      sessionId: record.session.id,
      cursor: `${record.session.id}.${++record.sequence}`,
    };
    record.events.push(full);
    if (record.events.length > this.limits.events) record.events.shift();
    for (const stream of record.streams) stream.push({ type: "event", event: full });
  }

  private updateOperation(record: RecordState, operation: Operation): void {
    record.operations.set(operation.id, operation);
    this.emit(record, { type: "operation", operation });
  }

  async execute(text: string): Promise<HostReply> {
    const decoded = decodeRequest(text);
    if (!decoded.ok) {
      this.auditDecision("invalid", decoded.diagnostic.code);
      return decoded;
    }
    const request = decoded.value;
    const requestedOperationId =
      "operationId" in request.input ? request.input.operationId : undefined;
    const missingOperationId =
      requestedOperationId &&
      ![...this.sessions.values()].some(({ operations }) => operations.has(requestedOperationId))
        ? requestedOperationId
        : undefined;
    const admitted = admitRequest(text, {
      commands: this.commands,
      policies: [this.policy],
      managedBrowsers: this.browsers,
      attachedTargets: [...this.borrowed.keys()],
      sessions: [...this.sessions.values()].map(({ session, operations }) => ({
        id: session.id,
        // Unknown/evicted IDs get retention diagnostics; known foreign IDs stay unauthorized.
        operations: [
          ...operations.keys(),
          ...(missingOperationId &&
          request.command !== "open" &&
          request.input.sessionId === session.id
            ? [missingOperationId]
            : []),
        ],
        documents: session.documents,
        playbooks: [dialogVersion],
        secretRefs: [],
      })),
    });
    let reply: HostReply;
    if (!admitted.ok) reply = admitted;
    else if (this.stopping)
      reply = denied("host-stopping", "Host is stopping; inspect after reconnect if possible");
    else {
      try {
        reply = await this.dispatch(admitted.value);
      } catch {
        reply = denied("host-error", "Host operation failed; inspect before retrying");
      }
    }
    const sessionId =
      request.command === "open"
        ? reply.ok && "protocol" in reply.value
          ? reply.value.id
          : undefined
        : request.input.sessionId;
    const operationId =
      "operationId" in request.input
        ? request.input.operationId
        : reply.ok && "kind" in reply.value
          ? reply.value.id
          : undefined;
    this.auditDecision(
      request.command,
      reply.ok ? "accepted" : reply.diagnostic.code,
      sessionId,
      operationId,
    );
    return reply;
  }

  auditDecision(
    command: CommandName | "invalid",
    decision: string,
    sessionId?: SessionId,
    operationId?: OperationId,
  ): void {
    this.auditEntries.push({
      time: new Date().toISOString(),
      command,
      decision,
      ...(sessionId ? { sessionId } : {}),
      ...(operationId ? { operationId } : {}),
    });
    if (this.auditEntries.length > 128) this.auditEntries.shift();
  }

  private async dispatch(request: Request): Promise<HostReply> {
    if (request.command === "open") return this.open(request.input);
    const record = this.sessions.get(request.input.sessionId);
    if (!record) return denied("permission-denied", "Session is not authorized");
    switch (request.command) {
      case "inspect": {
        const selectedOperation = request.input.operationId
          ? record.operations.get(request.input.operationId)
          : undefined;
        if (request.input.operationId && !selectedOperation)
          return denied(
            "operation-not-retained",
            "Operation is unknown or no longer retained; do not replay actions",
          );
        return {
          ok: true,
          value: {
            session: record.session,
            operations: [...record.operations.values()].map(({ id, kind, state }) => ({
              id,
              kind,
              state,
            })),
            ...(selectedOperation ? { selectedOperation } : {}),
            playbooks: this.permittedActions() ? [dialogManifest] : [],
          },
        };
      }
      case "subscribe":
        return this.subscribe(record, request.input.after);
      case "end":
        return { ok: true, value: await this.end(record) };
      case "cancel": {
        const operation = record.operations.get(request.input.operationId);
        if (!operation)
          return denied("operation-not-retained", "Operation is unknown or no longer retained");
        if (isTerminal(operation))
          return { ok: true, value: { disposition: "already-terminal", operation } };
        const cancelling: Operation = { ...operation, state: "cancelling" };
        this.updateOperation(record, cancelling);
        record.active?.abort.abort();
        return { ok: true, value: { disposition: "requested", operation: cancelling } };
      }
      case "scan":
      case "runPlaybook":
        return this.start(record, request);
    }
  }

  private async open(input: Commands["open"]["input"]): Promise<Reply<Session>> {
    if (this.sessions.size + this.opening >= this.limits.sessions)
      return denied("session-limit", "Retained session capacity exhausted");
    const page =
      input.target.kind === "attached" ? this.borrowed.get(input.target.targetId) : undefined;
    if (input.target.kind === "attached" && !page)
      return denied("permission-denied", "Target is not authorized");
    if (page && (page.isClosed() || this.borrowedInUse.has(page)))
      return denied("target-unavailable", "Borrowed target is closed or already leased");
    if (page) this.borrowedInUse.add(page);
    this.opening++;
    let target: BrowserTarget;
    try {
      target =
        input.target.kind === "managed"
          ? await launchTarget(input.target.browser)
          : new BrowserTarget(page!, "borrowed");
      if (this.stopping) {
        await target.release();
        if (page) this.borrowedInUse.delete(page);
        return denied("host-stopping", "Host stopped during browser initialization");
      }
    } catch {
      if (page) this.borrowedInUse.delete(page);
      return denied("browser-unavailable", "Browser initialization failed");
    } finally {
      this.opening--;
    }
    const id = sessionIdSchema.parse(`session_${randomUUID()}`);
    const session: Session = {
      protocol: "propellr/0.1",
      id,
      state: "active",
      diagnostics: [],
      browser: {
        targetId:
          input.target.kind === "attached" ? input.target.targetId : `managed-${randomUUID()}`,
        ownership: target.ownership,
      },
      pages: [target.pageId],
      documents: [{ pageId: target.pageId, documentId: target.documentId }],
      capabilities: ["local-ipc", "dialog-open-close@1", "scan-unavailable", "bounded-replay"],
      policy: this.policy,
      configuration,
    };
    const record: RecordState = {
      session,
      target,
      operations: new Map(),
      events: [],
      streams: new Set(),
      sequence: 0,
      active: undefined,
      ending: undefined,
    };
    this.sessions.set(id, record);
    target.onNavigation = () => {
      if (record.session.state !== "active") return;
      record.session = {
        ...record.session,
        documents: [{ pageId: target.pageId, documentId: target.documentId }],
      };
      this.emit(record, { type: "session", session: record.session });
    };
    target.onLoss = () => {
      if (record.session.state !== "active") return;
      const reason = {
        code: "browser-lost",
        message: "Browser or page lost; live recovery is unavailable",
      };
      record.session = { ...record.session, state: "lost", documents: [], diagnostics: [reason] };
      const operation = record.active && record.operations.get(record.active.id);
      if (operation && !isTerminal(operation))
        this.updateOperation(record, {
          ...operation,
          state: "lost",
          diagnostics: [reason],
          completedScans: [],
          checkpoints: [...(record.active?.checkpoints ?? [])],
          sideEffects: "uncertain",
          cleanup: "incomplete",
        });
      record.active?.abort.abort();
      this.emit(record, { type: "session", session: record.session });
    };
    this.emit(record, { type: "session", session });
    if (target.page.isClosed()) target.onLoss();
    return { ok: true, value: record.session };
  }

  private start(
    record: RecordState,
    request: Extract<Request, { command: "scan" | "runPlaybook" }>,
  ): HostReply {
    if (record.session.state !== "active" || !record.target)
      return denied("session-inactive", "Session has no active browser");
    if (record.active)
      return denied("operation-conflict", "Another operation owns this session's page actions");
    let inputs: z.infer<typeof dialogInputs> | undefined;
    if (request.command === "runPlaybook") {
      const parsed = dialogInputs.safeParse(request.input.inputs);
      const binding = request.input.bindings["document"];
      if (
        !parsed.success ||
        Object.keys(request.input.bindings).length !== 1 ||
        !binding ||
        binding.path.length !== 0
      )
        return denied(
          "invalid-playbook-input",
          "Expected timeout input and one current document binding",
        );
      if (!this.permittedActions())
        return denied("permission-denied", "Playbook origin or actions are not authorized");
      inputs = parsed.data;
    }
    while (record.operations.size >= this.limits.operations) {
      const oldest = record.operations.keys().next().value;
      if (!oldest) break;
      record.operations.delete(oldest);
    }
    const base = {
      id: operationIdSchema.parse(`operation_${randomUUID()}`),
      sessionId: record.session.id,
      requestId: request.input.requestId,
      policy: record.session.policy,
      configuration: record.session.configuration,
    };
    const operation: Operation =
      request.command === "scan"
        ? { ...base, kind: "scan", state: "queued" }
        : {
            ...base,
            kind: "playbook",
            state: "queued",
            invocation: { playbook: dialogVersion, inputs: inputs! },
          };
    const abort = new AbortController();
    const target = record.target;
    const documentId = target.documentId;
    const checkpoints: Checkpoint[] = [];
    const lost = () => record.operations.get(operation.id)?.state === "lost";
    const done = new Promise<void>((resolve) => {
      setImmediate(() => {
        void (async () => {
          if (lost()) return;
          this.updateOperation(record, {
            ...operation,
            state: abort.signal.aborted ? "cancelling" : "running",
          });
          if (operation.kind === "scan") {
            this.updateOperation(record, {
              ...operation,
              state: abort.signal.aborted ? "cancelled" : "failed",
              diagnostics: [
                abort.signal.aborted
                  ? { code: "cancelled", message: "Scan cancelled before evaluation" }
                  : scanUnavailable,
              ],
              completedScans: [],
              sideEffects: "none",
              cleanup: "not-required",
            });
            return;
          }
          const execution = await runDialog(
            target,
            inputs!,
            documentId,
            abort.signal,
            () => this.permittedActions(),
            (checkpoint) => {
              checkpoints.push(checkpoint);
              if (!lost())
                this.emit(record, {
                  type: "checkpoint",
                  operationId: operation.id,
                  playbook: dialogVersion,
                  checkpoint,
                });
            },
          );
          if (lost()) return;
          if (execution.cancelled || execution.failed) {
            this.updateOperation(record, {
              ...operation,
              state: execution.cancelled ? "cancelled" : "failed",
              diagnostics: [
                execution.result.diagnostics[0] ?? scanUnavailable,
                ...execution.result.diagnostics.slice(1),
              ],
              completedScans: [],
              checkpoints: execution.result.checkpoints,
              sideEffects: execution.sideEffects,
              cleanup: execution.result.cleanup,
            });
          } else
            this.updateOperation(record, {
              ...operation,
              state: "completed",
              result: execution.result,
            });
        })()
          .catch(() => {
            if (!lost())
              this.updateOperation(record, {
                ...operation,
                state: "failed",
                diagnostics: [
                  {
                    code: "execution-failed",
                    message: "Execution failed; side effects require inspection",
                  },
                ],
                completedScans: [],
                checkpoints: [...checkpoints],
                sideEffects: "uncertain",
                cleanup: "incomplete",
              });
          })
          .finally(() => {
            record.active = undefined;
            resolve();
          });
      });
    });
    record.active = { id: operation.id, abort, done, checkpoints };
    this.updateOperation(record, operation);
    return { ok: true, value: operation };
  }

  private subscribe(record: RecordState, after?: string): Reply<AsyncIterable<EventDelivery>> {
    let sequence = 0;
    if (after !== undefined) {
      const prefix = `${record.session.id}.`;
      const number = after.slice(prefix.length);
      if (!after.startsWith(prefix) || !/^(0|[1-9][0-9]*)$/.test(number))
        return denied("invalid-cursor", "Cursor does not belong to this session");
      sequence = Number(number);
      if (!Number.isSafeInteger(sequence) || sequence > record.sequence)
        return denied("invalid-cursor", "Cursor is ahead of retained session history");
    }
    const stream = new BoundedStream<EventDelivery>(this.limits.events + 1, () =>
      record.streams.delete(stream),
    );
    const earliest = record.events[0];
    if (earliest && sequence < record.sequence - record.events.length)
      stream.push({
        type: "gap",
        sessionId: record.session.id,
        requestedAfter: after ?? `${record.session.id}.0`,
        earliestAvailable: earliest.cursor,
        reason: { code: "event-retention-gap", message: "Earlier events are no longer retained" },
      });
    for (const event of record.events)
      if (Number(event.cursor.slice(event.cursor.lastIndexOf(".") + 1)) > sequence)
        stream.push({ type: "event", event });
    record.streams.add(stream);
    return { ok: true, value: stream };
  }

  private end(record: RecordState): Promise<Session> {
    record.ending ??= this.releaseSession(record);
    return record.ending;
  }

  private async releaseSession(record: RecordState): Promise<Session> {
    if (record.session.state === "ended") return record.session;
    record.session = { ...record.session, state: "ending", documents: [] };
    this.emit(record, { type: "session", session: record.session });
    record.active?.abort.abort();
    await record.active?.done;
    const target = record.target;
    try {
      await target?.release();
      record.target = undefined;
      if (target) this.borrowedInUse.delete(target.page);
      record.session = { ...record.session, state: "ended", pages: [], documents: [] };
    } catch {
      record.session = {
        ...record.session,
        state: "lost",
        diagnostics: [
          {
            code: "cleanup-incomplete",
            message: "Session resource release could not be confirmed",
          },
        ],
      };
    }
    this.emit(record, { type: "session", session: record.session });
    return record.session;
  }

  async close(): Promise<void> {
    this.stopping = true;
    await Promise.all(
      [...this.sessions.values()].map(async (record) => {
        await this.end(record);
        for (const stream of record.streams) stream.close();
      }),
    );
  }
}
