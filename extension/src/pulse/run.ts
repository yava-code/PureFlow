import { randomUUID } from "node:crypto";
import { canonicalHash, canonicalJson } from "../rnd/canonical";
import type { EvidenceRef } from "../recorder/events";
import { BuiltinFixtureCatalog } from "../twin/catalog";
import { TrustedFixtureProcessRunner } from "../twin/commands";
import type { FixtureBlobRef } from "../twin/fixture-contract";
import { TwinManager } from "../twin/manager";
import { FixtureSnapshotStore } from "../twin/snapshot";
import type { CommandResult, TwinSession } from "../twin/types";
import {
  assertParticipantProjection,
  FixtureControlProbeCatalog,
  FixtureControlProbeStore,
  type PublishedFixtureProbe,
} from "./catalog";
import type {
  CatalogControlProbe,
  ControlProbeAttempt,
  ControlProbeResult,
  ParticipantControlProbe,
} from "./types";
import { assertControlProbeAttempt, assertControlProbeResult } from "./validate";

interface CommittedAttempt {
  attempt: ControlProbeAttempt;
  attemptHash: string;
  published: PublishedFixtureProbe;
}

export class FixtureControlPulse {
  private readonly attempts = new Map<string, CommittedAttempt>();
  private readonly tombstones = new Set<string>();

  constructor(
    private readonly catalog: FixtureControlProbeCatalog,
    private readonly probes: FixtureControlProbeStore,
    private readonly fixtures: BuiltinFixtureCatalog,
    private readonly snapshots: FixtureSnapshotStore,
    private readonly twins: TwinManager,
    private readonly runner: TrustedFixtureProcessRunner,
    private readonly options: { now?: () => Date; maxAgeMs?: number } = {},
  ) {}

  async commit(participant: ParticipantControlProbe, attempt: ControlProbeAttempt): Promise<{
    attempt: ControlProbeAttempt;
    attemptHash: string;
  }> {
    assertControlProbeAttempt(attempt);
    const key = attemptKey(attempt.projectId, attempt.id);
    if (this.attempts.has(key) || this.tombstones.has(key)) throw new Error("Control probe attempt ID was reused");
    const published = this.probes.open(attempt.projectId, attempt.probeId, attempt.internalProbeHash);
    if (!published) throw new Error("Control probe is unknown for project");
    assertParticipantProjection(published, participant);
    if (
      attempt.claimHash !== published.internal.claimHash ||
      attempt.sourceTreeHash !== published.internal.sourceTreeHash ||
      attempt.probeId !== published.internal.id
    ) {
      throw new Error("Control probe attempt identity changed");
    }
    if (!published.internal.participant.inputs.some(({ id }) => id === attempt.selectedProbeInputId)) {
      throw new Error("Control probe attempt selected an unknown input");
    }
    const evidence = new Set(participant.claim.evidenceRefs.map(({ id }) => id));
    if (attempt.selectedEvidenceIds.some((id) => !evidence.has(id))) {
      throw new Error("Control probe attempt selected unknown evidence");
    }
    const attemptHash = canonicalHash("control-probe-attempt", attempt);
    this.attempts.set(key, {
      attempt: structuredClone(attempt),
      attemptHash,
      published: structuredClone(published),
    });
    return { attempt: structuredClone(attempt), attemptHash };
  }

  async execute(projectId: string, attemptId: string, attemptHash: string): Promise<ControlProbeResult> {
    const key = attemptKey(projectId, attemptId);
    if (this.tombstones.has(key)) throw new Error("Control probe attempt replay was rejected");
    const committed = this.attempts.get(key);
    if (!committed) {
      if ([...this.attempts.values()].some(({ attempt }) => attempt.id === attemptId)) {
        throw new Error("Control probe attempt belongs to another project");
      }
      throw new Error("Control probe attempt is unknown");
    }
    if (committed.attemptHash !== attemptHash) throw new Error("Control probe attempt hash changed");
    const { attempt, published } = committed;
    const selected = this.resolveSelected(published, attempt.selectedProbeInputId);
    const binding = await this.resolveBinding(published, selected);

    this.attempts.delete(key);
    this.tombstones.add(key);
    if (!binding) return terminalResult(attempt, attemptHash, selected, null, "failed-integrity");

    const age = (this.options.now ?? (() => new Date()))().getTime() - Date.parse(attempt.committedAt);
    if (age < 0 || age > (this.options.maxAgeMs ?? 10 * 60_000)) {
      return terminalResult(attempt, attemptHash, selected, binding.commandId, "failed-integrity");
    }

    let twin: TwinSession | undefined;
    try {
      const mutation = evidenceFromFixture(binding.record.manifest.mutation.changeRef);
      const target = binding.record.manifest.states.find((state) => state.id === "target")!;
      const snapshot = await this.snapshots.create({
        projectId,
        sourceRevision: binding.record.manifest.targetRevision,
        mutationId: binding.record.manifest.mutation.id,
        mutation,
        allowedFiles: target.files.map(({ path }) => path),
      });
      twin = await this.twins.prepare(projectId, snapshot.id);
      const command = await this.runner.run({
        executionId: randomUUID().replaceAll("-", ""),
        projectId,
        fixtureId: selected.fixtureId,
        manifestHash: selected.fixtureManifestHash,
        stateId: selected.state,
        commandId: binding.commandId,
        twinHandle: twin.handle,
      });
      return observedResult(attempt, attemptHash, selected, binding.commandId, command);
    } catch {
      return terminalResult(attempt, attemptHash, selected, binding.commandId, "execution-error");
    } finally {
      if (twin) await this.twins.cleanup(projectId, twin.handle);
    }
  }

