import { assertExactKeys, assertRelPath, assertSha256, canonicalJson, compareUtf8 } from "../rnd/canonical";
import {
  assertBoundedText,
  assertGitOid,
  assertIsoTime,
  assertObjectShape,
  assertRecord,
  assertSchemaVersion,
  assertToken,
  type SchemaVersion,
} from "../agent/types";

export type EvidenceKind = "diff" | "command-output" | "test-output" | "trace" | "plan" | "artifact";
export type EvidenceVisibility = "controller" | "participant" | "oracle";

export interface EvidenceRef {
  id: string;
  kind: EvidenceKind;
  sha256: string;
  storedBytes: number;
  originalBytes: number;
  truncated: boolean;
  redactions: Array<{ ruleId: string; count: number }>;
  mediaType: string;
  visibility: EvidenceVisibility;
}

export type RunEvent =
  | { type: "task.started"; taskId: string; baseRevision: string; intentHash: string }
  | { type: "plan.recorded"; plan: EvidenceRef }
  | { type: "file.changed"; path: string; beforeSha256: string; afterSha256: string; diff: EvidenceRef }
  | { type: "command.started"; executionId: string; commandId: string }
  | {
      type: "command.finished";
      executionId: string;
      commandId: string;
      exitCode: number | null;
      timedOut: boolean;
      cancelled: boolean;
      output: EvidenceRef;
    }
  | {
      type: "test.finished";
      executionId: string;
      commandId: string;
      testId: string;
      status: "passed" | "failed" | "skipped";
      output: EvidenceRef;
    }
  | { type: "run.finished"; status: "succeeded" | "failed" | "cancelled"; targetRevision?: string };

export interface RunEnvelope {
  schemaVersion: SchemaVersion;
  projectId: string;
  runId: string;
  seq: number;
  at: string;
  event: RunEvent;
}

export function serializeRunEnvelope(value: RunEnvelope): string {
  assertRunEnvelope(value);
  return canonicalJson(value);
}

export function parseRunEnvelope(value: string): RunEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Flight Recorder line is not valid JSON");
  }
  assertRunEnvelope(parsed);
  if (canonicalJson(parsed) !== value) throw new Error("Flight Recorder line is not canonical JSON");
  return parsed;
}

export function assertRunEnvelope(value: unknown): asserts value is RunEnvelope {
  assertRecord(value, "Flight Recorder envelope");
  assertExactKeys(value, ["schemaVersion", "projectId", "runId", "seq", "at", "event"], "Flight Recorder envelope");
  assertSchemaVersion(value.schemaVersion);
  assertToken(value.projectId, "projectId");
  assertToken(value.runId, "runId");
  if (!Number.isSafeInteger(value.seq) || (value.seq as number) < 1) throw new Error("Flight Recorder seq must be positive");
  assertIsoTime(value.at, "Flight Recorder timestamp");
  assertRunEvent(value.event);
}

export function assertRunSequence(events: readonly RunEnvelope[]): void {
  const executions = new Map<string, { commandId: string; closed: boolean }>();
  let projectId: string | undefined;
  let runId: string | undefined;
  let terminal = false;

  events.forEach((envelope, index) => {
    assertRunEnvelope(envelope);
    const expected = index + 1;
    if (envelope.seq !== expected) throw new Error(`Flight Recorder sequence expected ${expected}, received ${envelope.seq}`);
    if (terminal) throw new Error("Flight Recorder event appears after terminal run.finished");

    projectId ??= envelope.projectId;
    runId ??= envelope.runId;
    if (envelope.projectId !== projectId || envelope.runId !== runId) {
      throw new Error("Flight Recorder run/project identity changed within a sequence");
    }
    if (index === 0 && envelope.event.type !== "task.started") throw new Error("task.started must be first");
    if (index > 0 && envelope.event.type === "task.started") throw new Error("task.started may appear only once");

    const event = envelope.event;
    if (event.type === "command.started") {
      if (executions.has(event.executionId)) throw new Error(`Duplicate executionId: ${event.executionId}`);
      executions.set(event.executionId, { commandId: event.commandId, closed: false });
    } else if (event.type === "command.finished" || event.type === "test.finished") {
      const execution = executions.get(event.executionId);
      if (!execution) throw new Error(`Unknown executionId: ${event.executionId}`);
      if (execution.commandId !== event.commandId) throw new Error(`Mismatched commandId for ${event.executionId}`);
      if (execution.closed) throw new Error(`Execution ${event.executionId} is already closed`);
      if (event.type === "command.finished") execution.closed = true;
    } else if (event.type === "run.finished") {
      if ([...executions.values()].some((execution) => !execution.closed)) {
        throw new Error("run.finished cannot close a Flight Recorder with open executions");
      }
      terminal = true;
    }
  });
}

export function eventEvidenceRefs(envelope: RunEnvelope): EvidenceRef[] {
  switch (envelope.event.type) {
    case "plan.recorded": return [envelope.event.plan];
    case "file.changed": return [envelope.event.diff];
    case "command.finished":
    case "test.finished": return [envelope.event.output];
    default: return [];
  }
}

