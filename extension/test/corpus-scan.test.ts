import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  completeCandidate,
  isCoarseCandidate,
  scanRepository,
  type ProvisionEvidence,
} from "../src/corpus/scan";
import type { RepositoryRegistration } from "../src/corpus/freeze";

const run = promisify(execFile);
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("R7 corpus scanner", () => {
  it("recognizes a source plus test patch without counting tests as source", () => {
    expect(isCoarseCandidate(["src/cache.ts", "test/cache.test.ts"])).toBe(true);
    expect(isCoarseCandidate(["test/cache.ts", "test/cache.test.ts"])).toBe(false);
    expect(isCoarseCandidate(["src/cache.ts", "README.md"])).toBe(false);
    expect(isCoarseCandidate(["src/types.d.ts", "src/types.test.ts"])).toBe(false);
  });

  it("walks adjacent first-parent patches and emits outcome-free preflight evidence", async () => {
    const root = await fixtureRepository();
    const tip = await git(root, ["rev-parse", "HEAD"]);
    const registration = repository(tip);

    const result = await scanRepository(root, registration);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      repositoryId: "fixture-repo",
      ordinal: 1,
      targetCommit: tip,
      adjacentFirstParent: true,
      licenseApproved: true,
      lockfilePresent: true,
      dependencyOrLockfileChanged: false,
      unsupportedArtifactPresent: false,
      changedLines: 4,
      supportedTypescriptBoundary: true,
      hasAttributedTest: true,
      changedSourcePaths: ["src/add.ts"],
      changedTestPaths: ["test/add.test.ts"],
    });
    expect(JSON.stringify(result)).not.toContain("basePassed");
    expect(JSON.stringify(result)).not.toContain("compiler");
  }, 30_000);

  it("requires explicit provisioning evidence before a candidate can be frozen", async () => {
    const root = await fixtureRepository();
    const tip = await git(root, ["rev-parse", "HEAD"]);
    const [draft] = await scanRepository(root, repository(tip));
    const evidence: ProvisionEvidence = {
      schemaVersion: 1,
      sanitizedBytes: 4096,
      requiresProductionCapability: false,
      executionNeedsNetwork: false,
      basePassed: true,
      targetPassed: true,
      provisionEvidenceSha256: "f".repeat(64),
    };

    const completed = completeCandidate(draft!, evidence);

    expect(completed).toMatchObject({
      repositoryId: "fixture-repo",
      basePassed: true,
      targetPassed: true,
    });
    expect(completed.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(() => completeCandidate(draft!, { ...evidence, targetPassed: false, judgePassed: true } as ProvisionEvidence)).toThrow(
      "unknown or missing fields",
    );
  }, 30_000);
});

async function fixtureRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pureflow-corpus-scan-"));
  roots.push(root);
  await git(root, ["init"]);
  await git(root, ["config", "user.name", "PureFlow Test"]);
  await git(root, ["config", "user.email", "test@pureflow.local"]);
  await mkdir(join(root, "src"));
  await mkdir(join(root, "test"));
  await writeFile(join(root, "package-lock.json"), "{}\n");
  await writeFile(join(root, "src", "add.ts"), "export function add(a: number, b: number) {\n  return a + b;\n}\n");
  await writeFile(join(root, "test", "add.test.ts"), "import { add } from '../src/add';\nvoid add(1, 2);\n");
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "base"]);
  await writeFile(join(root, "src", "add.ts"), "export function add(a: number, b: number) {\n  return Number(a) + Number(b);\n}\n");
  await writeFile(join(root, "test", "add.test.ts"), "import { add } from '../src/add';\nvoid add('1' as never, 2);\n");
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "change behavior"]);
  return root;
}

function repository(pinnedTip: string): RepositoryRegistration {
  return {
    schemaVersion: 1,
    repositoryId: "fixture-repo",
    url: "https://github.com/example/fixture-repo.git",
    licenseSpdx: "MIT",
    pinnedTip,
    nodeVersion: "22.18.0",
    packageManager: "npm",
    packageManagerVersion: "10.9.3",
    installArgv: ["npm", "ci", "--ignore-scripts"],
    testArgv: ["npm", "test"],
    candidateHistoryArgv: ["git", "rev-list", "--first-parent", "--max-count=500", pinnedTip],
  };
}

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  return stdout.trim();
}
