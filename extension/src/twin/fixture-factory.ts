import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { rawSha256, treeHash, type TreeFile } from "../rnd/canonical";
import {
  candidateDiffHash,
  fixtureManifestHash,
  validateFixtureManifest,
  type FixtureBlobRef,
  type FixtureManifest,
  type FixtureState,
} from "./fixture-contract";
import { openFixtureNodeRuntime, type InstalledFixtureRuntime } from "./fixture-runtime";

const assets = fileURLToPath(new URL("../../test/fixtures/v0.3/tenant-cache-key/", import.meta.url));
const gitDate = "2026-01-01T00:00:00.000Z";

export const EXPECTED_TENANT_CACHE_KEY = {
  baseRevision: "dbb7f641fc6215cbeefa8a100645e1caa5b3d0a7",
  targetRevision: "449bc18f0e0cb635f36e726affc42a7ae1df0211",
  baseTreeHash: "1f80cddca40212c2d49010e83e963c36ec9bdaa54f76b855a36001bdd88d692b",
  targetTreeHash: "f7d712a8c03136b13e752e17621c316bf3db1d4fdcadb131b84f455b79d83f91",
  mutatedTreeHash: "bd7d7ad5af60b54da422579e3fe9d4a318fb06199cca63dc7e716b902a0a04fe",
  manifestHash: "ad1820fd4cbfc6878c90a29732d30b6a39bf57e8c0a77f43ce73aaf47046e4f3",
} as const;

export interface FixtureCommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface TenantCacheKeyFixture {
  root: string;
  manifest: FixtureManifest;
  manifestHash: string;
  baseRevision: string;
  targetRevision: string;
  runtime: InstalledFixtureRuntime;
  state(id: FixtureState["id"]): FixtureState;
  git(args: string[]): Promise<string>;
  checkout(state: "base" | "target"): Promise<void>;
  applyMutation(): Promise<void>;
  applyKnownRepair(): Promise<void>;
  runCheck(checkId: string): Promise<FixtureCommandResult>;
  treeHash(): Promise<string>;
  dispose(): Promise<void>;
}

export async function createTenantCacheKeyFixture(destination: string): Promise<TenantCacheKeyFixture> {
  const root = verifiedTempRoot(destination);
  const runtime = await openFixtureNodeRuntime();
  const template = await mkdtemp(join(tmpdir(), "pureflow-empty-git-template-"));

  try {
    await assertEmpty(root);
    await copyTree(join(assets, "base"), root);
    await git(root, ["init", "--object-format=sha1", "--initial-branch=main", `--template=${template}`]);
    await git(root, ["config", "core.autocrlf", "false"]);
    await git(root, ["config", "core.eol", "lf"]);
    await git(root, ["config", "user.name", "PureFlow Fixture"]);
    await git(root, ["config", "user.email", "fixture@pureflow.invalid"]);
    await commit(root, "fixture: base");
    const baseRevision = await git(root, ["rev-parse", "HEAD"]);

    await replaceCandidateTree(root, join(assets, "target"));
    await commit(root, "fixture: tenant cache key");
    const targetRevision = await git(root, ["rev-parse", "HEAD"]);

    const manifest = await buildManifest(baseRevision, targetRevision);
    validateFixtureManifest(manifest, {
      handle: runtime.handle,
      version: runtime.version,
      executableSha256: runtime.executableSha256,
    });
    const manifestHash = fixtureManifestHash(manifest);

    const api: TenantCacheKeyFixture = {
      root,
      manifest,
      manifestHash,
      baseRevision,
      targetRevision,
      runtime,
      state(id) {
        const state = manifest.states.find((item) => item.id === id);
        if (!state) {
          throw new Error(`Unknown fixture state: ${id}`);
        }
        return state;
      },
      git: (args) => git(root, args),
      async checkout(state) {
        const revision = state === "base" ? baseRevision : targetRevision;
        await git(root, ["checkout", "--detach", "--force", revision]);
      },
      async applyMutation() {
        await assertTree(root, manifest.states[1]!.treeHash, "target");
        await git(root, ["apply", "--whitespace=nowarn", join(assets, "controller", "mutation.patch")]);
        await assertTree(root, manifest.states[2]!.treeHash, "mutated");
      },
      async applyKnownRepair() {
        await assertTree(root, manifest.states[2]!.treeHash, "mutated");
        await git(root, ["apply", "--whitespace=nowarn", join(assets, "controller", "repair.patch")]);
        await assertTree(root, manifest.states[1]!.treeHash, "target");
      },
      async runCheck(checkId) {
        const check = manifest.checks.find((item) => item.id === checkId);
        if (!check) {
          throw new Error(`Unknown fixture check: ${checkId}`);
        }
        const command = manifest.commands.find((item) => item.id === check.commandId)!;
        return run(
          runtime.executablePath,
          [
            "--experimental-strip-types",
            join(assets, "controller", "harness.mjs"),
            checkId,
            join(assets, "controller", "oracle.json"),
          ],
          root,
          command.timeoutMs,
          command.maxOutputBytes,
        );
      },
      treeHash: () => hashCandidateTree(root),
      dispose: () => removeFixtureRoot(root),
    };

    return api;
  } catch (error) {
    await removeFixtureRoot(root);
    throw error;
  } finally {
    await rm(template, { recursive: true, force: true });
  }
}