function assertRunEvent(value: unknown): asserts value is RunEvent {
  assertRecord(value, "Flight Recorder event");
  if (typeof value.type !== "string") throw new Error("Flight Recorder event type is required");

  switch (value.type) {
    case "task.started":
      assertExactKeys(value, ["type", "taskId", "baseRevision", "intentHash"], value.type);
      assertToken(value.taskId, "taskId");
      assertGitOid(value.baseRevision, "baseRevision");
      assertSha256Field(value.intentHash, "intentHash");
      return;
    case "plan.recorded":
      assertExactKeys(value, ["type", "plan"], value.type);
      assertEvidenceRef(value.plan, "plan");
      return;
    case "file.changed":
      assertExactKeys(value, ["type", "path", "beforeSha256", "afterSha256", "diff"], value.type);
      if (typeof value.path !== "string") throw new Error("file.changed path must be a string");
      assertRelPath(value.path);
      assertSha256Field(value.beforeSha256, "beforeSha256");
      assertSha256Field(value.afterSha256, "afterSha256");
      assertEvidenceRef(value.diff, "diff");
      return;
    case "command.started":
      assertExactKeys(value, ["type", "executionId", "commandId"], value.type);
      assertToken(value.executionId, "executionId");
      assertToken(value.commandId, "commandId");
      return;
    case "command.finished":
      assertExactKeys(
        value,
        ["type", "executionId", "commandId", "exitCode", "timedOut", "cancelled", "output"],
        value.type,
      );
      assertToken(value.executionId, "executionId");
      assertToken(value.commandId, "commandId");
      if (value.exitCode !== null && !Number.isSafeInteger(value.exitCode)) throw new Error("exitCode must be an integer or null");
      if (typeof value.timedOut !== "boolean" || typeof value.cancelled !== "boolean") {
        throw new Error("Command terminal flags must be boolean");
      }
      if ((value.timedOut || value.cancelled) && value.exitCode !== null) {
        throw new Error("Timed out or cancelled commands cannot claim an exit code");
      }
      assertEvidenceRef(value.output, "command-output");
      return;
    case "test.finished":
      assertExactKeys(value, ["type", "executionId", "commandId", "testId", "status", "output"], value.type);
      assertToken(value.executionId, "executionId");
      assertToken(value.commandId, "commandId");
      assertToken(value.testId, "testId");
      if (!["passed", "failed", "skipped"].includes(String(value.status))) throw new Error("Unknown test status");
      assertEvidenceRef(value.output, "test-output");
      return;
    case "run.finished":
      assertObjectShape(value, ["type", "status"], ["targetRevision"], value.type);
      if (!["succeeded", "failed", "cancelled"].includes(String(value.status))) throw new Error("Unknown run status");
      if (value.targetRevision !== undefined) assertGitOid(value.targetRevision, "targetRevision");
      if (value.status === "succeeded" && value.targetRevision === undefined) {
        throw new Error("A succeeded run.finished requires targetRevision");
      }
      return;
    default:
      throw new Error(`Unknown Flight Recorder event type: ${value.type}`);
  }
}

export function assertEvidenceRef(value: unknown, expectedKind: EvidenceKind): asserts value is EvidenceRef {
  assertRecord(value, "evidence ref");
  assertExactKeys(
    value,
    ["id", "kind", "sha256", "storedBytes", "originalBytes", "truncated", "redactions", "mediaType", "visibility"],
    "evidence ref",
  );
  assertToken(value.id, "evidenceId");
  if (value.kind !== expectedKind) throw new Error(`Evidence kind must be ${expectedKind}`);
  assertSha256Field(value.sha256, "evidence sha256");
  if (
    !Number.isSafeInteger(value.storedBytes) ||
    !Number.isSafeInteger(value.originalBytes) ||
    (value.storedBytes as number) < 0 ||
    (value.originalBytes as number) < (value.storedBytes as number) ||
    (value.storedBytes as number) > 1024 * 1024
  ) {
    throw new Error("Evidence byte counts are invalid");
  }
  if (typeof value.truncated !== "boolean") throw new Error("Evidence truncated must be boolean");
  if (!Array.isArray(value.redactions)) throw new Error("Evidence redactions must be an array");
  const redactions = value.redactions as unknown[];
  const ids: string[] = [];
  for (const item of redactions) {
    assertRecord(item, "redaction summary");
    assertExactKeys(item, ["ruleId", "count"], "redaction summary");
    assertToken(item.ruleId, "redaction ruleId");
    if (!Number.isSafeInteger(item.count) || (item.count as number) < 1) throw new Error("Redaction count must be positive");
    ids.push(item.ruleId);
  }
  const sorted = [...ids].sort(compareUtf8);
  if (ids.some((id, index) => id !== sorted[index] || (index > 0 && id === sorted[index - 1]))) {
    throw new Error("Evidence redactions must be sorted and unique");
  }
  assertBoundedText(value.mediaType, 128, "mediaType");
  if (!/^[A-Za-z0-9][A-Za-z0-9.+-]*\/[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(value.mediaType)) {
    throw new Error("Invalid evidence mediaType");
  }
  if (!["controller", "participant", "oracle"].includes(String(value.visibility))) {
    throw new Error("Unknown evidence visibility");
  }
}

function assertSha256Field(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  assertSha256(value, label);
}
