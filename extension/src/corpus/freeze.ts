import { canonicalJson, compareUtf8, rawSha256 } from "../rnd/canonical";

export const r7ProtocolVersion = "r7-typescript-node-v1" as const;

export type ExclusionCode =
  | "not-adjacent-first-parent"
  | "license-not-approved"
  | "missing-lockfile"
  | "dependency-or-lockfile-change"
  | "unsupported-artifact"
  | "diff-too-large"
  | "snapshot-too-large"
  | "unsupported-typescript-boundary"
  | "missing-attributed-test"
  | "requires-production-capability"
  | "network-required-at-execution"
  | "base-provision-or-test-failed"
  | "target-provision-or-test-failed"
  | "replay-not-deterministic";

export interface RepositoryRegistration {
  schemaVersion: 1;
  repositoryId: string;
  url: string;
  licenseSpdx: string;
  pinnedTip: string;
  nodeVersion: string;
  packageManager: "npm" | "pnpm" | "yarn";
  packageManagerVersion: string;
  installArgv: string[];
  testArgv: string[];
  candidateHistoryArgv: string[];
}

export interface CandidateFacts {
  schemaVersion: 1;
  repositoryId: string;
  ordinal: number;
  baseCommit: string;
  targetCommit: string;
  adjacentFirstParent: boolean;
  licenseApproved: boolean;
  lockfilePresent: boolean;
  dependencyOrLockfileChanged: boolean;
  unsupportedArtifactPresent: boolean;
  changedLines: number;
  sanitizedBytes: number;
  supportedTypescriptBoundary: boolean;
  hasAttributedTest: boolean;
  requiresProductionCapability: boolean;
  executionNeedsNetwork: boolean;
  basePassed: boolean;
  targetPassed: boolean;
  deterministicReplayCount: number;
  evidenceSha256: string;
}

export type CandidateClassification =
  | { status: "eligible" }
  | { status: "excluded"; code: ExclusionCode };

interface FrozenPatch {
  repositoryId: string;
  ordinal: number;
  baseCommit: string;
  targetCommit: string;
  evidenceSha256: string;
  splitKey: string;
  cohort: "development" | "held-out";
}

interface FrozenExclusion {
  repositoryId: string;
  ordinal: number;
  baseCommit: string;
  targetCommit: string;
  evidenceSha256: string;
  code: ExclusionCode;
}

interface CorpusManifestCore {
  schemaVersion: 1;
  protocolVersion: typeof r7ProtocolVersion;
  repositories: RepositoryRegistration[];
  patches: FrozenPatch[];
  exclusions: FrozenExclusion[];
}

export interface CorpusManifest extends CorpusManifestCore {
  manifestSha256: string;
}

const repositoryKeys = [
  "schemaVersion",
  "repositoryId",
  "url",
  "licenseSpdx",
  "pinnedTip",
  "nodeVersion",
  "packageManager",
  "packageManagerVersion",
  "installArgv",
  "testArgv",
  "candidateHistoryArgv",
] as const;

const candidateKeys = [
  "schemaVersion",
  "repositoryId",
  "ordinal",
  "baseCommit",
  "targetCommit",
  "adjacentFirstParent",
  "licenseApproved",
  "lockfilePresent",
  "dependencyOrLockfileChanged",
  "unsupportedArtifactPresent",
  "changedLines",
  "sanitizedBytes",
  "supportedTypescriptBoundary",
  "hasAttributedTest",
  "requiresProductionCapability",
  "executionNeedsNetwork",
  "basePassed",
  "targetPassed",
  "deterministicReplayCount",
  "evidenceSha256",
] as const;

