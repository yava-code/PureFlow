import {
  assertBoundedText,
  assertIsoTime,
  assertObjectShape,
  assertRecord,
  assertToken,
} from "../agent/types";
import {
  assertExactKeys,
  assertRelPath,
  assertSha256,
  canonicalHash,
  canonicalJson,
  compareUtf8,
} from "../rnd/canonical";
import { assertEvidenceRef, type EvidenceRef } from "../recorder/events";
import type {
  CatalogControlProbe,
  ChangeClaim,
  ControlProbeAttempt,
  ControlProbeResult,
  FixtureControlProbe,
  OpenedParticipantEvidence,
  ParticipantControlProbe,
  ParticipantProbeSurface,
  ValidatedClaim,
} from "./types";

export interface ParticipantEvidenceReader {
  open(projectId: string, id: string): Promise<{ projectId: string; ref: EvidenceRef; content: string } | undefined>;
}

export interface ClaimValidationContext {
  projectId: string;
  checkpointId: string;
  stablePassing: boolean;
  evidence: ParticipantEvidenceReader;
}

export async function validateChangeClaim(
  value: unknown,
  context: ClaimValidationContext,
): Promise<ValidatedClaim> {
  assertToken(context.projectId, "projectId");
  assertToken(context.checkpointId, "checkpointId");
  if (!context.stablePassing) throw new Error("Control claim requires a stable passing checkpoint");
  assertChangeClaim(value);
  if (value.checkpointId !== context.checkpointId) throw new Error("Control claim checkpoint identity changed");

  const evidence: OpenedParticipantEvidence[] = [];
  for (const compact of value.evidenceRefs) {
    const opened = await context.evidence.open(context.projectId, compact.id);
    if (!opened || opened.projectId !== context.projectId) {
      throw new Error("Claim evidence is unknown or belongs to another project");
    }
    assertEvidenceRef(opened.ref, opened.ref.kind);
    if (opened.ref.visibility !== "participant" || compact.visibility !== "participant") {
      throw new Error("Claim evidence must be participant-visible");
    }
    if (opened.ref.id !== compact.id || opened.ref.sha256 !== compact.sha256) {
      throw new Error("Claim evidence identity or hash changed");
    }
    evidence.push({
      projectId: opened.projectId,
      ref: structuredClone(opened.ref) as OpenedParticipantEvidence["ref"],
      content: opened.content,
    });
  }
  return {
    claim: structuredClone(value),
    claimHash: canonicalHash("control-claim", value),
    evidence,
  };
}

export function assertChangeClaim(value: unknown): asserts value is ChangeClaim {
  assertRecord(value, "change claim");
  assertObjectShape(
    value,
    ["schemaVersion", "checkpointId", "intent", "changedBehavior", "boundary", "invariant", "evidenceRefs"],
    ["unresolvedAssumption"],
    "change claim",
  );
  if (value.schemaVersion !== 1) throw new Error("Unsupported change claim");
  assertToken(value.checkpointId, "checkpointId");
  assertBoundedText(value.intent, 1024, "claim intent");
  assertBoundedText(value.changedBehavior, 1024, "changed behavior");
  assertBoundedText(value.invariant, 1024, "claim invariant");
  if (value.unresolvedAssumption !== undefined) {
    assertBoundedText(value.unresolvedAssumption, 1024, "unresolved assumption");
  }
  assertRecord(value.boundary, "claim boundary");
  assertExactKeys(value.boundary, ["path", "symbol"], "claim boundary");
  if (typeof value.boundary.path !== "string") throw new Error("Claim boundary path must be relative");
  assertRelPath(value.boundary.path);
  if (Buffer.byteLength(value.boundary.path) > 1024) throw new Error("Claim boundary path exceeds 1024 bytes");
  assertBoundedText(value.boundary.symbol, 256, "claim boundary symbol");
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length > 8) {
    throw new Error("Claim evidence refs must contain at most eight entries");
  }
  let previous: string | undefined;
  for (const ref of value.evidenceRefs) {
    assertRecord(ref, "claim evidence ref");
    assertExactKeys(ref, ["id", "sha256", "visibility"], "claim evidence ref");
    assertToken(ref.id, "evidenceId");
    assertSha256(String(ref.sha256), "claim evidence hash");
    if (ref.visibility !== "participant") throw new Error("Claim evidence must be participant-visible");
    if (previous !== undefined && compareUtf8(previous, ref.id as string) >= 0) {
      throw new Error("Claim evidence refs must be sorted and unique");
    }
    previous = ref.id as string;
  }
  if (Buffer.byteLength(canonicalJson(value)) > 8192) throw new Error("Canonical claim exceeds 8192 bytes");
}

