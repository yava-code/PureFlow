import type { EvidenceRef } from "../recorder/events";
import { assertEvidenceRef } from "../recorder/events";
import { assertBoundedText, assertGitOid, assertRecord, assertToken } from "../agent/types";
import { assertExactKeys, assertRelPath, assertSha256, compareUtf8 } from "../rnd/canonical";
import type { CommandRegistrySnapshot, SanitizedSnapshot } from "../twin/types";

export type ExperienceStep =
  | { kind: "materialize-snapshot"; snapshotId: string }
  | { kind: "apply-change"; changeRef: EvidenceRef }
  | { kind: "run-approved-command"; commandId: string };

export interface JudgeSpec {
  timeoutMs: number;
  commandRegistryHash: string;
  editablePaths: string[];
  protectedFiles: Array<{ path: string; sha256: string }>;
  checks: Array<
    | { id: string; kind: "approved-command"; commandId: string; expectedExitCode: number }
    | { id: string; kind: "file-hash"; path: string; expectedHash: string }
    | { id: string; kind: "trace"; traceId: string; expectedRef: EvidenceRef }
  >;
}

export interface InternalExperience {
  schemaVersion: 1;
  id: string;
  sourceRunId: string;
  projectId: string;
  sourceBaseRevision: string;
  sourceTargetRevision: string;
  snapshotId: string;
  snapshotTreeHash: string;
  commandRegistryHash: string;
  scope: { symbols: string[]; tests: string[]; concepts: string[] };
  kind: "recover";
  task: string;
  setup: ExperienceStep[];
  judge: JudgeSpec;
  hiddenAnswer: EvidenceRef;
  budgetMinutes: number;
}

export interface ParticipantExperience {
  schemaVersion: 1;
  id: string;
  snapshotId: string;
  snapshotTreeHash: string;
  scope: { symbols: string[]; concepts: string[] };
  kind: "recover";
  task: string;
  visibleChecks: string[];
  budgetMinutes: number;
}

export interface CompiledExperience {
  internal: InternalExperience;
  participant: ParticipantExperience;
  snapshot: SanitizedSnapshot;
  registry: CommandRegistrySnapshot;
  selectionReasons: string[];
}

export function assertInternalExperience(value: unknown): asserts value is InternalExperience {
  assertRecord(value, "internal experience");
  assertExactKeys(value, [
    "schemaVersion", "id", "sourceRunId", "projectId", "sourceBaseRevision", "sourceTargetRevision",
    "snapshotId", "snapshotTreeHash", "commandRegistryHash", "scope", "kind", "task", "setup", "judge",
    "hiddenAnswer", "budgetMinutes",
  ], "internal experience");
  if (value.schemaVersion !== 1 || value.kind !== "recover") throw new Error("Unsupported internal experience");
  assertToken(value.id, "experienceId");
  assertToken(value.sourceRunId, "sourceRunId");
  assertToken(value.projectId, "projectId");
  assertGitOid(value.sourceBaseRevision, "sourceBaseRevision");
  assertGitOid(value.sourceTargetRevision, "sourceTargetRevision");
  assertToken(value.snapshotId, "snapshotId");
  assertSha256(String(value.snapshotTreeHash), "snapshotTreeHash");
  assertSha256(String(value.commandRegistryHash), "commandRegistryHash");
  assertScope(value.scope, true);
  assertBoundedText(value.task, 4096, "experience task");
  if (!Number.isSafeInteger(value.budgetMinutes) || (value.budgetMinutes as number) < 1 || (value.budgetMinutes as number) > 60) {
    throw new Error("Experience budget is invalid");
  }
  if (!Array.isArray(value.setup) || value.setup.length === 0 || value.setup.length > 16) {
    throw new Error("Experience setup is invalid");
  }
  for (const step of value.setup) assertStep(step);
  assertJudgeSpec(value.judge);
  assertEvidenceRef(value.hiddenAnswer, "diff");
  if (value.hiddenAnswer.visibility !== "controller") throw new Error("Hidden answer must remain controller-only");
}

export function assertParticipantExperience(value: unknown): asserts value is ParticipantExperience {
  assertRecord(value, "participant experience");
  assertExactKeys(
    value,
    ["schemaVersion", "id", "snapshotId", "snapshotTreeHash", "scope", "kind", "task", "visibleChecks", "budgetMinutes"],
    "participant experience",
  );
  if (value.schemaVersion !== 1 || value.kind !== "recover") throw new Error("Unsupported participant experience");
  assertToken(value.id, "experienceId");
  assertToken(value.snapshotId, "snapshotId");
  assertSha256(String(value.snapshotTreeHash), "snapshotTreeHash");
  assertBoundedText(value.task, 4096, "experience task");
  assertScope(value.scope, false);
  assertSortedStrings(value.visibleChecks, "visible checks", true);
  if (!Number.isSafeInteger(value.budgetMinutes) || (value.budgetMinutes as number) < 1 || (value.budgetMinutes as number) > 60) {
    throw new Error("Experience budget is invalid");
  }
}

