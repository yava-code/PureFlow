import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { assertExactKeys, assertRelPath, assertSha256, canonicalJson, compareUtf8, rawSha256 } from "../rnd/canonical";
import { assertToken } from "../agent/types";

export interface SandboxCapabilities {
  networkNone: boolean;
  hostFilesystemIsolated: boolean;
  readOnlyOracleMount: boolean;
  processTreeKill: boolean;
  resourceLimits: boolean;
}

export interface IsolatedCommand {
  schemaVersion: 1;
  id: string;
  label: string;
  toolchainHandle: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  envAllowlist: string[];
  maxOutputBytes: number;
  runner: "sandbox";
  network: "none";
}

export interface SandboxRequest {
  executionId: string;
  projectId: string;
  twinHandle: string;
  command: IsolatedCommand;
  writablePaths: string[];
  readOnlyMounts: Array<{ localHandle: string; mountAt: string; sha256: string }>;
  hostMountAllowlist: string[];
}

export interface SandboxWorkspace {
  root: string;
  trusted: boolean;
}

export interface SandboxToolchain {
  image: string;
  entrypoint: string;
}

export interface SandboxCapabilityReceipt {
  backendId: string;
  imageDigest: string;
  measuredAt: string;
  capabilities: SandboxCapabilities;
}

export interface DockerMount {
  source: string;
  target: string;
  readOnly: true;
}

export interface DockerExecutionPlan {
  executionId: string;
  containerName: string;
  image: string;
  entrypoint: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  timeoutMs: number;
  maxOutputBytes: number;
  network: "none";
  readOnlyRoot: true;
  user: "65532:65532";
  capDrop: ["ALL"];
  securityOpt: ["no-new-privileges"];
  memoryBytes: 134217728;
  nanoCpus: 500000000;
  pidsLimit: 64;
  mounts: DockerMount[];
  tmpfs: Array<{ target: string; options: string }>;
}

export interface DockerExecution {
  containerName: string;
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  stdout: Buffer;
  stderr: Buffer;
  stdoutOriginalBytes: number;
  stderrOriginalBytes: number;
}

export interface DockerSandboxBackend {
  capabilities(image: string): Promise<SandboxCapabilityReceipt>;
  run(plan: DockerExecutionPlan): Promise<DockerExecution>;
  kill(containerName: string): Promise<void>;
  cleanup(containerName: string): Promise<boolean>;
}

export interface SandboxCommandAuthority {
  open(projectId: string, commandId: string): Promise<IsolatedCommand | undefined>;
}

export interface SandboxWorkspaceAuthority {
  open(projectId: string, twinHandle: string): Promise<SandboxWorkspace | undefined>;
}

export interface SandboxMountAuthority {
  open(projectId: string, localHandle: string): Promise<string | undefined>;
}

export interface ExecutionConsent {
  allowed(projectId: string): Promise<boolean>;
}

export interface SandboxToolchainCatalog {
  open(handle: string): Promise<SandboxToolchain | undefined>;
}

export function assertSandboxRequest(value: unknown): asserts value is SandboxRequest {
  record(value, "sandbox request");
  assertExactKeys(value, ["executionId", "projectId", "twinHandle", "command", "writablePaths", "readOnlyMounts", "hostMountAllowlist"], "sandbox request");
  assertToken(value.executionId, "executionId");
  assertToken(value.projectId, "projectId");
  assertToken(value.twinHandle, "twinHandle");
  assertIsolatedCommand(value.command);
  assertRelPaths(value.writablePaths, "writablePaths");
  if (!Array.isArray(value.readOnlyMounts) || value.readOnlyMounts.length > 32) {
    throw new Error("readOnlyMounts must contain at most 32 entries");
  }
  const handles: string[] = [];
  const targets: string[] = [];
  for (const mount of value.readOnlyMounts) {
    record(mount, "read-only mount");
    assertExactKeys(mount, ["localHandle", "mountAt", "sha256"], "read-only mount");
    assertToken(mount.localHandle, "localHandle");
    boundedText(mount.mountAt, 1024, "mountAt");
    assertRelPath(mount.mountAt);
    boundedText(mount.sha256, 64, "mount sha256");
    assertSha256(mount.sha256, "mount sha256");
    handles.push(mount.localHandle);
    targets.push(mount.mountAt);
  }
  assertSortedUnique(handles, "readOnlyMounts handles");
  assertSortedUnique(targets, "readOnlyMounts targets", false);
  assertTokens(value.hostMountAllowlist, "hostMountAllowlist");
  if (canonicalJson(value.hostMountAllowlist) !== canonicalJson(handles)) {
    throw new Error("hostMountAllowlist must exactly equal readOnlyMounts handles");
  }
  rejectPathOverlap(value.writablePaths, targets);
}