export function assertProbeSurface(value: unknown): asserts value is ParticipantProbeSurface {
  assertRecord(value, "probe surface");
  assertExactKeys(value, ["prompt", "inputs"], "probe surface");
  assertBoundedText(value.prompt, 2048, "probe prompt");
  if (!Array.isArray(value.inputs) || value.inputs.length === 0 || value.inputs.length > 8) {
    throw new Error("Probe surface inputs are invalid");
  }
  let previous: string | undefined;
  for (const input of value.inputs) {
    assertRecord(input, "probe input");
    assertExactKeys(input, ["id", "label"], "probe input");
    assertToken(input.id, "probe input ID");
    assertBoundedText(input.label, 512, "probe input label");
    if (previous !== undefined && compareUtf8(previous, input.id as string) >= 0) {
      throw new Error("Probe inputs must be sorted and unique");
    }
    previous = input.id as string;
  }
}

export function assertCatalogControlProbe(value: unknown): asserts value is CatalogControlProbe {
  assertRecord(value, "catalog control probe");
  assertExactKeys(value, [
    "schemaVersion", "id", "fixtureId", "fixtureManifestHash", "state", "checkId", "prompt",
  ], "catalog control probe");
  if (value.schemaVersion !== 1) throw new Error("Unsupported catalog control probe");
  assertToken(value.id, "probe input ID");
  assertToken(value.fixtureId, "fixtureId");
  assertSha256(String(value.fixtureManifestHash), "fixtureManifestHash");
  if (value.state !== "target" && value.state !== "mutated") throw new Error("Catalog probe state is invalid");
  assertToken(value.checkId, "checkId");
  assertBoundedText(value.prompt, 2048, "catalog probe prompt");
}

export function assertFixtureControlProbe(value: unknown): asserts value is FixtureControlProbe {
  assertRecord(value, "fixture control probe");
  assertExactKeys(value, [
    "schemaVersion", "mode", "id", "projectId", "claimHash", "sourceTreeHash",
    "fixtureId", "fixtureManifestHash", "participant",
  ], "fixture control probe");
  if (value.schemaVersion !== 1 || value.mode !== "fixture") throw new Error("Unsupported fixture control probe");
  assertToken(value.id, "probeId");
  assertToken(value.projectId, "projectId");
  assertSha256(String(value.claimHash), "claimHash");
  assertSha256(String(value.sourceTreeHash), "sourceTreeHash");
  assertToken(value.fixtureId, "fixtureId");
  assertSha256(String(value.fixtureManifestHash), "fixtureManifestHash");
  assertProbeSurface(value.participant);
}

export function assertParticipantControlProbe(value: unknown): asserts value is ParticipantControlProbe {
  assertRecord(value, "participant control probe");
  assertExactKeys(value, ["schemaVersion", "id", "internalProbeHash", "claim", "participant"], "participant control probe");
  if (value.schemaVersion !== 1) throw new Error("Unsupported participant control probe");
  assertToken(value.id, "probeId");
  assertSha256(String(value.internalProbeHash), "internalProbeHash");
  assertChangeClaim(value.claim);
  assertProbeSurface(value.participant);
}

