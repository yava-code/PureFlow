import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  classifyCandidate,
  freezeCorpus,
  type CandidateFacts,
  type RepositoryRegistration,
} from "../src/corpus/freeze";

describe("R7 corpus freeze", () => {
  it("assigns exactly one first-match exclusion code", () => {
    const facts = candidate("repo-a", 1);
    facts.adjacentFirstParent = false;
    facts.targetPassed = false;

    expect(classifyCandidate(facts)).toEqual({
      status: "excluded",
      code: "not-adjacent-first-parent",
    });
  });

  it("freezes 30 patches into the preregistered 12/18 split", () => {
    const repositories = [repository("repo-a", "a"), repository("repo-b", "b"), repository("repo-c", "c")];
    const candidates = repositories.flatMap((repo, repoIndex) =>
      Array.from({ length: 10 }, (_, index) => candidate(repo.repositoryId, index + 1, repoIndex * 10 + index + 1)),
    );

    const manifest = freezeCorpus(repositories, candidates);

    expect(manifest.protocolVersion).toBe("r7-typescript-node-v1");
    expect(manifest.patches).toHaveLength(30);
    expect(manifest.patches.filter(({ cohort }) => cohort === "development")).toHaveLength(12);
    expect(manifest.patches.filter(({ cohort }) => cohort === "held-out")).toHaveLength(18);
    expect(manifest.patches.map(({ splitKey }) => splitKey)).toEqual(
      [...manifest.patches.map(({ splitKey }) => splitKey)].sort(),
    );
    const first = manifest.patches[0]!;
    const repo = repositories.find(({ repositoryId }) => repositoryId === first.repositoryId)!;
    expect(first.splitKey).toBe(createHash("sha256")
      .update(`pureflow/r7-typescript-node-v1\n${repo.url}\n${first.targetCommit}`)
      .digest("hex"));
    expect(manifest.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(manifest)).not.toContain("compiler");
    expect(JSON.stringify(manifest)).not.toContain("judge");
  });

  it("uses the first ten eligible candidates per repository and preserves exclusions", () => {
    const repositories = [repository("repo-a", "a"), repository("repo-b", "b"), repository("repo-c", "c")];
    const candidates = repositories.flatMap((repo, repoIndex) =>
      Array.from({ length: 12 }, (_, index) => {
        const facts = candidate(repo.repositoryId, index + 1, repoIndex * 20 + index + 1);
        if (index === 0) facts.hasAttributedTest = false;
        return facts;
      }),
    );

    const manifest = freezeCorpus(repositories, candidates);

    expect(manifest.patches).toHaveLength(30);
    expect(manifest.exclusions).toHaveLength(3);
    expect(manifest.exclusions.every(({ code }) => code === "missing-attributed-test")).toBe(true);
    for (const repo of repositories) {
      expect(manifest.patches.filter(({ repositoryId }) => repositoryId === repo.repositoryId)).toHaveLength(10);
    }
  });

  it("uses replacement repositories in registration order and stops when 30 exist", () => {
    const repositories = [repository("repo-a", "a"), repository("repo-b", "b"), repository("repo-c", "c"), repository("repo-d", "d")];
    const candidates = repositories.flatMap((repo, repoIndex) =>
      Array.from({ length: 10 }, (_, index) => {
        const facts = candidate(repo.repositoryId, index + 1, repoIndex * 20 + index + 1);
        if (repo.repositoryId === "repo-a") facts.lockfilePresent = false;
        return facts;
      }),
    );

    const manifest = freezeCorpus(repositories, candidates);

    expect(manifest.patches.some(({ repositoryId }) => repositoryId === "repo-a")).toBe(false);
    expect(manifest.patches.filter(({ repositoryId }) => repositoryId === "repo-d")).toHaveLength(10);
    expect(manifest.exclusions).toHaveLength(10);
  });

  it("refuses an incomplete, over-scanned, duplicate, or outcome-tainted corpus", () => {
    const repositories = [repository("repo-a", "a"), repository("repo-b", "b"), repository("repo-c", "c")];
    const incomplete = repositories.flatMap((repo, repoIndex) =>
      Array.from({ length: repo.repositoryId === "repo-c" ? 9 : 10 }, (_, index) => candidate(repo.repositoryId, index + 1, repoIndex * 20 + index + 1)),
    );
    expect(() => freezeCorpus(repositories, incomplete)).toThrow("exactly 30");

    const overScanned = candidate("repo-a", 61);
    expect(() => freezeCorpus(repositories, [...incomplete, overScanned])).toThrow("ordinal");

    const complete = repositories.flatMap((repo, repoIndex) =>
      Array.from({ length: 10 }, (_, index) => candidate(repo.repositoryId, index + 1, repoIndex * 20 + index + 1)),
    );
    expect(() => freezeCorpus(repositories, [...complete, structuredClone(complete[0]!)])).toThrow("Duplicate candidate");

    const tainted = structuredClone(complete) as Array<CandidateFacts & { compilerSucceeded?: boolean }>;
    tainted[0]!.compilerSucceeded = true;
    expect(() => freezeCorpus(repositories, tainted)).toThrow("unknown or missing fields");
  });
});

function repository(repositoryId: string, suffix: string): RepositoryRegistration {
  return {
    schemaVersion: 1,
    repositoryId,
    url: `https://github.com/example/project-${suffix}.git`,
    licenseSpdx: "MIT",
    pinnedTip: suffix.repeat(40),
    nodeVersion: "22.18.0",
    packageManager: "npm",
    packageManagerVersion: "10.9.3",
    installArgv: ["npm", "ci", "--ignore-scripts"],
    testArgv: ["npm", "test", "--", "--runInBand"],
    candidateHistoryArgv: ["git", "rev-list", "--first-parent", "--max-count=500", suffix.repeat(40)],
  };
}

function candidate(repositoryId: string, ordinal: number, seed = ordinal): CandidateFacts {
  const targetCommit = seed.toString(16).padStart(40, "0");
  const baseCommit = (seed + 10_000).toString(16).padStart(40, "0");
  return {
    schemaVersion: 1,
    repositoryId,
    ordinal,
    baseCommit,
    targetCommit,
    adjacentFirstParent: true,
    licenseApproved: true,
    lockfilePresent: true,
    dependencyOrLockfileChanged: false,
    unsupportedArtifactPresent: false,
    changedLines: 42,
    sanitizedBytes: 1024,
    supportedTypescriptBoundary: true,
    hasAttributedTest: true,
    requiresProductionCapability: false,
    executionNeedsNetwork: false,
    basePassed: true,
    targetPassed: true,
    deterministicReplayCount: 3,
    evidenceSha256: seed.toString(16).padStart(64, "0"),
  };
}
