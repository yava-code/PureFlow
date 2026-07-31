import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertToken } from "../agent/types";
import { assertInternalExperience, type InternalExperience } from "../experience/types";
import { canonicalHash, canonicalJson, compareUtf8, rawSha256, treeHash, type TreeFile } from "../rnd/canonical";
import { BuiltinFixtureCatalog } from "../twin/catalog";
import {
  FixtureCommandRegistry,
  type CommandEvidenceStore,
  TrustedFixtureProcessRunner,
} from "../twin/commands";
import { candidateDiffHash, type CandidateChange, type CandidateDiff } from "../twin/fixture-contract";
import { TwinManager } from "../twin/manager";
import {
  FixtureSnapshotStore,
  readCandidateTree,
  verifyParticipantGitBoundary,
} from "../twin/snapshot";
import type { CommandResult, SanitizedSnapshot, TrustedFixtureRecord } from "../twin/types";
import type { JudgeAttempt, JudgeResult } from "./types";

const runFile = promisify(execFile);

export class FixturePhaseAJudge {
  constructor(
    private readonly catalog: BuiltinFixtureCatalog,
    private readonly snapshots: FixtureSnapshotStore,
    private readonly twins: TwinManager,
    private readonly registry: FixtureCommandRegistry,
    private readonly runner: TrustedFixtureProcessRunner,
    private readonly evidence: CommandEvidenceStore,
  ) {}

  async evaluate(attempt: JudgeAttempt): Promise<JudgeResult> {
    validateAttempt(attempt);
    const { experience } = attempt;
    const snapshot = await this.snapshots.get(experience.projectId, experience.snapshotId);
    if (!snapshot || snapshot.treeHash !== experience.snapshotTreeHash || snapshot.state !== "mutated") {
      return this.integrity(experience, attempt, "snapshot-integrity");
    }
    if (experience.commandRegistryHash !== experience.judge.commandRegistryHash) {
      return this.integrity(experience, attempt, "registry-binding");
    }
    const registry = await this.registry.open(experience.projectId, experience.commandRegistryHash);
    if (!registry) return this.integrity(experience, attempt, "registry-integrity");

    const record = await this.catalog.openForSnapshot(experience.sourceTargetRevision, snapshot.mutationId);
    if (!record || !matchesHiddenAnswer(experience, record)) {
      return this.integrity(experience, attempt, "hidden-answer-integrity");
    }
    const root = this.twins.resolveReadyRoot(experience.projectId, attempt.twinHandle);
    try {
      await verifyParticipantGitBoundary(root, snapshot.participantCommit);
    } catch {
      return this.integrity(experience, attempt, "participant-git-integrity");
    }
    const candidate = await readCandidateTree(root);
    const diff = createCandidateDiff(snapshot, candidate);
    const diffHash = diff.changes.length === 0 ? undefined : candidateDiffHash(diff);
    const integrityFailure = verifyCandidateBoundary(experience, snapshot, candidate, diff.changes);
    if (integrityFailure) return this.integrity(experience, attempt, integrityFailure, diffHash);

    if (diffHash === undefined || diffHash !== record.manifest.knownRepair.candidateDiffHash) {
      const evidence = await this.judgeEvidence(experience.projectId, "candidate-diff", {
        expected: record.manifest.knownRepair.candidateDiffHash,
        actual: diffHash ?? null,
        executed: false,
      });
      return result({
        experienceId: experience.id,
        outcome: "failed",
        checks: [{ id: "candidate-diff", status: "failed", evidence }],
        hintsUsed: attempt.hintsUsed,
        elapsedMs: attempt.elapsedMs,
        ...(diffHash === undefined ? {} : { candidateDiffHash: diffHash }),
      });
    }

    return this.evaluateKnownRepair(attempt, snapshot, record, registry.commands.map((command) => command.id), diffHash);
  }

  async close(
    experience: InternalExperience,
    outcome: "abandoned" | "revealed",
    hintsUsed: number,
    elapsedMs: number,
  ): Promise<JudgeResult> {
    validateCounters(hintsUsed, elapsedMs);
    assertInternalExperience(experience);
    return result({
      experienceId: experience.id,
      outcome,
      checks: [],
      hintsUsed,
      elapsedMs,
    });
  }

  private async evaluateKnownRepair(
    attempt: JudgeAttempt,
    snapshot: SanitizedSnapshot,
    record: TrustedFixtureRecord,
    registryCommandIds: string[],
    diffHash: string,
  ): Promise<JudgeResult> {
    const { experience } = attempt;
    const twin = await this.twins.prepare(experience.projectId, snapshot.id);
    const root = this.twins.resolveReadyRoot(experience.projectId, twin.handle);
    const checks: JudgeResult["checks"] = [];

    try {
      await applyRepair(root, record.blobs.repair.localHandle);
      const target = record.manifest.states.find((state) => state.id === "target")!;
      if (treeHash(await readCandidateTree(root)) !== target.treeHash) {
        return this.integrity(experience, attempt, "known-repair-tree", diffHash);
      }

      for (const check of experience.judge.checks) {
        if (check.kind !== "approved-command") {
          return this.integrity(experience, attempt, "unsupported-phase-a-check", diffHash);
        }
        if (!registryCommandIds.includes(check.commandId)) {
          return this.integrity(experience, attempt, "registry-command-integrity", diffHash);
        }
        const command = await this.runner.run({
          executionId: randomUUID().replaceAll("-", ""),
          projectId: experience.projectId,
          fixtureId: record.manifest.fixtureId,
          manifestHash: record.manifestHash,
          stateId: "target",
          commandId: check.commandId,
          twinHandle: twin.handle,
        });
        const passed = command.exitCode === check.expectedExitCode && !command.timedOut && !command.cancelled;
        checks.push({
          id: check.id,
          status: passed ? "passed" : "failed",
          evidence: await this.commandEvidence(experience.projectId, check.id, command),
        });
      }
    } finally {
      await this.twins.cleanup(experience.projectId, twin.handle);
    }

    const passed = checks.filter((check) => check.status === "passed").length;
    return result({
      experienceId: experience.id,
      outcome: passed === checks.length ? "passed" : passed > 0 ? "partial" : "failed",
      checks,
      hintsUsed: attempt.hintsUsed,
      elapsedMs: attempt.elapsedMs,
      candidateDiffHash: diffHash,
    });
  }

