import { canonicalHash, assertExactKeys } from "../rnd/canonical";

export type SchemaVersion = 1;
export type AgentRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface AgentTask {
  schemaVersion: SchemaVersion;
  taskId: string;
  intent: {
    summary: string;
    acceptance: string[];
  };
  requestedAt: string;
}

export interface AgentWorkspace {
  schemaVersion: SchemaVersion;
  projectId: string;
  worktreeId: string;
  baseRevision: string;
  trusted: boolean;
  localHandle: string;
}

export interface AgentRun {
  schemaVersion: SchemaVersion;
  runId: string;
  taskId: string;
  projectId: string;
  driverId: string;
  baseRevision: string;
  status: AgentRunStatus;
  startedAt?: string;
  finishedAt?: string;
  targetRevision?: string;
}

export function assertAgentTask(value: unknown): asserts value is AgentTask {
  assertRecord(value, "agent task");
  assertExactKeys(value, ["schemaVersion", "taskId", "intent", "requestedAt"], "agent task");
  assertSchemaVersion(value.schemaVersion);
  assertToken(value.taskId, "taskId");
  assertIsoTime(value.requestedAt, "requestedAt");
  assertRecord(value.intent, "task intent");
  assertExactKeys(value.intent, ["summary", "acceptance"], "task intent");
  assertBoundedText(value.intent.summary, 4096, "task summary");
  if (!Array.isArray(value.intent.acceptance) || value.intent.acceptance.length > 32) {
    throw new Error("Task acceptance must contain at most 32 items");
  }
  for (const item of value.intent.acceptance) assertBoundedText(item, 1024, "acceptance item");
}

export function assertAgentWorkspace(value: unknown): asserts value is AgentWorkspace {
  assertRecord(value, "agent workspace");
  assertExactKeys(
    value,
    ["schemaVersion", "projectId", "worktreeId", "baseRevision", "trusted", "localHandle"],
    "agent workspace",
  );
  assertSchemaVersion(value.schemaVersion);
  assertToken(value.projectId, "projectId");
  assertToken(value.worktreeId, "worktreeId");
  assertGitOid(value.baseRevision, "baseRevision");
  if (typeof value.trusted !== "boolean") throw new Error("trusted must be boolean");
  assertBoundedText(value.localHandle, 4096, "localHandle");
}

export function assertAgentRun(value: unknown): asserts value is AgentRun {
  assertRecord(value, "agent run");
  assertObjectShape(
    value,
    ["schemaVersion", "runId", "taskId", "projectId", "driverId", "baseRevision", "status"],
    ["startedAt", "finishedAt", "targetRevision"],
    "agent run",
  );
  assertSchemaVersion(value.schemaVersion);
  assertToken(value.runId, "runId");
  assertToken(value.taskId, "taskId");
  assertToken(value.projectId, "projectId");
  assertToken(value.driverId, "driverId");
  assertGitOid(value.baseRevision, "baseRevision");
  if (!["queued", "running", "succeeded", "failed", "cancelled"].includes(String(value.status))) {
    throw new Error("Unknown agent run status");
  }

  if (value.startedAt !== undefined) assertIsoTime(value.startedAt, "startedAt");
  if (value.finishedAt !== undefined) assertIsoTime(value.finishedAt, "finishedAt");
  if (value.targetRevision !== undefined) assertGitOid(value.targetRevision, "targetRevision");

  if (value.status === "running" && value.startedAt === undefined) {
    throw new Error("A running agent run requires startedAt");
  }
  if (["succeeded", "failed", "cancelled"].includes(value.status as string)) {
    if (value.startedAt === undefined || value.finishedAt === undefined) {
      throw new Error("A terminal agent run requires startedAt and finishedAt");
    }
  }
  if (value.status === "succeeded" && value.targetRevision === undefined) {
    throw new Error("A succeeded agent run requires targetRevision");
  }
  if (value.status === "queued" && (value.startedAt !== undefined || value.finishedAt !== undefined)) {
    throw new Error("A queued agent run cannot have timestamps");
  }
}

export function taskIntentHash(task: AgentTask): string {
  assertAgentTask(task);
  return canonicalHash("task-intent", task);
}

export function assertSchemaVersion(value: unknown): asserts value is SchemaVersion {
  if (value !== 1) throw new Error("schemaVersion must be 1");
}

export function assertToken(value: unknown, label: string, maxBytes = 128): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._@+-]+$/.test(value) || Buffer.byteLength(value) > maxBytes) {
    throw new Error(`${label} must be a bounded opaque identifier`);
  }
}

export function assertIsoTime(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error(`${label} must be UTC ISO-8601 with milliseconds`);
  }
}

export function assertGitOid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(value)) {
    throw new Error(`${label} must be a full lowercase Git object ID`);
  }
}

export function assertBoundedText(value: unknown, maxBytes: number, label: string): asserts value is string {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > maxBytes) {
    throw new Error(`${label} exceeds ${maxBytes} UTF-8 bytes`);
  }
}

export function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label} must be a plain object`);
  }
}

export function assertObjectShape(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  const keys = Reflect.ownKeys(value);
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ||
    keys.some((key) => typeof key !== "string" || !allowed.has(key))
  ) {
    throw new Error(`${label} contains unknown or missing fields`);
  }
}
