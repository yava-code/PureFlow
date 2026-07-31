import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { rawSha256 } from "../src/rnd/canonical";
import { BuiltinFixtureCatalog } from "../src/twin/catalog";
import {
  FixtureCommandRegistry,
  MemoryCommandEvidenceStore,
  terminateProcessTree,
  TrustedFixtureProcessRunner,
} from "../src/twin/commands";
import { TwinManager } from "../src/twin/manager";
import { FixtureSnapshotStore } from "../src/twin/snapshot";
import { EXPECTED_TENANT_CACHE_KEY } from "../src/twin/fixture-factory";
import { openFixtureNodeRuntime } from "../src/twin/fixture-runtime";
import type { EvidenceRef } from "../src/recorder/events";

const runFile = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 3 })));
});

describe("R3 Takeover Twin", () => {
  it("creates a sanitized standalone mutation snapshot without changing production", async () => {
    const before = await sourceRepoSnapshot();
    const env = await setup();
    const snapshot = await env.snapshots.create(await createInput(env.catalog, "project-a"));
    const twin = await env.twins.prepare("project-a", snapshot.id);

    expect(snapshot.treeHash).toBe(EXPECTED_TENANT_CACHE_KEY.mutatedTreeHash);
    expect(snapshot.state).toBe("mutated");
    expect(twin.state).toBe("ready");

    const root = env.twins.resolveReadyRoot("project-a", twin.handle);
    expect(await git(root, ["rev-list", "--count", "HEAD"])).toBe("1");
    expect(await git(root, ["rev-parse", "HEAD"])).toBe(snapshot.participantCommit);
    expect(await git(root, ["remote"])).toBe("");
    expect(await git(root, ["reflog", "show", "--all"])).toBe("");
    await expect(stat(join(root, ".git", "objects", "info", "alternates"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(repoContains(root, EXPECTED_TENANT_CACHE_KEY.targetRevision)).resolves.toBe(false);
    await expect(repoContains(root, repoRoot)).resolves.toBe(false);
    await expect(repoContains(root, "return `${tenant}:${id}`;")).resolves.toBe(false);
    await expect(repoContains(root, "tenant-a:account-42")).resolves.toBe(false);
    await expect(sourceRepoSnapshot()).resolves.toEqual(before);

    await env.twins.cleanup("project-a", twin.handle);
    expect(env.twins.get("project-a", twin.handle)?.state).toBe("cleaned");
    await expect(stat(root)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(sourceRepoSnapshot()).resolves.toEqual(before);
  }, 45_000);

  it("runs only an exact declared fixture state and command", async () => {
    const env = await setup();
    const record = await openRecord(env.catalog);
    const snapshot = await env.snapshots.create(await createInput(env.catalog, "project-a"));
    const twin = await env.twins.prepare("project-a", snapshot.id);

    const result = await env.runner.run({
      executionId: "exec-mutated",
      projectId: "project-a",
      fixtureId: record.manifest.fixtureId,
      manifestHash: record.manifestHash,
      stateId: "mutated",
      commandId: "cache-key.tenant-isolation",
      twinHandle: twin.handle,
    });

    expect(result).toMatchObject({ exitCode: 1, timedOut: false, cancelled: false });
    await expect(env.evidence.open("project-a", result.stderr)).resolves.toContain("tenant-a:account-42");

    const root = env.twins.resolveReadyRoot("project-a", twin.handle);
    await writeFile(join(root, "src", "cache-key.ts"), "export const cacheKey = () => 'tampered';\n");
    await expect(env.runner.run({
      executionId: "exec-tampered",
      projectId: "project-a",
      fixtureId: record.manifest.fixtureId,
      manifestHash: record.manifestHash,
      stateId: "mutated",
      commandId: "cache-key.tenant-isolation",
      twinHandle: twin.handle,
    })).rejects.toThrow("declared fixture state");

    await expect(env.runner.run({
      executionId: "exec-unknown",
      projectId: "project-a",
      fixtureId: record.manifest.fixtureId,
      manifestHash: record.manifestHash,
      stateId: "mutated",
      commandId: "npm-install",
      twinHandle: twin.handle,
    })).rejects.toThrow("command");
  }, 45_000);

  it("fails closed on caller manifests, paths, runtimes, and non-fixture workspaces", async () => {
    const env = await setup();
    const record = await openRecord(env.catalog);

    await expect(env.catalog.open("tenant-cache-key", "0".repeat(64))).resolves.toBeUndefined();
    await expect(env.catalog.open("workspace-project", record.manifestHash)).resolves.toBeUndefined();
    expect(() => env.twins.resolveReadyRoot("project-a", "D:/workspace")).toThrow("opaque");
    await expect(env.runner.runUnsupported({ runner: "sandbox", workspace: repoRoot })).rejects.toThrow("unsupported");
  });

  it("keeps identical concurrent commands independent and cancellation single-use", async () => {
    const env = await setup();
    const record = await openRecord(env.catalog);
    const firstSnapshot = await env.snapshots.create(await createInput(env.catalog, "project-a"));
    const secondSnapshot = await env.snapshots.create(await createInput(env.catalog, "project-a"));
    const [first, second] = await Promise.all([
      env.twins.prepare("project-a", firstSnapshot.id),
      env.twins.prepare("project-a", secondSnapshot.id),
    ]);
    const request = (executionId: string, twinHandle: string) => ({
      executionId,
      projectId: "project-a",
      fixtureId: record.manifest.fixtureId,
      manifestHash: record.manifestHash,
      stateId: "mutated" as const,
      commandId: "cache-key.tenant-isolation",
      twinHandle,
    });

    const cancelled = env.runner.run(request("exec-cancel", first.handle));
    const completed = env.runner.run(request("exec-complete", second.handle));
    await env.runner.cancel("exec-cancel");

    await expect(cancelled).resolves.toMatchObject({ executionId: "exec-cancel", cancelled: true });
    await expect(completed).resolves.toMatchObject({ executionId: "exec-complete", exitCode: 1, cancelled: false });
    await expect(env.runner.run(request("exec-cancel", second.handle))).rejects.toThrow("reused");
  }, 45_000);

  it("rejects unsafe snapshot inputs and cross-project materialization", async () => {
    const env = await setup();
    const input = await createInput(env.catalog, "project-a");
    await expect(env.snapshots.create({ ...input, allowedFiles: ["../secret"] })).rejects.toThrow("path");
    await expect(env.snapshots.create({ ...input, sourceRevision: "0".repeat(40) })).rejects.toThrow("source revision");

    const snapshot = await env.snapshots.create(input);
    await expect(env.twins.prepare("project-b", snapshot.id)).rejects.toThrow("project");
    await expect(env.snapshots.get("project-b", snapshot.id)).resolves.toBeUndefined();
  }, 45_000);

  it("freezes immutable command-registry snapshots", async () => {
    const env = await setup();
    const record = await openRecord(env.catalog);
    const registry = new FixtureCommandRegistry(env.catalog, record.manifest.fixtureId, record.manifestHash);
    const snapshot = await registry.freeze("project-a", ["cache-key.tenant-isolation"]);

    expect(snapshot.sha256).toMatch(/^[0-9a-f]{64}$/);
    await expect(registry.open("project-a", snapshot.sha256)).resolves.toEqual(snapshot);
    await expect(registry.open("project-b", snapshot.sha256)).resolves.toBeUndefined();
    await expect(registry.freeze("project-a", ["npm-install"])).rejects.toThrow("Unknown fixture command");
    await expect(registry.freeze("project-a", ["cache-key.legacy", "cache-key.legacy"])).rejects.toThrow("unique");
  });

  it("terminates a descendant process tree in a path with spaces", async () => {
    const runtime = await openFixtureNodeRuntime();
    const root = await mkdtemp(join(tmpdir(), "pureflow r3 process tree "));
    roots.push(root);
    const ready = join(root, "child-ready.txt");
    const held = join(root, "held file.txt");
    const childScript = [
      "const fs=require('node:fs')",
      `const fd=fs.openSync(${JSON.stringify(held)},'w')`,
      `fs.writeFileSync(${JSON.stringify(ready)},String(process.pid))`,
      "setInterval(()=>fs.fsyncSync(fd),1000)",
    ].join(";");
    const parentScript = [
      "const {spawn}=require('node:child_process')",
      `spawn(process.execPath,['-e',${JSON.stringify(childScript)}],{stdio:'ignore'})`,
      "setInterval(()=>{},1000)",
    ].join(";");
    const parent = spawn(runtime.executablePath, ["-e", parentScript], {
      stdio: "ignore",
      windowsHide: true,
      detached: process.platform !== "win32",
    });

    await waitForFile(ready);
    const childPid = Number(await readFile(ready, "utf8"));
    await terminateProcessTree(parent);
    await waitForExit(parent.pid!);
    await waitForExit(childPid);
    await rm(root, { recursive: true, force: false, maxRetries: 3, retryDelay: 50 });
    roots.splice(roots.indexOf(root), 1);
  }, 30_000);
});

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r3-test-"));
  roots.push(root);
  const catalog = new BuiltinFixtureCatalog();
  const snapshots = new FixtureSnapshotStore(join(root, "snapshots"), catalog, {
    now: () => "2026-01-02T00:00:00.000Z",
  });
  const twins = new TwinManager(join(root, "twins"), snapshots);
  const evidence = new MemoryCommandEvidenceStore();
  const runner = new TrustedFixtureProcessRunner(catalog, twins, evidence);
  return { catalog, snapshots, twins, evidence, runner };
}

async function createInput(catalog: BuiltinFixtureCatalog, projectId: string) {
  const record = await openRecord(catalog);
  const ref = record.manifest.mutation.changeRef;
  const mutation: EvidenceRef = {
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
  return {
    projectId,
    sourceRevision: record.manifest.targetRevision,
    mutationId: record.manifest.mutation.id,
    mutation,
    allowedFiles: record.manifest.states.find((state) => state.id === "target")!.files.map((file) => file.path),
  };
}

async function openRecord(catalog: BuiltinFixtureCatalog) {
  const record = await catalog.open("tenant-cache-key", EXPECTED_TENANT_CACHE_KEY.manifestHash);
  if (!record) throw new Error("Built-in fixture missing");
  return record;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await runFile("git", args, { cwd, encoding: "utf8", windowsHide: true });
  return stdout.trim();
}

async function repoContains(root: string, value: string): Promise<boolean> {
  const files: string[] = [];
  await walk(root);
  for (const file of files) {
    if ((await readFile(file)).includes(Buffer.from(value))) return true;
  }
  return false;

  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
}

async function sourceRepoSnapshot(): Promise<string[]> {
  const commands = [
    ["status", "--porcelain=v1"],
    ["hash-object", ".git/index"],
    ["rev-parse", "--symbolic-full-name", "HEAD"],
    ["rev-parse", "HEAD"],
    ["for-each-ref", "--format=%(refname):%(objectname)"],
    ["remote", "-v"],
    ["worktree", "list", "--porcelain"],
  ];
  const gitState = await Promise.all(commands.map(async (args) => (await runFile("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  })).stdout.trim()));
  const { stdout: listed } = await runFile("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  const hashes = await Promise.all(listed.split("\0").filter(Boolean).map(async (path) => {
    try {
      return `${path}:${rawSha256(await readFile(join(repoRoot, ...path.split("/"))))}`;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return `${path}:missing`;
      if (code === "EISDIR") return `${path}:directory`;
      throw error;
    }
  }));
  return [...gitState, ...hashes];
}

async function waitForFile(path: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await stat(path);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error("Descendant process did not become ready");
}

async function waitForExit(pid: number): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      throw error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  throw new Error(`Process ${pid} survived tree termination`);
}