function assertScope(value: unknown, internal: boolean): void {
  assertRecord(value, "experience scope");
  assertExactKeys(value, internal ? ["symbols", "tests", "concepts"] : ["symbols", "concepts"], "experience scope");
  assertSortedStrings(value.symbols, "scope symbols", false);
  assertSortedStrings(value.concepts, "scope concepts", true);
  if (internal) assertSortedStrings(value.tests, "scope tests", true);
}

function assertSortedStrings(value: unknown, label: string, tokens: boolean): void {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) throw new Error(`${label} must be a bounded array`);
  let previous: string | undefined;
  for (const item of value) {
    if (tokens) assertToken(item, label);
    else {
      assertBoundedText(item, 512, label);
      if (item.length === 0) throw new Error(`${label} cannot contain empty values`);
    }
    if (previous !== undefined && compareUtf8(previous, item) >= 0) throw new Error(`${label} must be sorted and unique`);
    previous = item;
  }
}

function assertStep(value: unknown): void {
  assertRecord(value, "experience step");
  if (value.kind === "materialize-snapshot") {
    assertExactKeys(value, ["kind", "snapshotId"], "materialize step");
    assertToken(value.snapshotId, "snapshotId");
  } else if (value.kind === "apply-change") {
    assertExactKeys(value, ["kind", "changeRef"], "apply-change step");
    assertEvidenceRef(value.changeRef, "diff");
  } else if (value.kind === "run-approved-command") {
    assertExactKeys(value, ["kind", "commandId"], "command step");
    assertToken(value.commandId, "commandId");
  } else {
    throw new Error("Unknown experience step");
  }
}

function assertJudgeSpec(value: unknown): void {
  assertRecord(value, "judge spec");
  assertExactKeys(value, ["timeoutMs", "commandRegistryHash", "editablePaths", "protectedFiles", "checks"], "judge spec");
  if (!Number.isSafeInteger(value.timeoutMs) || (value.timeoutMs as number) < 1000 || (value.timeoutMs as number) > 600_000) {
    throw new Error("Judge timeout is invalid");
  }
  assertSha256(String(value.commandRegistryHash), "judge commandRegistryHash");
  assertSortedPaths(value.editablePaths, "editable paths");
  if (!Array.isArray(value.protectedFiles) || value.protectedFiles.length > 256) throw new Error("Protected files are invalid");
  let previous: string | undefined;
  for (const file of value.protectedFiles) {
    assertRecord(file, "protected file");
    assertExactKeys(file, ["path", "sha256"], "protected file");
    assertRelPath(String(file.path));
    assertSha256(String(file.sha256), "protected file hash");
    if (previous !== undefined && compareUtf8(previous, String(file.path)) >= 0) throw new Error("Protected files must be sorted and unique");
    previous = String(file.path);
  }
  if (!Array.isArray(value.checks) || value.checks.length === 0 || value.checks.length > 32) throw new Error("Judge checks are invalid");
  const ids: string[] = [];
  for (const check of value.checks) {
    assertRecord(check, "judge check");
    assertToken(check.id, "judge check ID");
    ids.push(check.id);
    if (check.kind === "approved-command") {
      assertExactKeys(check, ["id", "kind", "commandId", "expectedExitCode"], "approved command check");
      assertToken(check.commandId, "commandId");
      if (!Number.isSafeInteger(check.expectedExitCode)) throw new Error("Expected exit code is invalid");
    } else if (check.kind === "file-hash") {
      assertExactKeys(check, ["id", "kind", "path", "expectedHash"], "file hash check");
      assertRelPath(String(check.path));
      assertSha256(String(check.expectedHash), "expected file hash");
    } else if (check.kind === "trace") {
      assertExactKeys(check, ["id", "kind", "traceId", "expectedRef"], "trace check");
      assertToken(check.traceId, "traceId");
      assertEvidenceRef(check.expectedRef, "trace");
    } else {
      throw new Error("Unknown judge check");
    }
  }
  if (new Set(ids).size !== ids.length) throw new Error("Judge check IDs must be unique");
}

function assertSortedPaths(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.length === 0 || value.length > 256) throw new Error(`${label} are invalid`);
  let previous: string | undefined;
  for (const path of value) {
    assertRelPath(String(path));
    if (previous !== undefined && compareUtf8(previous, String(path)) >= 0) throw new Error(`${label} must be sorted and unique`);
    previous = String(path);
  }
}