export function classifyCandidate(candidate: CandidateFacts): CandidateClassification {
  validateCandidate(candidate);
  if (!candidate.adjacentFirstParent) return excluded("not-adjacent-first-parent");
  if (!candidate.licenseApproved) return excluded("license-not-approved");
  if (!candidate.lockfilePresent) return excluded("missing-lockfile");
  if (candidate.dependencyOrLockfileChanged) return excluded("dependency-or-lockfile-change");
  if (candidate.unsupportedArtifactPresent) return excluded("unsupported-artifact");
  if (candidate.changedLines > 500) return excluded("diff-too-large");
  if (candidate.sanitizedBytes > 25 * 1024 * 1024) return excluded("snapshot-too-large");
  if (!candidate.supportedTypescriptBoundary) return excluded("unsupported-typescript-boundary");
  if (!candidate.hasAttributedTest) return excluded("missing-attributed-test");
  if (candidate.requiresProductionCapability) return excluded("requires-production-capability");
  if (candidate.executionNeedsNetwork) return excluded("network-required-at-execution");
  if (!candidate.basePassed) return excluded("base-provision-or-test-failed");
  if (!candidate.targetPassed) return excluded("target-provision-or-test-failed");
  if (candidate.deterministicReplayCount !== 3) return excluded("replay-not-deterministic");
  return { status: "eligible" };
}

export function freezeCorpus(
  registrations: readonly RepositoryRegistration[],
  candidates: readonly CandidateFacts[],
): CorpusManifest {
  if (registrations.length < 3) throw new Error("R7 requires at least three registered repositories");
  const repositories = registrations.map(copyRepository);
  repositories.sort((left, right) => compareUtf8(left.repositoryId, right.repositoryId));
  const repositoryById = new Map<string, RepositoryRegistration>();
  for (const repository of repositories) {
    validateRepositoryRegistration(repository);
    if (repositoryById.has(repository.repositoryId)) throw new Error(`Duplicate repository: ${repository.repositoryId}`);
    repositoryById.set(repository.repositoryId, repository);
  }

  const seen = new Set<string>();
  const grouped = new Map<string, CandidateFacts[]>();
  for (const candidate of candidates) {
    validateCandidate(candidate);
    if (!repositoryById.has(candidate.repositoryId)) throw new Error(`Unregistered repository: ${candidate.repositoryId}`);
    const identity = `${candidate.repositoryId}\0${candidate.targetCommit}`;
    if (seen.has(identity)) throw new Error(`Duplicate candidate: ${candidate.repositoryId}/${candidate.targetCommit}`);
    seen.add(identity);
    const group = grouped.get(candidate.repositoryId) ?? [];
    group.push(structuredClone(candidate));
    grouped.set(candidate.repositoryId, group);
  }

  const selected: Array<Omit<FrozenPatch, "splitKey" | "cohort">> = [];
  const exclusions: FrozenExclusion[] = [];
  for (const repository of repositories) {
    const group = grouped.get(repository.repositoryId) ?? [];
    group.sort((left, right) => left.ordinal - right.ordinal);
    let accepted = 0;
    for (const candidate of group) {
      if (accepted === 10) break;
      const result = classifyCandidate(candidate);
      if (result.status === "excluded") {
        exclusions.push({
          repositoryId: candidate.repositoryId,
          ordinal: candidate.ordinal,
          baseCommit: candidate.baseCommit,
          targetCommit: candidate.targetCommit,
          evidenceSha256: candidate.evidenceSha256,
          code: result.code,
        });
        continue;
      }
      selected.push({
        repositoryId: candidate.repositoryId,
        ordinal: candidate.ordinal,
        baseCommit: candidate.baseCommit,
        targetCommit: candidate.targetCommit,
        evidenceSha256: candidate.evidenceSha256,
      });
      accepted += 1;
    }
  }

  if (selected.length !== 30) throw new Error(`R7 corpus must contain exactly 30 eligible patches; found ${selected.length}`);
  if (new Set(selected.map(({ repositoryId }) => repositoryId)).size < 3) {
    throw new Error("R7 corpus must contain patches from at least three repositories");
  }

  const patches: FrozenPatch[] = selected.map((candidate) => {
    const repository = repositoryById.get(candidate.repositoryId)!;
    return {
      ...candidate,
      splitKey: rawSha256(`pureflow/${r7ProtocolVersion}\n${repository.url}\n${candidate.targetCommit}`),
      cohort: "held-out",
    };
  });
  patches.sort((left, right) => compareUtf8(left.splitKey, right.splitKey));
  patches.forEach((patch, index) => {
    patch.cohort = index < 12 ? "development" : "held-out";
  });
  exclusions.sort((left, right) =>
    compareUtf8(left.repositoryId, right.repositoryId) || left.ordinal - right.ordinal,
  );

  const core: CorpusManifestCore = {
    schemaVersion: 1,
    protocolVersion: r7ProtocolVersion,
    repositories,
    patches,
    exclusions,
  };
  return {
    ...core,
    manifestSha256: rawSha256(`pureflow/r7-corpus-manifest-v1\n${canonicalJson(core)}`),
  };
}

