import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { assertToken } from "../agent/types";
import { assertRelPath, compareUtf8, rawSha256, treeHash, type TreeFile } from "../rnd/canonical";
import { assertEvidenceRef } from "../recorder/events";
import { BuiltinFixtureCatalog } from "./catalog";
import { materializeTenantCacheKeyState } from "./fixture-factory";
import type { CreateSnapshotInput, SanitizedSnapshot } from "./types";

const participantDate = "2026-01-02T00:00:00.000Z";

interface SnapshotRecord {
  snapshot: SanitizedSnapshot;
  root: string;
}

export class FixtureSnapshotStore {
  private readonly root: string;
  private readonly records = new Map<string, SnapshotRecord>();
  private readonly destinations = new Map<string, string>();

  constructor(
    root: string,
    private readonly catalog: BuiltinFixtureCatalog,
    private readonly options: { now?: () => string; id?: () => string } = {},
  ) {
    this.root = resolve(root);
  }

  async create(input: CreateSnapshotInput): Promise<SanitizedSnapshot> {
    validateInput(input);
    const record = await this.catalog.openForSnapshot(input.sourceRevision, input.mutationId);
    if (!record) throw new Error("Snapshot source revision or mutation is not in the trusted fixture catalog");
    if (!sameEvidence(input.mutation, record.manifest.mutation.changeRef)) {
      throw new Error("Snapshot mutation evidence does not match the trusted catalog");
    }

    const target = record.manifest.states.find((state) => state.id === "target")!;
    const mutated = record.manifest.states.find((state) => state.id === "mutated")!;
    const allowed = [...input.allowedFiles].sort(compareUtf8);
    const declared = target.files.map((file) => file.path);
    if (allowed.length !== declared.length || allowed.some((path, index) => path !== declared[index])) {
      throw new Error("Snapshot allowed files must equal the declared target fixture tree");
    }

    const id = (this.options.id ?? randomUUID)().replaceAll("-", "");
    assertToken(id, "snapshotId");
    const projectRoot = this.owned(join(this.root, input.projectId));
    const root = this.owned(join(projectRoot, id, "repo"));
    if (this.records.has(key(input.projectId, id))) throw new Error("Snapshot ID already exists");
    await mkdir(root, { recursive: true });

    try {
      await materializeTenantCacheKeyState("target", root);
      await assertTree(root, target.treeHash, "target");
      await git(root, ["apply", "--whitespace=nowarn", record.blobs.mutation.localHandle]);
      const files = await readCandidateTree(root);
      const hash = treeHash(files);
      if (hash !== mutated.treeHash) throw new Error("Applied mutation does not produce the declared fixture state");
      const participantCommit = await initializeStandaloneRepo(root);
      await verifyStandaloneRepo(root, participantCommit, files);

      const snapshot: SanitizedSnapshot = {
        schemaVersion: 1,
        id,
        projectId: input.projectId,
        state: "mutated",
        treeHash: hash,
        participantCommit,
        files,
        mutationId: input.mutationId,
        mutationSha256: input.mutation.sha256,
        createdAt: (this.options.now ?? (() => new Date().toISOString()))(),
      };
      this.records.set(key(input.projectId, id), { snapshot, root });
      return structuredClone(snapshot);
    } catch (error) {
      await this.removeOwned(join(projectRoot, id));
      throw error;
    }
  }

  async get(projectId: string, snapshotId: string): Promise<SanitizedSnapshot | undefined> {
    assertToken(projectId, "projectId");
    assertToken(snapshotId, "snapshotId");
    const record = this.records.get(key(projectId, snapshotId));
    if (!record) return undefined;
    await verifyStandaloneRepo(record.root, record.snapshot.participantCommit, record.snapshot.files);
    return structuredClone(record.snapshot);
  }

  reserveDestination(destination: string): string {
    const root = resolve(destination);
    if (!basename(root).startsWith("pureflow-twin-")) {
      throw new Error("Twin destination must have a controller-owned prefix");
    }
    const handle = randomUUID().replaceAll("-", "");
    this.destinations.set(handle, root);
    return handle;
  }

