import { describe, expect, it } from "vitest";
import { compileRewindPlan, type RewindCompilerInput } from "../src/audit/rewind-plan";

describe("R7 rewind compiler plan", () => {
  it("compiles a deterministic hidden-repair plan and strict participant projection", () => {
    const first = compileRewindPlan(input());
    const second = compileRewindPlan(input());

    expect(first).toEqual(second);
    expect(first.status).toBe("compiled");
    if (first.status !== "compiled") return;
    expect(first.internal.internalPlanSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(first.internal.participantProjectionSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(first.participant).toMatchObject({
      repositoryId: "repo-a",
      writablePaths: ["src/cache.ts"],
      attributedTestPaths: ["test/cache.test.ts"],
      attentionBudgetSeconds: 600,
    });
    const publicJson = JSON.stringify(first.participant);
    expect(publicJson).not.toContain("targetCommit");
    expect(publicJson).not.toContain("npm");
    expect(publicJson).not.toContain("b".repeat(40));
    expect(publicJson).not.toContain("repair");
  });

  it("abstains when whole-file rewind cannot recover every source from the base", () => {
    const value = input();
    value.sources[0]!.baseBlobSha1 = null;

    expect(compileRewindPlan(value)).toEqual({
      status: "unsupported-source-rewind",
      unsupportedPaths: ["src/cache.ts"],
    });
  });

  it("abstains instead of inventing a semantic boundary", () => {
    const value = input();
    value.semantic = null;

    expect(compileRewindPlan(value)).toEqual({ status: "unsupported-semantic-boundary" });
  });
});

function input(): RewindCompilerInput {
  return {
    corpusManifestSha256: "a".repeat(64),
    patchEvidenceSha256: "1".repeat(64),
    repositoryId: "repo-a",
    ordinal: 3,
    baseCommit: "b".repeat(40),
    targetCommit: "c".repeat(40),
    nodeVersion: "22.17.0",
    packageManager: "npm",
    packageManagerVersion: "10.9.2",
    installArgv: ["npm", "ci", "--ignore-scripts"],
    testArgv: ["npm", "test"],
    sources: [{ path: "src/cache.ts", baseBlobSha1: "d".repeat(40), targetBlobSha1: "e".repeat(40) }],
    attributedTestPaths: ["test/cache.test.ts"],
    semantic: {
      path: "src/cache.ts",
      symbol: "cacheKey",
      kind: "function",
      changedLineSha256: ["f".repeat(64)],
    },
  };
}
