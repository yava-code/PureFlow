import { lstat, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { canonicalJson, compareUtf8, rawSha256 } from "../rnd/canonical";
import type { EvidenceRef } from "../recorder/events";
import type { CommandEvidenceStore } from "../twin/commands";
import type { CommandResult } from "../twin/types";
import {
  assertAllCapabilities,
  assertSafeTree,
  assertSandboxRequest,
  hashRegularFile,
  type DockerExecution,
  type DockerExecutionPlan,
  type DockerSandboxBackend,
  type ExecutionConsent,
  type SandboxCapabilities,
  type SandboxCommandAuthority,
  type SandboxMountAuthority,
  type SandboxRequest,
  type SandboxToolchainCatalog,
  type SandboxWorkspaceAuthority,
} from "./types";

interface RunnerOptions {
  commands: SandboxCommandAuthority;
  workspaces: SandboxWorkspaceAuthority;
  mounts: SandboxMountAuthority;
  consent: ExecutionConsent;
  toolchains: SandboxToolchainCatalog;
  backend: DockerSandboxBackend;
  evidence: CommandEvidenceStore;
  now?: () => Date;
}

interface ActiveExecution {
  containerName: string;
  phase: "reserved" | "running" | "terminating";
  cancelled: boolean;
}

interface ResolvedOracle {
  path: string;
  mountAt: string;
  sha256: string;
}

const ENV = { CI: "1", NODE_ENV: "test", NO_COLOR: "1" } as const;
const CAPABILITY_TTL_MS = 5 * 60_000;

export class DockerSandboxRunner {
  private readonly active = new Map<string, ActiveExecution>();
  private readonly tombstones = new Set<string>();
  private readonly now: () => Date;

  constructor(private readonly options: RunnerOptions) {
    this.now = options.now ?? (() => new Date());
  }

  async capabilities(): Promise<SandboxCapabilities> {
    try {
      const toolchain = await this.options.toolchains.open("node-22-r7");
      if (!toolchain) return falseCapabilities();
      const receipt = await this.options.backend.capabilities(toolchain.image);
      if (receipt.imageDigest !== toolchain.image) return falseCapabilities();
      assertFresh(receipt.measuredAt, this.now());
      assertAllCapabilities(receipt.capabilities);
      return { ...receipt.capabilities };
    } catch {
      return falseCapabilities();
    }
  }

  async run(input: SandboxRequest): Promise<CommandResult> {
    assertSandboxRequest(input);
    const request = structuredClone(input);
    if (this.active.has(request.executionId) || this.tombstones.has(request.executionId)) {
      throw new Error("Execution ID was reused");
    }
    const state: ActiveExecution = {
      containerName: containerName(request.executionId),
      phase: "reserved",
      cancelled: false,
    };
    this.active.set(request.executionId, state);
    let launched = false;

    try {
      const prepared = await this.prepare(request, state.containerName);
      const { plan, oracles } = prepared;
      if (state.cancelled) return await this.emptyCancelled(request);
      state.phase = "running";
      launched = true;
      let raw: DockerExecution;
      let runError: unknown;
      try {
        raw = await this.options.backend.run(plan);
      } catch (error) {
        runError = error;
        raw = emptyExecution(plan, state.cancelled);
      }
      const cleanupOk = await this.options.backend.cleanup(state.containerName).catch(() => false);
      launched = false;
      if (!cleanupOk) throw new Error("Sandbox cleanup could not verify exact container removal");
      if (runError) throw new Error("Sandbox backend execution failed");
      await this.verifyOracles(oracles);
      validateExecution(raw, state, plan);
      if (raw.exitCode !== null && [125, 126, 127].includes(raw.exitCode)) {
        throw new Error("Sandbox infrastructure failed before the approved command completed");
      }
      const [stdout, stderr] = await Promise.all([
        this.storeOutput(request.projectId, raw.stdout, raw.stdoutOriginalBytes, request.command.maxOutputBytes),
        this.storeOutput(request.projectId, raw.stderr, raw.stderrOriginalBytes, request.command.maxOutputBytes),
      ]);
      return {
        executionId: request.executionId,
        commandId: request.command.id,
        exitCode: raw.exitCode,
        timedOut: raw.timedOut,
        cancelled: raw.cancelled || state.cancelled,
        stdout,
        stderr,
      };
    } finally {
      if (launched) {
        const cleanupOk = await this.options.backend.cleanup(state.containerName).catch(() => false);
        if (!cleanupOk) {
          this.active.delete(request.executionId);
          this.tombstones.add(request.executionId);
          throw new Error("Sandbox cleanup could not verify exact container removal");
        }
      }
      this.active.delete(request.executionId);
      this.tombstones.add(request.executionId);
    }
  }

  async cancel(executionId: string): Promise<void> {
    const state = this.active.get(executionId);
    if (!state) throw new Error("Execution ID is not active");
    if (state.cancelled) throw new Error("Execution cancellation was already requested");
    state.cancelled = true;
    if (state.phase === "running") {
      state.phase = "terminating";
      await this.options.backend.kill(state.containerName);
    }
  }

  private async prepare(request: SandboxRequest, name: string): Promise<{ plan: DockerExecutionPlan; oracles: ResolvedOracle[] }> {
    const approved = await this.options.commands.open(request.projectId, request.command.id);
    if (!approved || canonicalJson(approved) !== canonicalJson(request.command)) {
      throw new Error("Sandbox command does not match immutable authority");
    }
    if (!(await this.options.consent.allowed(request.projectId))) throw new Error("Project execution consent is required");
    const workspace = await this.options.workspaces.open(request.projectId, request.twinHandle);
    if (!workspace || !workspace.trusted) throw new Error("Sandbox requires a trusted workspace");
    const toolchain = await this.options.toolchains.open(request.command.toolchainHandle);
    if (!toolchain) throw new Error("Sandbox toolchain is unavailable");
    const receipt = await this.options.backend.capabilities(toolchain.image);
    if (receipt.imageDigest !== toolchain.image) throw new Error("Sandbox image digest does not match the catalog");
    assertFresh(receipt.measuredAt, this.now());
    assertAllCapabilities(receipt.capabilities);
    const root = await assertSafeTree(workspace.root);
    await this.verifyWorkspaceTargets(root, request);
    const oracles = await this.resolveOracles(request, root);
    const mounts = [
      { source: root, target: "/workspace", readOnly: true as const },
      ...oracles.map((oracle) => ({ source: oracle.path, target: `/workspace/${oracle.mountAt}`, readOnly: true as const })),
    ];
    const cwd = request.command.cwd === "." ? "/workspace" : `/workspace/${request.command.cwd}`;
    const plan: DockerExecutionPlan = {
      executionId: request.executionId,
      containerName: name,
      image: toolchain.image,
      entrypoint: toolchain.entrypoint,
      args: [...request.command.args],
      cwd,
      env: Object.fromEntries(request.command.envAllowlist.map((key) => [key, ENV[key as keyof typeof ENV]])),
      timeoutMs: request.command.timeoutMs,
      maxOutputBytes: request.command.maxOutputBytes,
      network: "none",
      readOnlyRoot: true,
      user: "65532:65532",
      capDrop: ["ALL"],
      securityOpt: ["no-new-privileges"],
      memoryBytes: 134_217_728,
      nanoCpus: 500_000_000,
      pidsLimit: 64,
      mounts,
      tmpfs: [
        { target: "/tmp", options: "rw,noexec,nosuid,size=16777216" },
        ...request.writablePaths.map((path) => ({ target: `/workspace/${path}`, options: "rw,noexec,nosuid,size=16777216" })),
      ],
    };
    return { plan, oracles };
  }

  private async resolveOracles(request: SandboxRequest, root: string): Promise<ResolvedOracle[]> {
    const resolved: ResolvedOracle[] = [];
    const sources = new Set<string>();
    for (const mount of request.readOnlyMounts) {
      const path = await this.options.mounts.open(request.projectId, mount.localHandle);
      if (!path) throw new Error("Sandbox oracle handle is unavailable for this project");
      const canonical = await realpath(path);
      if (isInside(root, canonical)) throw new Error("Sandbox oracle source cannot be inside the twin");
      const sourceKey = process.platform === "win32" ? canonical.toLowerCase() : canonical;
      if (sources.has(sourceKey)) throw new Error("Sandbox oracle sources must be unique");
      sources.add(sourceKey);
      if (await hashRegularFile(canonical) !== mount.sha256) throw new Error("Sandbox oracle integrity failed before execution");
      resolved.push({ path: canonical, mountAt: mount.mountAt, sha256: mount.sha256 });
    }
    return resolved.sort((left, right) => compareUtf8(left.mountAt, right.mountAt));
  }

  private async verifyWorkspaceTargets(root: string, request: SandboxRequest): Promise<void> {
    const cwd = resolveInside(root, request.command.cwd);
    const cwdStat = await safeLstat(cwd);
    if (!cwdStat?.isDirectory()) throw new Error("Sandbox command cwd must be an existing directory");
    for (const path of request.writablePaths) {
      const stat = await safeLstat(resolveInside(root, path));
      if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new Error("Sandbox writable target must be an existing private directory");
    }
    for (const mount of request.readOnlyMounts) {
      const stat = await safeLstat(resolveInside(root, mount.mountAt));
      if (!stat?.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
        throw new Error("Sandbox oracle target must be an existing private file");
      }
    }
  }

  private async verifyOracles(oracles: ResolvedOracle[]): Promise<void> {
    for (const oracle of oracles) {
      if (await hashRegularFile(oracle.path) !== oracle.sha256) {
        throw new Error("Sandbox oracle integrity failed after execution");
      }
    }
  }

  private async storeOutput(projectId: string, source: Buffer, originalBytes: number, limit: number): Promise<EvidenceRef> {
    if (!Number.isSafeInteger(originalBytes) || originalBytes < source.byteLength) {
      throw new Error("Sandbox output byte accounting is invalid");
    }
    const redacted = redact(source.toString("utf8"));
    const content = truncateUtf8(redacted.text, limit);
    return this.options.evidence.put(projectId, content, originalBytes, redacted.rules);
  }

  private async emptyCancelled(request: SandboxRequest): Promise<CommandResult> {
    const empty = Buffer.alloc(0);
    const [stdout, stderr] = await Promise.all([
      this.options.evidence.put(request.projectId, empty, 0),
      this.options.evidence.put(request.projectId, empty, 0),
    ]);
    return {
      executionId: request.executionId,
      commandId: request.command.id,
      exitCode: null,
      timedOut: false,
      cancelled: true,
      stdout,
      stderr,
    };
  }
}

function redact(source: string): { text: string; rules: EvidenceRef["redactions"] } {
  const rules: EvidenceRef["redactions"] = [];
  let text = source;
  const patterns: Array<[string, RegExp]> = [
    ["bearer-token", /Authorization:\s*Bearer\s+[^\s]+/gi],
    ["github-token", /ghp_[A-Za-z0-9]{36,}/g],
  ];
  for (const [ruleId, pattern] of patterns) {
    let count = 0;
    text = text.replace(pattern, () => {
      count += 1;
      return "[REDACTED]";
    });
    if (count) rules.push({ ruleId, count });
  }
  return { text, rules };
}

function validateExecution(raw: DockerExecution, state: ActiveExecution, plan: DockerExecutionPlan): void {
  if (raw.containerName !== plan.containerName) throw new Error("Sandbox backend returned the wrong container identity");
  const cancelled = raw.cancelled || state.cancelled;
  if (raw.timedOut && cancelled) throw new Error("Sandbox execution cannot be both timed out and cancelled");
  if ((raw.timedOut || cancelled) && raw.exitCode !== null) throw new Error("Terminated sandbox execution cannot have an exit code");
  if (!raw.timedOut && !cancelled && raw.exitCode === null) throw new Error("Completed sandbox execution requires an exit code");
}

function assertFresh(measuredAt: string, now: Date): void {
  const measured = Date.parse(measuredAt);
  if (!Number.isFinite(measured) || measured > now.getTime() || now.getTime() - measured > CAPABILITY_TTL_MS) {
    throw new Error("Sandbox capability receipt is stale or invalid");
  }
}

function containerName(executionId: string): string {
  return `pureflow-r7-${rawSha256(executionId).slice(0, 24)}`;
}

function resolveInside(root: string, rel: string): string {
  if (rel === ".") return root;
  const value = resolve(root, ...rel.split("/"));
  if (!value.startsWith(`${resolve(root)}${sep}`)) throw new Error("Sandbox path escapes the twin");
  return value;
}

function isInside(root: string, value: string): boolean {
  const base = resolve(root);
  const candidate = resolve(value);
  if (process.platform === "win32") return candidate.toLowerCase().startsWith(`${base.toLowerCase()}${sep}`);
  return candidate.startsWith(`${base}${sep}`);
}

function truncateUtf8(value: string, limit: number): Buffer {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.byteLength <= limit) return bytes;
  let end = limit;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  while (end > 0) {
    try {
      decoder.decode(bytes.subarray(0, end));
      return bytes.subarray(0, end);
    } catch {
      end -= 1;
    }
  }
  return Buffer.alloc(0);
}

async function safeLstat(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function falseCapabilities(): SandboxCapabilities {
  return {
    networkNone: false,
    hostFilesystemIsolated: false,
    readOnlyOracleMount: false,
    processTreeKill: false,
    resourceLimits: false,
  };
}

function emptyExecution(plan: DockerExecutionPlan, cancelled: boolean): DockerExecution {
  return {
    containerName: plan.containerName,
    exitCode: null,
    timedOut: false,
    cancelled,
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
    stdoutOriginalBytes: 0,
    stderrOriginalBytes: 0,
  };
}
