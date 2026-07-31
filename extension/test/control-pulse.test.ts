import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildSideCoachCapsule, validateSideCoachProposal } from "../src/pulse/capsule";
import {
  FixtureControlProbeCatalog,
  FixtureControlProbeStore,
  publishFixtureControlProbe,
  serializeParticipantControlProbe,
} from "../src/pulse/catalog";
import { FixtureControlPulse } from "../src/pulse/run";
import { validateChangeClaim, type ParticipantEvidenceReader } from "../src/pulse/validate";
import type { ChangeClaim, ControlProbeAttempt } from "../src/pulse/types";
import { canonicalHash, rawSha256 } from "../src/rnd/canonical";
import type { EvidenceRef } from "../src/recorder/events";
import { BuiltinFixtureCatalog } from "../src/twin/catalog";
import { MemoryCommandEvidenceStore, TrustedFixtureProcessRunner } from "../src/twin/commands";
import { EXPECTED_TENANT_CACHE_KEY } from "../src/twin/fixture-factory";
import { TwinManager } from "../src/twin/manager";
import { FixtureSnapshotStore } from "../src/twin/snapshot";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 3 })));
});

describe("R4.5 fixture-only Control Pulse", () => {
  it("validates a bounded claim and publishes an isolated deterministic probe", async () => {
    const env = await setup();
    const first = await publish(env);
    const second = await publish(env);

    expect(second.internal).toEqual(first.internal);
    expect(env.validated.claimHash).toBe("b4c96f12dcc9fd57d6c4d832e02ec4ac78c00e90def8d02adcaa7cd1af0d8774");
    expect(first.internalProbeHash).toBe("bb5affc86bb401df2fcf950b2a7d0fe708bb66b653033bf9758723cf6c6d3934");
    expect(first.participant).toEqual({
      schemaVersion: 1,
      id: "probe_tenant_isolation",
      internalProbeHash: first.internalProbeHash,
      claim: env.claim,
      participant: {
        prompt: "Before the check runs: will tenant isolation hold for two tenants sharing the same id?",
        inputs: [{ id: "tenant-isolation-boundary", label: "Run the tenant-isolation boundary check" }],
      },
    });
    const wire = serializeParticipantControlProbe(first.participant);
    for (const forbidden of ["fixtureId", "commandId", "manifestHash", "mutated", "oracle", EXPECTED_TENANT_CACHE_KEY.targetRevision]) {
      expect(wire).not.toContain(forbidden);
    }
    expect(() => serializeParticipantControlProbe({ ...first.participant, commandId: "leak" } as typeof first.participant)).toThrow("unknown");
  });

  it("fails malformed, unstable, cross-project, hidden, unsorted, and oversized claims closed", async () => {
    const env = await setup();
    await expect(validateChangeClaim({ ...env.claim, checkpointId: "wrong" }, env.context)).rejects.toThrow("checkpoint");
    await expect(validateChangeClaim(env.claim, { ...env.context, stablePassing: false })).rejects.toThrow("stable");
    await expect(validateChangeClaim({
      ...env.claim,
      evidenceRefs: [env.claim.evidenceRefs[0]!, { ...env.claim.evidenceRefs[0]!, id: "evidence_a" }],
    }, env.context)).rejects.toThrow("sorted");
    await expect(validateChangeClaim({ ...env.claim, intent: "x".repeat(1_025) }, env.context)).rejects.toThrow("1024");
    await expect(validateChangeClaim({ ...env.claim, boundary: { ...env.claim.boundary, path: "C:/secret.ts" } }, env.context)).rejects.toThrow("relative");

    const hidden = structuredClone(env.claim);
    hidden.evidenceRefs[0]!.visibility = "participant";
    const hiddenReader: ParticipantEvidenceReader = {
      open: async () => ({ ...env.opened, ref: { ...env.opened.ref, visibility: "controller" } }),
    };
    await expect(validateChangeClaim(hidden, { ...env.context, evidence: hiddenReader })).rejects.toThrow("participant");
    await expect(validateChangeClaim(env.claim, { ...env.context, projectId: "other_project" })).rejects.toThrow("project");
  });

  it("builds a redacted Side Coach capsule and keeps model output non-executable", async () => {
    const env = await setup("See C:\\work\\repo\\src\\cache-key.ts and /home/dev/repo; token=ghp_abcdefghijklmnopqrstuvwxyz123456");
    const published = await publish(env);
    const capsule = await buildSideCoachCapsule(published.participant, env.validated, "I predict failure because tenant is missing.");
    const wire = JSON.stringify(capsule);
    expect(wire).not.toContain("C:\\work");
    expect(wire).not.toContain("/home/dev");
    expect(wire).not.toContain("ghp_");
    expect(wire).not.toContain(env.opened.ref.id);

    expect(validateSideCoachProposal({
      schemaVersion: 1,
      hypothesis: "The tenant dimension is absent.",
      probeInputId: "tenant-isolation-boundary",
    }, capsule)).toMatchObject({ probeInputId: "tenant-isolation-boundary" });
    expect(() => validateSideCoachProposal({
      schemaVersion: 1,
      hypothesis: "Run this patch",
      probeInputId: "rm-rf",
      command: "rm -rf /",
    }, capsule)).toThrow();
  });

  it("commits prediction before observation and executes only the catalog state/check pair", async () => {
    const env = await setup();
    const published = await publish(env);
    const committed = await env.pulse.commit(published.participant, attempt(published));
    expect(committed.attemptHash).toBe("078d4a5857df1d91e0d71e858cd30a77889f7e5f6ae05ab9cbb99980a64d04d9");
    const result = await env.pulse.execute("project_r0_fixture", committed.attempt.id, committed.attemptHash);

    expect(result).toMatchObject({
      probeId: "probe_tenant_isolation",
      probeInputId: "tenant-isolation-boundary",
      checkId: "cache-key.tenant-isolation",
      observation: "fails",
      commandStatus: { exitCode: 1, timedOut: false, cancelled: false },
      predictionResult: "confirmed",
    });
    expect(result.commandResultHash).toMatch(/^[0-9a-f]{64}$/);
    expect(env.runner.requests).toEqual([{
      fixtureId: "tenant-cache-key",
      manifestHash: EXPECTED_TENANT_CACHE_KEY.manifestHash,
      stateId: "mutated",
      commandId: "cache-key.tenant-isolation",
    }]);

    const proseAttempt = attempt(published, "attempt_same_prediction");
    proseAttempt.explanation = "Different prose, same committed causal prediction.";
    const proseCommit = await env.pulse.commit(published.participant, proseAttempt);
    const proseResult = await env.pulse.execute("project_r0_fixture", proseCommit.attempt.id, proseCommit.attemptHash);
    expect(proseResult.observation).toBe(result.observation);
    expect(proseResult.predictionResult).toBe(result.predictionResult);
  }, 45_000);

  it("rejects projection drift, evidence drift, replay, cross-project, and late attempts before execution", async () => {
    const env = await setup();
    const published = await publish(env);
    const drifted = structuredClone(published.participant);
    drifted.participant.inputs[0]!.label = "Different label";
    await expect(env.pulse.commit(drifted, attempt(published))).rejects.toThrow("projection");

    const badEvidence = attempt(published);
    badEvidence.selectedEvidenceIds = ["unknown_evidence"];
    await expect(env.pulse.commit(published.participant, badEvidence)).rejects.toThrow("evidence");

    const committed = await env.pulse.commit(published.participant, attempt(published));
    await expect(env.pulse.execute("other_project", committed.attempt.id, committed.attemptHash)).rejects.toThrow("project");
    await env.pulse.execute("project_r0_fixture", committed.attempt.id, committed.attemptHash);
    await expect(env.pulse.execute("project_r0_fixture", committed.attempt.id, committed.attemptHash)).rejects.toThrow("replay");

    const late = attempt(published, "attempt_late");
    late.committedAt = "2025-12-31T23:00:00.000Z";
    const lateCommit = await env.pulse.commit(published.participant, late);
    const lateResult = await env.pulse.execute("project_r0_fixture", lateCommit.attempt.id, lateCommit.attemptHash);
    expect(lateResult).toMatchObject({ observation: "failed-integrity", predictionResult: "invalid", commandResultHash: null });
    expect(env.runner.requests).toHaveLength(1);
  }, 45_000);

  it("never confirms a predicted failure on timeout, cancellation, or runner error", async () => {
    const env = await setup();
    const published = await publish(env);
    env.runner.mode = "timeout";
    const timed = await env.pulse.commit(published.participant, attempt(published, "attempt_timeout"));
    const timedResult = await env.pulse.execute("project_r0_fixture", timed.attempt.id, timed.attemptHash);
    expect(timedResult).toMatchObject({ observation: "execution-error", predictionResult: "invalid" });
    expect(timedResult.commandResultHash).toMatch(/^[0-9a-f]{64}$/);

    env.runner.mode = "cancel";
    const cancelled = await env.pulse.commit(published.participant, attempt(published, "attempt_cancel"));
    const cancelledResult = await env.pulse.execute("project_r0_fixture", cancelled.attempt.id, cancelled.attemptHash);
    expect(cancelledResult).toMatchObject({ observation: "execution-error", predictionResult: "invalid" });
    expect(cancelledResult.commandResultHash).toMatch(/^[0-9a-f]{64}$/);

    env.runner.mode = "error";
    const committed = await env.pulse.commit(published.participant, attempt(published, "attempt_error"));
    const result = await env.pulse.execute("project_r0_fixture", committed.attempt.id, committed.attemptHash);
    expect(result).toMatchObject({ observation: "execution-error", predictionResult: "invalid", commandResultHash: null });
  }, 45_000);
});

