import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { prepareRewindPlan } from "../src/audit/rewind-prepare";
import type { RepositoryRegistration } from "../src/corpus/freeze";
import type { CandidatePreflight } from "../src/corpus/scan";

const run = promisify(execFile);
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("R7 rewind plan preparation", () => {
  it("binds Git blobs and the deterministic R2 semantic seam", async () => {
    const root = await repositoryFixture();
    const targetCommit = await git(root, ["rev-parse", "HEAD"]);
    const baseCommit = await git(root, ["rev-parse", "HEAD^"]);

    const result = await prepareRewindPlan(root, "a".repeat(64), patch(baseCommit, targetCommit), registration(targetCommit), preflight(baseCommit, targetCommit));

    expect(result.status).toBe("compiled");
    if (result.status !== "compiled") return;
    expect(result.internal.sources).toEqual([{
      path: "src/cache.ts",
      baseBlobSha1: expect.stringMatching(/^[0-9a-f]{40}$/),
      targetBlobSha1: expect.stringMatching(/^[0-9a-f]{40}$/),
    }]);
    expect(result.internal.semantic).toMatchObject({ path: "src/cache.ts", symbol: "cacheKey", kind: "function" });
  }, 30_000);
});

async function repositoryFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r7-rewind-"));
  roots.push(root);
  await git(root, ["init"]);
  await git(root, ["config", "user.name", "PureFlow Test"]);
  await git(root, ["config", "user.email", "test@pureflow.local"]);
  await mkdir(join(root, "src"));
  await mkdir(join(root, "test"));
  await writeFile(join(root, "package-lock.json"), "{}\n");
  await writeFile(join(root, "src", "cache.ts"), "export function cacheKey(id: string) {\n  return id;\n}\n");
  await writeFile(join(root, "test", "cache.test.ts"), "import { cacheKey } from '../src/cache';\nvoid cacheKey('a');\n");
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "base"]);
  await writeFile(join(root, "src", "cache.ts"), "export function cacheKey(tenant: string, id: string) {\n  return `${tenant}:${id}`;\n}\n");
  await writeFile(join(root, "test", "cache.test.ts"), "import { cacheKey } from '../src/cache';\nvoid cacheKey('t', 'a');\n");
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "scope cache key"]);
  return root;
}

function patch(baseCommit: string, targetCommit: string) {
  return {
    repositoryId: "repo-a",
    ordinal: 1,
    baseCommit,
    targetCommit,
    evidenceSha256: "1".repeat(64),
    cohort: "development" as const,
  };
}

function registration(pinnedTip: string): RepositoryRegistration {
  return {
    schemaVersion: 1,
    repositoryId: "repo-a",
    url: "https://github.com/example/repo-a.git",
    licenseSpdx: "MIT",
    pinnedTip,
    nodeVersion: "22.17.0",
    packageManager: "npm",
    packageManagerVersion: "10.9.2",
    installArgv: ["npm", "ci", "--ignore-scripts"],
    testArgv: ["npm", "test"],
    candidateHistoryArgv: ["git", "rev-list", "--first-parent", pinnedTip],
  };
}

function preflight(baseCommit: string, targetCommit: string): CandidatePreflight {
  return {
    schemaVersion: 1,
    repositoryId: "repo-a",
    ordinal: 1,
    baseCommit,
    targetCommit,
    adjacentFirstParent: true,
    licenseApproved: true,
    lockfilePresent: true,
    dependencyOrLockfileChanged: false,
    unsupportedArtifactPresent: false,
    changedLines: 6,
    sourceTreeBytes: 1024,
    supportedTypescriptBoundary: true,
    hasAttributedTest: true,
    changedSourcePaths: ["src/cache.ts"],
    changedTestPaths: ["test/cache.test.ts"],
    preflightSha256: "2".repeat(64),
  };
}

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  return stdout.trim();
}