export function assertIsolatedCommand(value: unknown): asserts value is IsolatedCommand {
  record(value, "isolated command");
  assertExactKeys(value, ["schemaVersion", "id", "label", "toolchainHandle", "args", "cwd", "timeoutMs", "envAllowlist", "maxOutputBytes", "runner", "network"], "isolated command");
  if (value.schemaVersion !== 1) throw new Error("schemaVersion must be 1");
  assertToken(value.id, "command id");
  boundedText(value.label, 256, "command label");
  assertToken(value.toolchainHandle, "toolchainHandle");
  if (!Array.isArray(value.args) || value.args.length > 128) throw new Error("args must contain at most 128 entries");
  for (const arg of value.args) {
    boundedText(arg, 4096, "command arg");
    if (arg.includes("\0")) throw new Error("command args cannot contain NUL");
  }
  boundedText(value.cwd, 1024, "command cwd");
  assertRelPath(value.cwd, true);
  if (typeof value.timeoutMs !== "number" || !Number.isSafeInteger(value.timeoutMs) || value.timeoutMs < 1_000 || value.timeoutMs > 600_000) {
    throw new Error("Command timeout must be between 1000 and 600000 ms");
  }
  assertTokens(value.envAllowlist, "envAllowlist");
  const allowed = ["CI", "NODE_ENV", "NO_COLOR"];
  if ((value.envAllowlist as string[]).some((name) => !allowed.includes(name))) {
    throw new Error("envAllowlist contains a non-catalog environment name");
  }
  if (typeof value.maxOutputBytes !== "number" || !Number.isSafeInteger(value.maxOutputBytes) || value.maxOutputBytes < 1 || value.maxOutputBytes > 1_048_576) {
    throw new Error("maxOutputBytes must be between 1 and 1048576");
  }
  if (value.runner !== "sandbox" || value.network !== "none") throw new Error("Command must use the network-none sandbox");
}

export function assertAllCapabilities(value: SandboxCapabilities): void {
  record(value, "sandbox capabilities");
  assertExactKeys(value, ["networkNone", "hostFilesystemIsolated", "readOnlyOracleMount", "processTreeKill", "resourceLimits"], "sandbox capabilities");
  if (Object.values(value).some((item) => item !== true)) throw new Error("All sandbox capabilities must be verified");
}

export async function assertSafeTree(root: string): Promise<string> {
  const input = await lstat(root);
  if (!input.isDirectory() || input.isSymbolicLink()) throw new Error("Sandbox workspace must be a real directory");
  const canonicalRoot = await realpath(root);
  const stat = await lstat(canonicalRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Sandbox workspace must be a real directory");
  await walk(canonicalRoot);
  return canonicalRoot;

  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === ".git") throw new Error("Sandbox workspace cannot contain Git metadata or gitlinks");
      const path = joinNative(dir, entry.name);
      const item = await lstat(path);
      if (item.isSymbolicLink()) throw new Error("Sandbox workspace cannot contain links or reparse points");
      if (item.isDirectory()) await walk(path);
      else if (!item.isFile() || item.nlink !== 1) throw new Error("Sandbox workspace accepts only private regular files");
    }
  }
}

export async function hashRegularFile(path: string): Promise<string> {
  const input = await lstat(path);
  if (!input.isFile() || input.isSymbolicLink() || input.nlink !== 1) throw new Error("Sandbox mount must be a private regular file");
  const canonical = await realpath(path);
  const stat = await lstat(canonical);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error("Sandbox mount must be a private regular file");
  return rawSha256(await readFile(canonical));
}

function assertRelPaths(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length > 32) throw new Error(`${label} must contain at most 32 entries`);
  value.forEach((path) => {
    if (typeof path !== "string") throw new Error(`${label} must contain paths`);
    assertRelPath(path);
  });
  assertSortedUnique(value, label);
}

function assertTokens(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length > 32) throw new Error(`${label} must contain at most 32 entries`);
  value.forEach((item) => assertToken(item, label));
  assertSortedUnique(value, label);
}

function assertSortedUnique(values: string[], label: string, requireOrder = true): void {
  const sorted = [...values].sort(compareUtf8);
  if (values.some((value, index) => value !== sorted[index])) {
    throw new Error(`${label} must be sorted by UTF-8 order`);
  }
  if (new Set(values).size !== values.length) throw new Error(`${label} must be unique`);
  if (!requireOrder && new Set(values).size !== values.length) throw new Error(`${label} must be unique`);
}

function rejectPathOverlap(writable: string[], readOnly: string[]): void {
  const all = [...writable.map((path) => ({ path, kind: "write" })), ...readOnly.map((path) => ({ path, kind: "read" }))];
  for (let left = 0; left < all.length; left += 1) {
    for (let right = left + 1; right < all.length; right += 1) {
      const a = all[left]!;
      const b = all[right]!;
      if (a.path === b.path || a.path.startsWith(`${b.path}/`) || b.path.startsWith(`${a.path}/`)) {
        throw new Error(`Sandbox paths overlap: ${a.path} and ${b.path}`);
      }
    }
  }
}

function boundedText(value: unknown, limit: number, label: string): asserts value is string {
  if (typeof value !== "string" || !value || Buffer.byteLength(value) > limit) throw new Error(`${label} is invalid`);
}

function record(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function joinNative(root: string, name: string): string {
  return `${root}${process.platform === "win32" ? "\\" : "/"}${name}`;
}
