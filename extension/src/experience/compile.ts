import { randomUUID } from "node:crypto";
import { assertBoundedText, assertToken } from "../agent/types";
import type { ExtractionResult } from "../change/evidence";
import { canonicalJson, compareUtf8 } from "../rnd/canonical";
import { assertEvidenceRef, type EvidenceRef } from "../recorder/events";
import { BuiltinFixtureCatalog } from "../twin/catalog";
import { FixtureCommandRegistry } from "../twin/commands";
import { FixtureSnapshotStore } from "../twin/snapshot";
import type { FixtureBlobRef } from "../twin/fixture-contract";
import {
  assertInternalExperience,
  assertParticipantExperience,
  type CompiledExperience,
  type InternalExperience,
  type ParticipantExperience,
} from "./types";
import { selectRecoverySeam } from "./select";

export interface CompileExperienceInput {
  extraction: ExtractionResult;
  fixtureId: string;
  manifestHash: string;
}

export class FixtureExperienceCompiler {
  constructor(
    private readonly catalog: BuiltinFixtureCatalog,
    private readonly snapshots: FixtureSnapshotStore,
    private readonly registry: FixtureCommandRegistry,
    private readonly options: { id?: () => string } = {},
  ) {}

  async compile(input: CompileExperienceInput): Promise<CompiledExperience> {
    const record = await this.catalog.open(input.fixtureId, input.manifestHash);
    if (!record) throw new Error("Experience fixture is not in the trusted catalog");
    const selected = selectRecoverySeam(input.extraction);
    const seam = selected.seam;
    if (
      seam.projectId !== input.extraction.projectId ||
      seam.sourceRunId !== input.extraction.sourceRunId ||
      seam.baseRevision !== input.extraction.baseRevision ||
      seam.targetRevision !== input.extraction.targetRevision ||
      seam.baseRevision !== record.manifest.baseRevision ||
      seam.targetRevision !== record.manifest.targetRevision
    ) {
      throw new Error("Selected seam identity does not match the trusted fixture");
    }
    if (!record.manifest.changedSymbols.some(({ path, symbol }) => path === seam.unit.path && symbol === seam.unit.symbol)) {
      throw new Error("Selected seam is not declared by the trusted fixture");
    }
    if (seam.linkedChecks.some((id) => !record.manifest.targetChecks.includes(id))) {
      throw new Error("Selected seam references a check outside the trusted fixture target");
    }

    const mutation = evidenceFromFixture(record.manifest.mutation.changeRef, "controller");
    const target = record.manifest.states.find((state) => state.id === "target")!;
    const snapshot = await this.snapshots.create({
      projectId: seam.projectId,
      sourceRevision: seam.targetRevision,
      mutationId: record.manifest.mutation.id,
      mutation,
      allowedFiles: target.files.map((file) => file.path),
    });
    const commandIds = seam.linkedChecks.map((checkId) => {
      const check = record.manifest.checks.find((item) => item.id === checkId);
      if (!check) throw new Error(`Trusted fixture check is missing: ${checkId}`);
      return check.commandId;
    }).sort(compareUtf8);
    const registry = await this.registry.freeze(seam.projectId, commandIds);
    const editable = [...record.manifest.mutation.editablePaths];
    const id = (this.options.id ?? (() => randomUUID().replaceAll("-", "")))();
    assertToken(id, "experienceId");
    const symbols = [`${seam.unit.path}#${seam.unit.symbol}`];
    const concepts = ["tested-boundary-recovery"];
    const task = `Recover the declared behavior at ${seam.unit.symbol}. Make ${seam.linkedChecks.join(", ")} pass without changing protected files.`;
    assertBoundedText(task, 4096, "experience task");
    const hiddenAnswer = evidenceFromFixture(record.manifest.knownRepair.changeRef, "controller");
    const internal: InternalExperience = {
      schemaVersion: 1,
      id,
      sourceRunId: seam.sourceRunId,
      projectId: seam.projectId,
      sourceBaseRevision: seam.baseRevision,
      sourceTargetRevision: seam.targetRevision,
      snapshotId: snapshot.id,
      snapshotTreeHash: snapshot.treeHash,
      commandRegistryHash: registry.sha256,
      scope: { symbols, tests: [...seam.linkedChecks], concepts },
      kind: "recover",
      task,
      setup: [
        { kind: "materialize-snapshot", snapshotId: snapshot.id },
        ...commandIds.map((commandId) => ({ kind: "run-approved-command" as const, commandId })),
      ],
      judge: {
        timeoutMs: 10_000,
        commandRegistryHash: registry.sha256,
        editablePaths: editable,
        protectedFiles: snapshot.files
          .filter((file) => !editable.includes(file.path))
          .map(({ path, sha256 }) => ({ path, sha256 })),
        checks: seam.linkedChecks.map((checkId) => ({
          id: checkId,
          kind: "approved-command" as const,
          commandId: record.manifest.checks.find((item) => item.id === checkId)!.commandId,
          expectedExitCode: 0,
        })),
      },
      hiddenAnswer,
      budgetMinutes: seam.factors.estimatedAttentionMinutes,
    };
    assertInternalExperience(internal);
    const participant = projectParticipant(internal);
    return {
      internal,
      participant,
      snapshot,
      registry,
      selectionReasons: [...selected.reasons, "fixture-supported"].sort(compareUtf8),
    };
  }
}

export function serializeParticipantExperience(value: ParticipantExperience): string {
  assertParticipantExperience(value);
  return canonicalJson(value);
}

function projectParticipant(value: InternalExperience): ParticipantExperience {
  return {
    schemaVersion: 1,
    id: value.id,
    snapshotId: value.snapshotId,
    snapshotTreeHash: value.snapshotTreeHash,
    scope: { symbols: [...value.scope.symbols], concepts: [...value.scope.concepts] },
    kind: "recover",
    task: value.task,
    visibleChecks: [...value.scope.tests],
    budgetMinutes: value.budgetMinutes,
  };
}

function evidenceFromFixture(ref: FixtureBlobRef, visibility: EvidenceRef["visibility"]): EvidenceRef {
  const value: EvidenceRef = {
    id: ref.id,
    kind: "diff",
    sha256: ref.sha256,
    storedBytes: ref.storedBytes,
    originalBytes: ref.storedBytes,
    truncated: false,
    redactions: [],
    mediaType: ref.mediaType,
    visibility,
  };
  assertEvidenceRef(value, "diff");
  return value;
}
