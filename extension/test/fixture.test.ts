import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTenantCacheKeyFixture,
  EXPECTED_TENANT_CACHE_KEY,
  type TenantCacheKeyFixture,
} from "../src/twin/fixture-factory";
import { openFixtureNodeRuntime } from "../src/twin/fixture-runtime";

const roots: string[] = [];
const runFile = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

afterEach(async () => {
  await Promise.all(roots.splice(0).map(async (root) => {
    const fixture = active.get(root);
    if (fixture) {
      await fixture.dispose();
      active.delete(root);
    }
  }));
});

const active = new Map<string, TenantCacheKeyFixture>();

describe("R0b tenant-cache-key fixture", () => {
  it("opens a hash-verified standalone Node 22.17.0 runtime", async () => {
    const runtime = await openFixtureNodeRuntime();

    expect(runtime.version).toBe("v22.17.0");
    expect(runtime.handle).toBe("fixture-node");
    expect(runtime.executableSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(resolve(runtime.executablePath)).not.toBe(resolve(process.execPath));
  });

  it("creates the exact portable base and target revisions", async () => {
    const fixture = await createFixture();

    expect(fixture.baseRevision).toBe(EXPECTED_TENANT_CACHE_KEY.baseRevision);
    expect(fixture.targetRevision).toBe(EXPECTED_TENANT_CACHE_KEY.targetRevision);
    expect(fixture.manifestHash).toBe(EXPECTED_TENANT_CACHE_KEY.manifestHash);
    expect(fixture.state("base").treeHash).toBe(EXPECTED_TENANT_CACHE_KEY.baseTreeHash);
    expect(fixture.state("target").treeHash).toBe(EXPECTED_TENANT_CACHE_KEY.targetTreeHash);
    expect(fixture.state("mutated").treeHash).toBe(EXPECTED_TENANT_CACHE_KEY.mutatedTreeHash);
    expect(await fixture.git(["rev-parse", "--show-object-format"])).toBe("sha1");

    const attrs = await readFile(join(fixture.root, ".gitattributes"));
    expect(attrs.includes(13)).toBe(false);
  }, 30_000);

  it("proves base, target, mutation, and known repair behavior", async () => {
    const fixture = await createFixture();

    await fixture.checkout("base");
    await expect(fixture.runCheck("cache-key.legacy")).resolves.toMatchObject({ exitCode: 0 });

    await fixture.checkout("target");
    await expect(fixture.runCheck("cache-key.tenant-isolation")).resolves.toMatchObject({ exitCode: 0 });

    await fixture.applyMutation();
    await expect(fixture.treeHash()).resolves.toBe(EXPECTED_TENANT_CACHE_KEY.mutatedTreeHash);
    await expect(fixture.runCheck("cache-key.tenant-isolation")).resolves.toMatchObject({ exitCode: 1 });

    await fixture.applyKnownRepair();
    await expect(fixture.treeHash()).resolves.toBe(EXPECTED_TENANT_CACHE_KEY.targetTreeHash);
    await expect(fixture.runCheck("cache-key.tenant-isolation")).resolves.toMatchObject({ exitCode: 0 });
    await expect(fixture.git(["status", "--porcelain"])).resolves.toBe("");
  }, 30_000);

  it("removes only its resolved temporary fixture root", async () => {
    const before = await sourceRepoSnapshot();
    const fixture = await createFixture();
    const parent = resolve(fixture.root, "..");

    await fixture.dispose();
    active.delete(fixture.root);

    await expect(stat(fixture.root)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(stat(parent)).resolves.toBeDefined();
    await expect(sourceRepoSnapshot()).resolves.toEqual(before);
  }, 30_000);
});

async function createFixture(): Promise<TenantCacheKeyFixture> {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r0b-"));
  roots.push(root);
  const fixture = await createTenantCacheKeyFixture(root);
  active.set(root, fixture);
  return fixture;
}

async function sourceRepoSnapshot(): Promise<string[]> {
  const commands = [
    ["status", "--porcelain=v1"],
    ["rev-parse", "--symbolic-full-name", "HEAD"],
    ["rev-parse", "HEAD"],
    ["for-each-ref", "--format=%(refname):%(objectname)", "refs/heads"],
    ["remote", "-v"],
    ["worktree", "list", "--porcelain"],
  ];

  return Promise.all(commands.map(async (args) => {
    const { stdout } = await runFile("git", args, { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    return stdout.trim();
  }));
}