export function assertControlProbeAttempt(value: unknown): asserts value is ControlProbeAttempt {
  assertRecord(value, "control probe attempt");
  assertExactKeys(value, [
    "schemaVersion", "id", "projectId", "probeId", "internalProbeHash", "claimHash", "sourceTreeHash",
    "selectedProbeInputId", "prediction", "selectedEvidenceIds", "explanation", "committedAt",
  ], "control probe attempt");
  if (value.schemaVersion !== 1) throw new Error("Unsupported control probe attempt");
  assertToken(value.id, "attemptId");
  assertToken(value.projectId, "projectId");
  assertToken(value.probeId, "probeId");
  assertSha256(String(value.internalProbeHash), "internalProbeHash");
  assertSha256(String(value.claimHash), "claimHash");
  assertSha256(String(value.sourceTreeHash), "sourceTreeHash");
  assertToken(value.selectedProbeInputId, "selectedProbeInputId");
  if (value.prediction !== "passes" && value.prediction !== "fails") throw new Error("Prediction is invalid");
  assertSortedTokens(value.selectedEvidenceIds, "selected evidence IDs", 8);
  assertBoundedText(value.explanation, 4096, "attempt explanation");
  assertIsoTime(value.committedAt, "committedAt");
}

export function assertControlProbeResult(value: unknown): asserts value is ControlProbeResult {
  assertRecord(value, "control probe result");
  assertExactKeys(value, [
    "schemaVersion", "projectId", "probeId", "internalProbeHash", "claimHash", "sourceTreeHash", "attemptHash",
    "probeInputId", "checkId", "commandId", "observation", "commandStatus", "predictionResult",
    "commandResultHash", "resultHash",
  ], "control probe result");
  if (value.schemaVersion !== 1) throw new Error("Unsupported control probe result");
  assertToken(value.projectId, "projectId");
  assertToken(value.probeId, "probeId");
  assertSha256(String(value.internalProbeHash), "internalProbeHash");
  assertSha256(String(value.claimHash), "claimHash");
  assertSha256(String(value.sourceTreeHash), "sourceTreeHash");
  assertSha256(String(value.attemptHash), "attemptHash");
  assertToken(value.probeInputId, "probeInputId");
  if (value.checkId !== null) assertToken(value.checkId, "checkId");
  assertToken(value.commandId, "commandId");
  if (!["passes", "fails", "execution-error", "failed-integrity"].includes(String(value.observation))) throw new Error("Observation is invalid");
  assertRecord(value.commandStatus, "command status");
  assertExactKeys(value.commandStatus, ["exitCode", "timedOut", "cancelled"], "command status");
  if (value.commandStatus.exitCode !== null && !Number.isSafeInteger(value.commandStatus.exitCode)) throw new Error("Exit code is invalid");
  if (typeof value.commandStatus.timedOut !== "boolean" || typeof value.commandStatus.cancelled !== "boolean") throw new Error("Command flags are invalid");
  if ((value.commandStatus.timedOut || value.commandStatus.cancelled) && value.commandStatus.exitCode !== null) {
    throw new Error("Timed out or cancelled probes cannot claim an exit code");
  }
  if (!["confirmed", "falsified", "invalid"].includes(String(value.predictionResult))) throw new Error("Prediction result is invalid");
  const observed = value.observation === "passes" || value.observation === "fails";
  if (observed && (value.commandStatus.exitCode === null || value.commandStatus.timedOut || value.commandStatus.cancelled)) {
    throw new Error("Observed probe result requires a clean command terminal state");
  }
  if (!observed && value.predictionResult !== "invalid") throw new Error("Non-observation cannot confirm a prediction");
  if (value.commandResultHash !== null) assertSha256(String(value.commandResultHash), "commandResultHash");
  assertSha256(String(value.resultHash), "resultHash");
  const { resultHash, ...core } = value;
  if (canonicalHash("control-probe-result", core) !== resultHash) throw new Error("Control probe result hash changed");
}

function assertSortedTokens(value: unknown, label: string, max: number): asserts value is string[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label} are invalid`);
  let previous: string | undefined;
  for (const item of value) {
    assertToken(item, label);
    if (previous !== undefined && compareUtf8(previous, item) >= 0) throw new Error(`${label} must be sorted and unique`);
    previous = item;
  }
}