  private resolveSelected(published: PublishedFixtureProbe, inputId: string): CatalogControlProbe {
    const selected = this.catalog.open(inputId, published.internal.fixtureId, published.internal.fixtureManifestHash);
    if (!selected) throw new Error("Committed probe input left the immutable catalog");
    const surface = this.catalog.surface(published.internal.fixtureId, published.internal.fixtureManifestHash);
    if (canonicalJson(surface) !== canonicalJson(published.internal.participant)) {
      throw new Error("Committed probe surface changed");
    }
    return selected;
  }

  private async resolveBinding(published: PublishedFixtureProbe, selected: CatalogControlProbe) {
    const record = await this.fixtures.open(selected.fixtureId, selected.fixtureManifestHash);
    if (!record) return undefined;
    const target = record.manifest.states.find((state) => state.id === "target");
    const state = record.manifest.states.find((item) => item.id === selected.state);
    const check = record.manifest.checks.find((item) => item.id === selected.checkId);
    if (
      !target || published.internal.sourceTreeHash !== target.treeHash ||
      !state || !check || !state.commandIds.includes(check.commandId)
    ) {
      return undefined;
    }
    return { record, commandId: check.commandId };
  }
}

function observedResult(
  attempt: ControlProbeAttempt,
  attemptHash: string,
  selected: CatalogControlProbe,
  commandId: string,
  command: CommandResult,
): ControlProbeResult {
  if (command.timedOut || command.cancelled || command.exitCode === null) {
    return terminalResult(attempt, attemptHash, selected, commandId, "execution-error", command);
  }
  const observation = command.exitCode === 0 ? "passes" : "fails";
  return terminalResult(attempt, attemptHash, selected, commandId, observation, command);
}

function terminalResult(
  attempt: ControlProbeAttempt,
  attemptHash: string,
  selected: CatalogControlProbe,
  commandId: string | null,
  observation: ControlProbeResult["observation"],
  command?: CommandResult,
): ControlProbeResult {
  const observed = observation === "passes" || observation === "fails";
  const core = {
    schemaVersion: 1 as const,
    projectId: attempt.projectId,
    probeId: attempt.probeId,
    internalProbeHash: attempt.internalProbeHash,
    claimHash: attempt.claimHash,
    sourceTreeHash: attempt.sourceTreeHash,
    attemptHash,
    probeInputId: selected.id,
    checkId: selected.checkId,
    commandId: commandId ?? "unresolved-command",
    observation,
    commandStatus: {
      exitCode: command?.exitCode ?? null,
      timedOut: command?.timedOut ?? false,
      cancelled: command?.cancelled ?? false,
    },
    predictionResult: observed
      ? (attempt.prediction === observation ? "confirmed" as const : "falsified" as const)
      : "invalid" as const,
    commandResultHash: command ? canonicalHash("command-result", command) : null,
  };
  const value = { ...core, resultHash: canonicalHash("control-probe-result", core) };
  assertControlProbeResult(value);
  return value;
}

function evidenceFromFixture(ref: FixtureBlobRef): EvidenceRef {
  return {
    id: ref.id,
    kind: "diff",
    sha256: ref.sha256,
    storedBytes: ref.storedBytes,
    originalBytes: ref.storedBytes,
    truncated: false,
    redactions: [],
    mediaType: ref.mediaType,
    visibility: "controller",
  };
}

function attemptKey(projectId: string, id: string): string {
  return `${projectId}/${id}`;
}