  private async integrity(
    experience: InternalExperience,
    attempt: Pick<JudgeAttempt, "hintsUsed" | "elapsedMs">,
    reason: string,
    diffHash?: string,
  ): Promise<JudgeResult> {
    const evidence = await this.judgeEvidence(experience.projectId, "integrity", { reason, executed: false });
    return result({
      experienceId: experience.id,
      outcome: "failed-integrity",
      checks: [{ id: "integrity", status: "failed", evidence }],
      hintsUsed: attempt.hintsUsed,
      elapsedMs: attempt.elapsedMs,
      ...(diffHash === undefined ? {} : { candidateDiffHash: diffHash }),
    });
  }

  private async commandEvidence(projectId: string, checkId: string, command: CommandResult) {
    return this.judgeEvidence(projectId, checkId, {
      exitCode: command.exitCode,
      timedOut: command.timedOut,
      cancelled: command.cancelled,
    });
  }

  private async judgeEvidence(projectId: string, checkId: string, value: object) {
    const content = Buffer.from(canonicalJson(value), "utf8");
    const id = `judge_${rawSha256(`${projectId}\0${checkId}\0${content.toString("utf8")}`)}`;
    return this.evidence.putNamed(projectId, id, content, content.byteLength);
  }
}

function createCandidateDiff(snapshot: SanitizedSnapshot, candidate: TreeFile[]): CandidateDiff {
  const before = new Map(snapshot.files.map((file) => [file.path, file]));
  const after = new Map(candidate.map((file) => [file.path, file]));
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort(compareUtf8);
  const changes: CandidateChange[] = [];
  for (const path of paths) {
    const left = before.get(path);
    const right = after.get(path);
    if (left?.sha256 === right?.sha256 && left?.mode === right?.mode) continue;
    changes.push({
      path,
      beforeSha256: left?.sha256 ?? null,
      afterSha256: right?.sha256 ?? null,
      beforeMode: left?.mode ?? null,
      afterMode: right?.mode ?? null,
    });
  }
  return {
    schemaVersion: 1,
    baseTreeHash: snapshot.treeHash,
    resultTreeHash: treeHash(candidate),
    changes,
  };
}

function verifyCandidateBoundary(
  experience: InternalExperience,
  snapshot: SanitizedSnapshot,
  candidate: TreeFile[],
  changes: CandidateChange[],
): string | undefined {
  const editable = new Set(experience.judge.editablePaths);
  if (changes.some((change) => !editable.has(change.path))) return "change-outside-editable-paths";
  const files = new Map(candidate.map((file) => [file.path, file]));
  for (const protectedFile of experience.judge.protectedFiles) {
    if (files.get(protectedFile.path)?.sha256 !== protectedFile.sha256) return "protected-file-changed";
  }
  const original = new Set(snapshot.files.map((file) => file.path));
  if (candidate.some((file) => !original.has(file.path) && !editable.has(file.path))) return "unexpected-file";
  return undefined;
}

function matchesHiddenAnswer(experience: InternalExperience, record: TrustedFixtureRecord): boolean {
  const ref = record.manifest.knownRepair.changeRef;
  return experience.hiddenAnswer.id === ref.id &&
    experience.hiddenAnswer.sha256 === ref.sha256 &&
    experience.hiddenAnswer.storedBytes === ref.storedBytes &&
    experience.hiddenAnswer.originalBytes === ref.storedBytes &&
    experience.hiddenAnswer.truncated === false &&
    experience.hiddenAnswer.redactions.length === 0 &&
    experience.hiddenAnswer.mediaType === ref.mediaType &&
    experience.hiddenAnswer.visibility === "controller";
}

async function applyRepair(root: string, patch: string): Promise<void> {
  await runFile("git", ["apply", "--whitespace=nowarn", patch], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000,
    env: {
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
      PATH: process.env.PATH ?? "",
      SYSTEMROOT: process.env.SYSTEMROOT ?? "",
    },
  });
}

function result(value: Omit<JudgeResult, "schemaVersion" | "resultHash">): JudgeResult {
  const core = { schemaVersion: 1 as const, ...value };
  return { ...core, resultHash: canonicalHash("judge-result", core) };
}

function validateAttempt(attempt: JudgeAttempt): void {
  assertInternalExperience(attempt.experience);
  assertToken(attempt.twinHandle, "twinHandle");
  validateCounters(attempt.hintsUsed, attempt.elapsedMs);
}

function validateCounters(hintsUsed: number, elapsedMs: number): void {
  if (!Number.isSafeInteger(hintsUsed) || hintsUsed < 0 || hintsUsed > 100) throw new Error("hintsUsed is invalid");
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0 || elapsedMs > 86_400_000) throw new Error("elapsedMs is invalid");
}