async function buildManifest(baseRevision: string, targetRevision: string): Promise<FixtureManifest> {
  const [baseFiles, targetFiles, mutatedFiles] = await Promise.all([
    readTree(join(assets, "base")),
    readTree(join(assets, "target")),
    readTree(join(assets, "mutated")),
  ]);
  const source = "src/cache-key.ts";
  const baseSource = baseFiles.find((file) => file.path === source)!;
  const targetSource = targetFiles.find((file) => file.path === source)!;
  const mutatedSource = mutatedFiles.find((file) => file.path === source)!;
  const candidateDiff = {
    schemaVersion: 1 as const,
    baseTreeHash: treeHash(mutatedFiles),
    resultTreeHash: treeHash(targetFiles),
    changes: [
      {
        path: source,
        beforeSha256: mutatedSource.sha256,
        afterSha256: targetSource.sha256,
        beforeMode: mutatedSource.mode,
        afterMode: targetSource.mode,
      },
    ],
  };

  const command = (id: string, label: string) => ({
    schemaVersion: 1 as const,
    id,
    label,
    runner: "trusted-fixture" as const,
    fixtureId: "tenant-cache-key",
    toolchainHandle: "fixture-node" as const,
    args: [id],
    cwd: ".",
    timeoutMs: 5_000,
    envAllowlist: [],
    maxOutputBytes: 16_384,
    network: "not-enforced-reviewed-fixture" as const,
  });

  return {
    schemaVersion: 1,
    fixtureId: "tenant-cache-key",
    stack: "node-typescript",
    defaultBranch: "main",
    baseRevision,
    targetRevision,
    changedSymbols: [{ path: source, symbol: "cacheKey" }],
    commands: [
      command("cache-key.legacy", "Legacy cache-key check"),
      command("cache-key.tenant-isolation", "Tenant isolation check"),
    ],
    checks: [
      { id: "cache-key.legacy", commandId: "cache-key.legacy" },
      { id: "cache-key.tenant-isolation", commandId: "cache-key.tenant-isolation" },
    ],
    baseChecks: ["cache-key.legacy"],
    targetChecks: ["cache-key.tenant-isolation"],
    mutation: {
      id: "drop-tenant-from-cache-key",
      changeRef: await blob("mutation.patch", "controller", "text/x-diff"),
      expectedFailingChecks: ["cache-key.tenant-isolation"],
      editablePaths: [source],
    },
    knownRepair: {
      changeRef: await blob("repair.patch", "controller", "text/x-diff"),
      candidateDiff,
      candidateDiffHash: candidateDiffHash(candidateDiff),
      resultingState: "target",
    },
    states: [
      { id: "base", treeHash: treeHash(baseFiles), files: baseFiles, commandIds: ["cache-key.legacy"] },
      {
        id: "target",
        treeHash: treeHash(targetFiles),
        files: targetFiles,
        commandIds: ["cache-key.tenant-isolation"],
      },
      {
        id: "mutated",
        treeHash: treeHash(mutatedFiles),
        files: mutatedFiles,
        commandIds: ["cache-key.tenant-isolation"],
      },
    ],
    git: {
      autocrlf: false,
      eol: "lf",
      userName: "PureFlow Fixture",
      userEmail: "fixture@pureflow.invalid",
      authorDate: gitDate,
      committerDate: gitDate,
      objectFormat: "sha1",
    },
    toolchain: {
      nodeVersion: "v22.17.0",
      dependencies: "none",
      harness: await blob("harness.mjs", "controller", "text/javascript"),
      oracle: await blob("oracle.json", "oracle", "application/json"),
    },
  };

  async function blob(
    name: string,
    visibility: FixtureBlobRef["visibility"],
    mediaType: string,
  ): Promise<FixtureBlobRef> {
    const bytes = await readFile(join(assets, "controller", name));
    return { id: name, sha256: rawSha256(bytes), storedBytes: bytes.byteLength, mediaType, visibility };
  }
}

