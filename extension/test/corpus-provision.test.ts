import { describe, expect, it } from "vitest";
import {
  buildCorpusDockerArgs,
  hasRegisteredTestScript,
  provisionBatchSize,
  selectProvisionCandidates,
  type CorpusDockerInvocation,
} from "../src/corpus/provision";
import type { CandidatePreflight } from "../src/corpus/scan";

describe("R7 corpus provisioning", () => {
  it("bounds a repository run to the remaining global corpus slots", () => {
    expect(provisionBatchSize(0, 2)).toBe(2);
    expect(provisionBatchSize(1, 2)).toBe(1);
    expect(provisionBatchSize(2, 2)).toBe(0);
    expect(() => provisionBatchSize(0, 0)).toThrow("between 1 and 10");
  });

  it("detects a deterministically unavailable registered package script", () => {
    const pkg = JSON.stringify({ scripts: { test: "vitest run" } });
    expect(hasRegisteredTestScript(pkg, ["npm", "run", "test"])).toBe(true);
    expect(hasRegisteredTestScript(pkg, ["npm", "run", "vitest"])).toBe(false);
    expect(hasRegisteredTestScript(pkg, ["corepack", "pnpm", "exec", "vitest", "run"])).toBeNull();
  });

  it("selects only the first ten structurally viable candidates", () => {
    const drafts = Array.from({ length: 15 }, (_, index) => draft(index + 1));
    drafts[0]!.lockfilePresent = false;
    drafts[1]!.dependencyOrLockfileChanged = true;
    drafts[2]!.hasAttributedTest = false;

    expect(selectProvisionCandidates(drafts).map(({ ordinal }) => ordinal)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("uses network only for installation and preserves the exact registered argv", () => {
    const install = invocation("bridge", ["corepack", "pnpm", "install", "--frozen-lockfile"]);
    const test = invocation("none", ["corepack", "pnpm", "test"]);

    const installArgs = buildCorpusDockerArgs(install);
    const testArgs = buildCorpusDockerArgs(test);

    expect(installArgs).toContain("bridge");
    expect(testArgs).toContain("none");
    expect(testArgs).toContain("--read-only");
    expect(testArgs).toContain("no-new-privileges");
    expect(testArgs).toContain("ALL");
    expect(testArgs).toContain("PATH=/work/.pureflow-bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin");
    expect(testArgs.slice(-3)).toEqual([expect.stringMatching(/^node@sha256:/), "pnpm", "test"]);
    expect(testArgs).not.toContain("sh");
    expect(testArgs).not.toContain("bash");
  });

  it("rejects unsafe mount and executable material", () => {
    expect(() => buildCorpusDockerArgs(invocation("none", ["sh", "-c", "npm test"]))).toThrow("executable");
    expect(buildCorpusDockerArgs(invocation("none", ["mkdir", "-p", "/work/.pureflow-bin"])).slice(-3)).toEqual([
      expect.stringMatching(/^node@sha256:/), "-p", "/work/.pureflow-bin",
    ]);
    expect(() => buildCorpusDockerArgs({ ...invocation("none", ["npm", "test"]), workspaceVolume: "bad-volume" })).toThrow("mount");
  });
});

function invocation(network: "bridge" | "none", argv: string[]): CorpusDockerInvocation {
  return {
    containerName: "pureflow-r7-corpus-0123456789abcdef01234567",
    workspaceVolume: "pureflow-r7-corpus-w-0123456789abcdef01234567",
    corepackVolume: "pureflow-r7-corpus-c-0123456789abcdef01234567",
    network,
    argv,
  };
}

function draft(ordinal: number): CandidatePreflight {
  const targetCommit = ordinal.toString(16).padStart(40, "0");
  const facts = {
    schemaVersion: 1 as const,
    repositoryId: "repo-a",
    ordinal,
    baseCommit: (ordinal + 100).toString(16).padStart(40, "0"),
    targetCommit,
    adjacentFirstParent: true,
    licenseApproved: true,
    lockfilePresent: true,
    dependencyOrLockfileChanged: false,
    unsupportedArtifactPresent: false,
    changedLines: 12,
    sourceTreeBytes: 2048,
    supportedTypescriptBoundary: true,
    hasAttributedTest: true,
    changedSourcePaths: ["src/a.ts"],
    changedTestPaths: ["test/a.test.ts"],
  };
  return { ...facts, preflightSha256: "a".repeat(64) };
}