class RecordingRunner extends TrustedFixtureProcessRunner {
  requests: Array<{ fixtureId: string; manifestHash: string; stateId: string; commandId: string }> = [];
  mode: "real" | "error" | "timeout" | "cancel" = "real";

  override async run(request: Parameters<TrustedFixtureProcessRunner["run"]>[0]) {
    this.requests.push({
      fixtureId: request.fixtureId,
      manifestHash: request.manifestHash,
      stateId: request.stateId,
      commandId: request.commandId,
    });
    if (this.mode === "error") throw new Error("runner unavailable");
    if (this.mode === "timeout" || this.mode === "cancel") {
      const empty = emptyEvidence("pulse_empty_output");
      return {
        executionId: request.executionId,
        commandId: request.commandId,
        exitCode: null,
        timedOut: this.mode === "timeout",
        cancelled: this.mode === "cancel",
        stdout: empty,
        stderr: empty,
      };
    }
    return super.run(request);
  }
}

function emptyEvidence(id: string): EvidenceRef {
  return {
    id,
    kind: "command-output",
    sha256: rawSha256(""),
    storedBytes: 0,
    originalBytes: 0,
    truncated: false,
    redactions: [],
    mediaType: "text/plain",
    visibility: "controller",
  };
}

async function setup(content = "The diff removes tenant from the cache key.") {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r45-"));
  roots.push(root);
  const bytes = Buffer.from(content, "utf8");
  const ref: EvidenceRef = {
    id: "evidence_cache_key_diff",
    kind: "diff",
    sha256: rawSha256(bytes),
    storedBytes: bytes.byteLength,
    originalBytes: bytes.byteLength,
    truncated: false,
    redactions: [],
    mediaType: "text/plain",
    visibility: "participant",
  };
  const opened = { projectId: "project_r0_fixture", ref, content };
  const evidence: ParticipantEvidenceReader = {
    open: async (projectId, id) => projectId === opened.projectId && id === ref.id ? structuredClone(opened) : undefined,
  };
  const claim: ChangeClaim = {
    schemaVersion: 1,
    checkpointId: "checkpoint_tenant_cache",
    intent: "Keep cache entries isolated by tenant.",
    changedBehavior: "The cache key now includes the tenant boundary.",
    boundary: { path: "src/cache-key.ts", symbol: "cacheKey" },
    invariant: "Equal ids in different tenants must produce different keys.",
    evidenceRefs: [{ id: ref.id, sha256: ref.sha256, visibility: "participant" }],
    unresolvedAssumption: "Callers always provide a tenant id.",
  };
  const context = {
    projectId: opened.projectId,
    checkpointId: claim.checkpointId,
    stablePassing: true,
    evidence,
  };
  const validated = await validateChangeClaim(claim, context);
  const fixtureCatalog = new BuiltinFixtureCatalog();
  const snapshots = new FixtureSnapshotStore(join(root, "snapshots"), fixtureCatalog, { now: () => "2026-01-01T00:00:00.000Z" });
  const twins = new TwinManager(join(root, "twins"), snapshots);
  const commandEvidence = new MemoryCommandEvidenceStore();
  const runner = new RecordingRunner(fixtureCatalog, twins, commandEvidence);
  const probeCatalog = new FixtureControlProbeCatalog();
  const probes = new FixtureControlProbeStore();
  const pulse = new FixtureControlPulse(probeCatalog, probes, fixtureCatalog, snapshots, twins, runner, {
    now: () => new Date("2026-01-01T00:05:00.000Z"),
  });
  return { root, opened, evidence, claim, context, validated, fixtureCatalog, snapshots, twins, runner, probeCatalog, probes, pulse };
}

async function publish(env: Awaited<ReturnType<typeof setup>>) {
  return publishFixtureControlProbe({
    id: "probe_tenant_isolation",
    projectId: "project_r0_fixture",
    claim: env.validated,
    sourceTreeHash: EXPECTED_TENANT_CACHE_KEY.targetTreeHash,
    catalog: env.probeCatalog,
    store: env.probes,
  });
}

function attempt(
  published: { internalProbeHash: string; participant: { claim: ChangeClaim } },
  id = "attempt_tenant_isolation",
): ControlProbeAttempt {
  return {
    schemaVersion: 1,
    id,
    projectId: "project_r0_fixture",
    probeId: "probe_tenant_isolation",
    internalProbeHash: published.internalProbeHash,
    claimHash: canonicalHash("control-claim", published.participant.claim),
    sourceTreeHash: EXPECTED_TENANT_CACHE_KEY.targetTreeHash,
    selectedProbeInputId: "tenant-isolation-boundary",
    prediction: "fails",
    selectedEvidenceIds: ["evidence_cache_key_diff"],
    explanation: "Without the tenant dimension, equal ids collide.",
    committedAt: "2026-01-01T00:04:00.000Z",
  };
}