  async materialize(projectId: string, snapshotId: string, destinationHandle: string): Promise<void> {
    assertToken(destinationHandle, "destinationHandle");
    const record = this.records.get(key(projectId, snapshotId));
    if (!record) throw new Error("Snapshot does not belong to this project");
    const destination = this.destinations.get(destinationHandle);
    if (!destination) throw new Error("Unknown or expired destination handle");
    this.destinations.delete(destinationHandle);
    await assertEmpty(destination);
    await verifyStandaloneRepo(record.root, record.snapshot.participantCommit, record.snapshot.files);
    await copyRegularTree(record.root, destination, true);
    await verifyStandaloneRepo(destination, record.snapshot.participantCommit, record.snapshot.files);
  }

  async remove(projectId: string, snapshotId: string): Promise<void> {
    const record = this.records.get(key(projectId, snapshotId));
    if (!record) return;
    this.records.delete(key(projectId, snapshotId));
    await this.removeOwned(dirname(record.root));
  }

  async removeProject(projectId: string): Promise<void> {
    assertToken(projectId, "projectId");
    for (const [id, record] of [...this.records]) {
      if (record.snapshot.projectId === projectId) this.records.delete(id);
    }
    await this.removeOwned(join(this.root, projectId));
  }

  private owned(path: string): string {
    const value = resolve(path);
    if (value === this.root || !value.startsWith(`${this.root}${sep}`)) {
      throw new Error("Snapshot path escapes its storage root");
    }
    return value;
  }

  private async removeOwned(path: string): Promise<void> {
    const value = this.owned(path);
    await rm(value, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
}

export async function readCandidateTree(root: string): Promise<TreeFile[]> {
  const base = resolve(root);
  const files: TreeFile[] = [];
  await walk(base);
  return files.sort((left, right) => compareUtf8(left.path, right.path));

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (directory === base && entry.name === ".git") continue;
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) {
        throw new Error(`Unsupported twin entry: ${relative(base, path)}`);
      }
      if (info.isDirectory()) {
        await walk(path);
        continue;
      }
      if (info.nlink !== 1) throw new Error(`Hard-linked twin file is unsupported: ${relative(base, path)}`);
      const rel = relative(base, path).split(sep).join("/");
      assertRelPath(rel);
      files.push({
        path: rel,
        mode: process.platform !== "win32" && (info.mode & 0o111) ? "100755" : "100644",
        sha256: rawSha256(await readFile(path)),
      });
    }
  }
}

async function initializeStandaloneRepo(root: string): Promise<string> {
  const template = await mkdtemp(join(tmpdir(), "pureflow-empty-git-template-"));
  try {
    await git(root, ["init", "--object-format=sha1", "--initial-branch=main", `--template=${template}`]);
    await git(root, ["config", "core.autocrlf", "false"]);
    await git(root, ["config", "core.eol", "lf"]);
    await git(root, ["config", "core.logAllRefUpdates", "false"]);
    await git(root, ["config", "user.name", "PureFlow Participant"]);
    await git(root, ["config", "user.email", "participant@pureflow.invalid"]);
    await git(root, ["add", "--all"]);
    await git(root, ["-c", "commit.gpgSign=false", "commit", "--no-gpg-sign", "-m", "takeover start"]);
    await rm(join(root, ".git", "logs"), { recursive: true, force: true });
    await rm(join(root, ".git", "objects", "info", "alternates"), { force: true });
    return git(root, ["rev-parse", "HEAD"]);
  } finally {
    await rm(template, { recursive: true, force: true });
  }
}