async function commit(root: string, message: string): Promise<void> {
  await git(root, ["add", "--all"]);
  await git(root, ["-c", "commit.gpgSign=false", "commit", "--no-gpg-sign", "-m", message]);
}

async function git(root: string, args: string[]): Promise<string> {
  const result = await run("git", args, root, 30_000, 1_048_576, gitEnvironment());
  if (result.exitCode !== 0) {
    throw new Error(`Git failed (${args[0]}): ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function gitEnvironment(): Record<string, string> {
  return {
    GIT_AUTHOR_NAME: "PureFlow Fixture",
    GIT_AUTHOR_EMAIL: "fixture@pureflow.invalid",
    GIT_AUTHOR_DATE: gitDate,
    GIT_COMMITTER_NAME: "PureFlow Fixture",
    GIT_COMMITTER_EMAIL: "fixture@pureflow.invalid",
    GIT_COMMITTER_DATE: gitDate,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    LANG: "C",
    LC_ALL: "C",
    PATH: process.env.PATH ?? "",
    SYSTEMROOT: process.env.SYSTEMROOT ?? "",
  };
}

async function run(
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  maxOutputBytes: number,
  env: Record<string, string> = { PUREFLOW_EXECUTION_ID: randomUUID() },
): Promise<FixtureCommandResult> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, { cwd, env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes <= maxOutputBytes) stdout.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.byteLength;
      if (stderrBytes <= maxOutputBytes) stderr.push(chunk);
    });
    child.once("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveRun({
        exitCode: code,
        stdout: Buffer.concat(stdout).toString("utf8").trim(),
        stderr: Buffer.concat(stderr).toString("utf8").trim(),
        timedOut,
      });
    });
  });
}

async function replaceCandidateTree(root: string, source: string): Promise<void> {
  const current = await readTree(root);
  for (const file of current) {
    await rm(join(root, ...file.path.split("/")), { force: true });
  }
  await copyTree(source, root);
}

async function copyTree(source: string, destination: string): Promise<void> {
  for (const file of await readTree(source)) {
    const target = join(destination, ...file.path.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(join(source, ...file.path.split("/"))));
  }
}

async function readTree(root: string): Promise<TreeFile[]> {
  const files: TreeFile[] = [];
  await walk(root);
  return files.sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        const rel = relative(root, path).split(sep).join("/");
        const bytes = await readFile(path);
        files.push({ path: rel, mode: "100644", sha256: rawSha256(bytes) });
      } else {
        throw new Error(`Unsupported fixture entry: ${path}`);
      }
    }
  }
}

async function hashCandidateTree(root: string): Promise<string> {
  return treeHash(await readTree(root));
}

async function assertTree(root: string, expected: string, state: string): Promise<void> {
  const actual = await hashCandidateTree(root);
  if (actual !== expected) {
    throw new Error(`Fixture tree does not match declared ${state} state`);
  }
}

async function assertEmpty(root: string): Promise<void> {
  const info = await stat(root);
  if (!info.isDirectory() || (await readdir(root)).length !== 0) {
    throw new Error("Fixture destination must be an empty directory");
  }
}

function verifiedTempRoot(path: string): string {
  const root = resolve(path);
  const temp = resolve(tmpdir());
  if (!root.startsWith(`${temp}${sep}`) || !basename(root).startsWith("pureflow-r0b-")) {
    throw new Error("Fixture root must be a dedicated PureFlow R0b temporary directory");
  }
  return root;
}

async function removeFixtureRoot(root: string): Promise<void> {
  verifiedTempRoot(root);
  await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
}