function excluded(code: ExclusionCode): CandidateClassification {
  return { status: "excluded", code };
}

function copyRepository(repository: RepositoryRegistration): RepositoryRegistration {
  assertExactKeys(repository, repositoryKeys, "repository registration");
  return {
    ...structuredClone(repository),
    installArgv: [...repository.installArgv],
    testArgv: [...repository.testArgv],
    candidateHistoryArgv: [...repository.candidateHistoryArgv],
  };
}

export function validateRepositoryRegistration(repository: RepositoryRegistration): void {
  assertExactKeys(repository, repositoryKeys, "repository registration");
  if (repository.schemaVersion !== 1) throw new Error("Unsupported repository registration schema");
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(repository.repositoryId)) throw new Error("Invalid repositoryId");
  const url = new URL(repository.url);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Repository URL must be credential-free HTTPS");
  assertOid(repository.pinnedTip, "pinnedTip");
  if (!repository.licenseSpdx || !repository.nodeVersion || !repository.packageManagerVersion) throw new Error("Repository metadata is incomplete");
  assertArgv(repository.installArgv, "installArgv");
  assertArgv(repository.testArgv, "testArgv");
  assertArgv(repository.candidateHistoryArgv, "candidateHistoryArgv");
  if (repository.candidateHistoryArgv[0] !== "git" || !repository.candidateHistoryArgv.includes("--first-parent")) {
    throw new Error("Candidate history command must be a first-parent Git walk");
  }
}

function validateCandidate(candidate: CandidateFacts): void {
  assertExactKeys(candidate, candidateKeys, "candidate facts");
  if (candidate.schemaVersion !== 1) throw new Error("Unsupported candidate schema");
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(candidate.repositoryId)) throw new Error("Invalid repositoryId");
  if (!Number.isSafeInteger(candidate.ordinal) || candidate.ordinal < 1 || candidate.ordinal > 60) {
    throw new Error("Candidate ordinal must be between 1 and 60");
  }
  assertOid(candidate.baseCommit, "baseCommit");
  assertOid(candidate.targetCommit, "targetCommit");
  if (candidate.baseCommit === candidate.targetCommit) throw new Error("Candidate revisions must differ");
  if (!Number.isSafeInteger(candidate.changedLines) || candidate.changedLines < 0) throw new Error("Invalid changedLines");
  if (!Number.isSafeInteger(candidate.sanitizedBytes) || candidate.sanitizedBytes < 0) throw new Error("Invalid sanitizedBytes");
  if (!Number.isSafeInteger(candidate.deterministicReplayCount) || candidate.deterministicReplayCount < 0) {
    throw new Error("Invalid deterministicReplayCount");
  }
  if (!/^[0-9a-f]{64}$/.test(candidate.evidenceSha256)) throw new Error("Invalid evidenceSha256");
}

function assertArgv(argv: readonly string[], label: string): void {
  if (!Array.isArray(argv) || argv.length === 0 || argv.some((part) => typeof part !== "string" || !part || /[\0\r\n]/.test(part))) {
    throw new Error(`${label} must be a non-empty argument array`);
  }
}

function assertOid(value: string, label: string): void {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`${label} must be a full lowercase Git SHA-1`);
}

function assertExactKeys(value: object, allowed: readonly string[], label: string): void {
  const expected = new Set(allowed);
  const actual = Reflect.ownKeys(value);
  if (actual.length !== expected.size || actual.some((key) => typeof key !== "string" || !expected.has(key))) {
    throw new Error(`${label} contains unknown or missing fields`);
  }
}