export async function verifyStandaloneRepo(
  root: string,
  participantCommit: string,
  files: readonly TreeFile[],
): Promise<void> {
  if ((await git(root, ["rev-parse", "HEAD"])) !== participantCommit) {
    throw new Error("Participant commit changed");
  }
  if ((await git(root, ["rev-list", "--count", "HEAD"])) !== "1") {
    throw new Error("Participant repository must contain exactly one commit");
  }
  if (await git(root, ["remote"])) throw new Error("Participant repository contains a remote");
  if (await git(root, ["reflog", "show", "--all"])) throw new Error("Participant repository contains a reflog");
  try {
    await stat(join(root, ".git", "objects", "info", "alternates"));
    throw new Error("Participant repository contains Git alternates");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const actual = await readCandidateTree(root);
  if (treeHash(actual) !== treeHash(files)) throw new Error("Participant tree does not match its snapshot");
}

async function assertTree(root: string, expected: string, label: string): Promise<void> {
  if (treeHash(await readCandidateTree(root)) !== expected) {
    throw new Error(`Materialized tree does not match declared ${label} state`);
  }
}

async function copyRegularTree(source: string, destination: string, includeGit: boolean): Promise<void> {
  const base = resolve(source);
  await walk(base);

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!includeGit && directory === base && entry.name === ".git") continue;
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) {
        throw new Error(`Unsupported source entry: ${relative(base, path)}`);
      }
      const rel = relative(base, path);
      const target = join(destination, rel);
      if (info.isDirectory()) {
        await mkdir(target, { recursive: true });
        await walk(path);
      } else {
        if (info.nlink !== 1) throw new Error(`Hard-linked source file is unsupported: ${rel}`);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, await readFile(path));
        if (process.platform !== "win32") await chmod(target, info.mode & 0o777);
      }
    }
  }
}

async function assertEmpty(root: string): Promise<void> {
  const info = await stat(root);
  if (!info.isDirectory() || (await readdir(root)).length !== 0) {
    throw new Error("Twin destination must be an empty directory");
  }
  await realpath(root);
}

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await run("git", args, cwd, 30_000, gitEnvironment());
  if (result.code !== 0) throw new Error(`Git failed (${args[0]}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

async function run(
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  env: Record<string, string>,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timer);
      resolveRun({ code, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") });
    });
  });
}

function gitEnvironment(): Record<string, string> {
  return {
    GIT_AUTHOR_NAME: "PureFlow Participant",
    GIT_AUTHOR_EMAIL: "participant@pureflow.invalid",
    GIT_AUTHOR_DATE: participantDate,
    GIT_COMMITTER_NAME: "PureFlow Participant",
    GIT_COMMITTER_EMAIL: "participant@pureflow.invalid",
    GIT_COMMITTER_DATE: participantDate,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    LANG: "C",
    LC_ALL: "C",
    PATH: process.env.PATH ?? "",
    SYSTEMROOT: process.env.SYSTEMROOT ?? "",
  };
}

function validateInput(input: CreateSnapshotInput): void {
  assertToken(input.projectId, "projectId");
  if (!/^[0-9a-f]{40}$/.test(input.sourceRevision)) throw new Error("Invalid source revision");
  assertToken(input.mutationId, "mutationId");
  assertEvidenceRef(input.mutation, "diff");
  if (input.mutation.kind !== "diff" || input.mutation.visibility !== "controller") {
    throw new Error("Snapshot mutation must be controller diff evidence");
  }
  if (!Array.isArray(input.allowedFiles) || input.allowedFiles.length === 0) {
    throw new Error("Snapshot allowed files must be a non-empty array");
  }
  const folded = new Set<string>();
  for (const path of input.allowedFiles) {
    assertRelPath(path);
    const key = path.toLowerCase();
    if (folded.has(key)) throw new Error("Snapshot allowed files contain duplicates");
    folded.add(key);
  }
}

function sameEvidence(ref: CreateSnapshotInput["mutation"], expected: { id: string; sha256: string; storedBytes: number; mediaType: string }): boolean {
  return ref.id === expected.id &&
    ref.sha256 === expected.sha256 &&
    ref.storedBytes === expected.storedBytes &&
    ref.originalBytes === expected.storedBytes &&
    ref.truncated === false &&
    ref.redactions.length === 0 &&
    ref.mediaType === expected.mediaType;
}

function key(projectId: string, snapshotId: string): string {
  return `${projectId}/${snapshotId}`;
}
