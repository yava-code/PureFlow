import { randomUUID } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { join, resolve, sep } from "node:path";
import { assertToken } from "../agent/types";
import { canonicalHash, canonicalJson, compareUtf8, rawSha256, treeHash } from "../rnd/canonical";
import { assertEvidenceRef, type EvidenceRef } from "../recorder/events";
import type { LocalTextStorage } from "../recorder/store";
import { BuiltinFixtureCatalog } from "./catalog";
import { TwinManager } from "./manager";
import { readCandidateTree } from "./snapshot";
import type {
  CommandRegistrySnapshot,
  CommandResult,
  TrustedFixtureRecord,
  TrustedFixtureRequest,
} from "./types";

interface StoredOutput {
  projectId: string;
  ref: EvidenceRef;
  content: string;
}

export interface CommandEvidenceStore {
  put(projectId: string, content: Buffer, originalBytes: number): Promise<EvidenceRef>;
  putNamed(projectId: string, id: string, content: Buffer, originalBytes: number): Promise<EvidenceRef>;
  open(projectId: string, ref: EvidenceRef): Promise<string | undefined>;
}

export class MemoryCommandEvidenceStore implements CommandEvidenceStore {
  private readonly values = new Map<string, StoredOutput>();

  async put(projectId: string, content: Buffer, originalBytes: number): Promise<EvidenceRef> {
    assertToken(projectId, "projectId");
    const id = randomUUID().replaceAll("-", "");
    return this.putNamed(projectId, id, content, originalBytes);
  }

  async putNamed(projectId: string, id: string, content: Buffer, originalBytes: number): Promise<EvidenceRef> {
    assertToken(projectId, "projectId");
    assertToken(id, "evidenceId");
    const ref = outputRef(id, content, originalBytes);
    const current = this.values.get(id);
    if (current) {
      if (current.projectId !== projectId || canonicalHash("evidence-ref", current.ref) !== canonicalHash("evidence-ref", ref) || current.content !== content.toString("utf8")) {
        throw new Error("Named command evidence already exists with different content");
      }
      return structuredClone(current.ref);
    }
    this.values.set(id, { projectId, ref, content: content.toString("utf8") });
    return structuredClone(ref);
  }

  async open(projectId: string, ref: EvidenceRef): Promise<string | undefined> {
    const value = this.values.get(ref.id);
    if (!value || value.projectId !== projectId || canonicalHash("evidence-ref", value.ref) !== canonicalHash("evidence-ref", ref)) {
      return undefined;
    }
    return value.content;
  }
}

export class LocalCommandEvidenceStore implements CommandEvidenceStore {
  constructor(private readonly storage: LocalTextStorage) {}

  async put(projectId: string, content: Buffer, originalBytes: number): Promise<EvidenceRef> {
    return this.putNamed(projectId, randomUUID().replaceAll("-", ""), content, originalBytes);
  }

  async putNamed(projectId: string, id: string, content: Buffer, originalBytes: number): Promise<EvidenceRef> {
    assertToken(projectId, "projectId");
    assertToken(id, "evidenceId");
    const ref = outputRef(id, content, originalBytes);
    const path = outputPath(projectId, id);
    const current = await this.storage.readText(`${path}.json`);
    if (current !== undefined) {
      const parsed = JSON.parse(current) as EvidenceRef;
      assertEvidenceRef(parsed, "command-output");
      if (canonicalJson(parsed) !== current || canonicalJson(parsed) !== canonicalJson(ref)) {
        throw new Error("Named command evidence already exists with different metadata");
      }
      const stored = await this.storage.readText(`${path}.b64`);
      if (stored !== content.toString("base64")) throw new Error("Named command evidence already exists with different content");
      return structuredClone(parsed);
    }
    await this.storage.writeText(`${path}.b64`, content.toString("base64"));
    await this.storage.writeText(`${path}.json`, canonicalJson(ref));
    return structuredClone(ref);
  }

  async open(projectId: string, ref: EvidenceRef): Promise<string | undefined> {
    assertToken(projectId, "projectId");
    assertEvidenceRef(ref, "command-output");
    const path = outputPath(projectId, ref.id);
    const [meta, encoded] = await Promise.all([
      this.storage.readText(`${path}.json`),
      this.storage.readText(`${path}.b64`),
    ]);
    if (meta === undefined && encoded === undefined) return undefined;
    if (meta === undefined || encoded === undefined) throw new Error("Stored command evidence is incomplete");
    const parsed = JSON.parse(meta) as EvidenceRef;
    assertEvidenceRef(parsed, "command-output");
    if (canonicalJson(parsed) !== meta || canonicalJson(parsed) !== canonicalJson(ref)) {
      throw new Error("Stored command evidence metadata failed integrity");
    }
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.byteLength !== ref.storedBytes || rawSha256(bytes) !== ref.sha256) {
      throw new Error("Stored command evidence content failed integrity");
    }
    return bytes.toString("utf8");
  }
}

interface Execution {
  request: TrustedFixtureRequest;
  cancelled: boolean;
  child?: ChildProcess;
}

export class TrustedFixtureProcessRunner {
  private readonly active = new Map<string, Execution>();
  private readonly tombstones = new Set<string>();

  constructor(
    private readonly catalog: BuiltinFixtureCatalog,
    private readonly twins: TwinManager,
    private readonly evidence: CommandEvidenceStore,
  ) {}

  async run(request: TrustedFixtureRequest): Promise<CommandResult> {
    validateRequest(request);
    if (this.active.has(request.executionId) || this.tombstones.has(request.executionId)) {
      throw new Error("Execution ID was reused");
    }
    const execution: Execution = { request: structuredClone(request), cancelled: false };
    this.active.set(request.executionId, execution);
    let began = false;
    let lifecycleFailed = false;

    try {
      const record = await this.catalog.open(request.fixtureId, request.manifestHash);
      if (!record) throw new Error("Trusted fixture catalog entry is unavailable");
      const state = record.manifest.states.find((item) => item.id === request.stateId);
      const command = record.manifest.commands.find((item) => item.id === request.commandId);
      if (!state || !command || !state.commandIds.includes(command.id)) {
        throw new Error("Requested command is not declared for this fixture state");
      }

      const root = this.twins.resolveReadyRoot(request.projectId, request.twinHandle);
      if (treeHash(await readCandidateTree(root)) !== state.treeHash) {
        throw new Error("Twin tree does not match the declared fixture state");
      }
      if (execution.cancelled) return this.cancelledResult(request);

      this.twins.beginExecution(request.projectId, request.twinHandle);
      began = true;
      const executable = await this.catalog.resolveNode(record);
      if (execution.cancelled) return this.cancelledResult(request);
      const raw = await execute(
        execution,
        executable,
        [
          "--experimental-strip-types",
          record.blobs.harness.localHandle,
          ...command.args,
          record.blobs.oracle.localHandle,
        ],
        command.cwd === "." ? root : inside(root, command.cwd),
        command.timeoutMs,
        command.maxOutputBytes,
      );
      lifecycleFailed = raw.timedOut;
      const [stdout, stderr] = await Promise.all([
        this.evidence.put(request.projectId, raw.stdout.content, raw.stdout.originalBytes),
        this.evidence.put(request.projectId, raw.stderr.content, raw.stderr.originalBytes),
      ]);
      return {
        executionId: request.executionId,
        commandId: request.commandId,
        exitCode: raw.exitCode,
        timedOut: raw.timedOut,
        cancelled: raw.cancelled,
        stdout,
        stderr,
      };
    } catch (error) {
      if (began) this.twins.finishExecution(request.projectId, request.twinHandle, true);
      began = false;
      throw error;
    } finally {
      if (began) this.twins.finishExecution(request.projectId, request.twinHandle, lifecycleFailed);
      this.active.delete(request.executionId);
      this.tombstones.add(request.executionId);
    }
  }

  async cancel(executionId: string): Promise<void> {
    assertToken(executionId, "executionId");
    const execution = this.active.get(executionId);
    if (!execution) throw new Error("Execution ID is not active");
    execution.cancelled = true;
    if (execution.child) await terminateProcessTree(execution.child);
  }

  async runUnsupported(_request: unknown): Promise<never> {
    throw new Error("Non-fixture execution is unsupported until a verified sandbox backend exists");
  }

  private async cancelledResult(request: TrustedFixtureRequest): Promise<CommandResult> {
    const empty = Buffer.alloc(0);
    const [stdout, stderr] = await Promise.all([
      this.evidence.put(request.projectId, empty, 0),
      this.evidence.put(request.projectId, empty, 0),
    ]);
    return {
      executionId: request.executionId,
      commandId: request.commandId,
      exitCode: null,
      timedOut: false,
      cancelled: true,
      stdout,
      stderr,
    };
  }
}

export class FixtureCommandRegistry {
  private readonly snapshots = new Map<string, CommandRegistrySnapshot>();

  constructor(
    private readonly catalog: BuiltinFixtureCatalog,
    private readonly fixtureId: string,
    private readonly manifestHash: string,
  ) {}

  async freeze(projectId: string, commandIds: string[]): Promise<CommandRegistrySnapshot> {
    assertToken(projectId, "projectId");
    const record = await this.catalog.open(this.fixtureId, this.manifestHash);
    if (!record) throw new Error("Fixture command catalog is unavailable");
    const unique = new Set(commandIds);
    if (unique.size !== commandIds.length) throw new Error("Command registry IDs must be unique");
    const commands = [...unique].sort(compareUtf8).map((id) => {
      const command = record.manifest.commands.find((item) => item.id === id);
      if (!command) throw new Error(`Unknown fixture command: ${id}`);
      return structuredClone(command);
    });
    const core = { schemaVersion: 1 as const, projectId, commands };
    const snapshot = { ...core, sha256: canonicalHash("command-registry", core) };
    const previous = this.snapshots.get(`${projectId}/${snapshot.sha256}`);
    if (previous && canonicalHash("command-registry-snapshot", previous) !== canonicalHash("command-registry-snapshot", snapshot)) {
      throw new Error("Command registry snapshot collision");
    }
    this.snapshots.set(`${projectId}/${snapshot.sha256}`, structuredClone(snapshot));
    return structuredClone(snapshot);
  }

  async open(projectId: string, sha256: string): Promise<CommandRegistrySnapshot | undefined> {
    const value = this.snapshots.get(`${projectId}/${sha256}`);
    if (!value) return undefined;
    const core = { schemaVersion: value.schemaVersion, projectId: value.projectId, commands: value.commands };
    if (canonicalHash("command-registry", core) !== value.sha256) throw new Error("Command registry integrity failure");
    return structuredClone(value);
  }
}

async function execute(
  execution: Execution,
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  maxOutputBytes: number,
): Promise<{
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  stdout: Captured;
  stderr: Captured;
}> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: minimalEnvironment(execution.request.executionId),
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    execution.child = child;
    const stdout = capture(maxOutputBytes);
    const stderr = capture(maxOutputBytes);
    let timedOut = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      void terminateProcessTree(child);
    }, timeoutMs);
    child.stdout.on("data", stdout.add);
    child.stderr.on("data", stderr.add);
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveRun({
        exitCode: code,
        timedOut,
        cancelled: execution.cancelled,
        stdout: stdout.done(),
        stderr: stderr.done(),
      });
    });
  });
}

interface Captured {
  content: Buffer;
  originalBytes: number;
}

function capture(limit: number): { add(chunk: Buffer): void; done(): Captured } {
  const chunks: Buffer[] = [];
  let stored = 0;
  let originalBytes = 0;
  return {
    add(chunk) {
      originalBytes += chunk.byteLength;
      if (stored >= limit) return;
      const part = chunk.subarray(0, limit - stored);
      chunks.push(part);
      stored += part.byteLength;
    },
    done: () => ({ content: Buffer.concat(chunks), originalBytes }),
  };
}

export async function terminateProcessTree(child: ChildProcess): Promise<void> {
  const pid = child.pid;
  if (!pid || !Number.isSafeInteger(pid) || pid < 1) throw new Error("Cannot terminate an unmapped process tree");
  if (process.platform === "win32") {
    const systemRoot = process.env.SYSTEMROOT ?? process.env.WINDIR;
    if (!systemRoot) throw new Error("Windows process-tree termination requires SystemRoot");
    await new Promise<void>((resolveKill) => {
      execFile(join(systemRoot, "System32", "taskkill.exe"), ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        timeout: 10_000,
      }, () => resolveKill());
    });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
}

function minimalEnvironment(executionId: string): Record<string, string> {
  const env: Record<string, string> = { PUREFLOW_EXECUTION_ID: executionId };
  if (process.platform === "win32") {
    if (process.env.SYSTEMROOT) env.SYSTEMROOT = process.env.SYSTEMROOT;
    if (process.env.WINDIR) env.WINDIR = process.env.WINDIR;
  }
  return env;
}

function inside(root: string, rel: string): string {
  const value = resolve(root, ...rel.split("/"));
  if (!value.startsWith(`${resolve(root)}${sep}`)) throw new Error("Command cwd escapes the twin");
  return value;
}

function validateRequest(request: TrustedFixtureRequest): void {
  assertToken(request.executionId, "executionId");
  assertToken(request.projectId, "projectId");
  assertToken(request.fixtureId, "fixtureId");
  if (!/^[0-9a-f]{64}$/.test(request.manifestHash)) throw new Error("Invalid fixture manifest hash");
  assertToken(request.commandId, "commandId");
  assertToken(request.twinHandle, "twinHandle");
  if (!["base", "target", "mutated"].includes(request.stateId)) throw new Error("Unknown fixture state");
}

function outputRef(id: string, content: Buffer, originalBytes: number): EvidenceRef {
  if (!Number.isSafeInteger(originalBytes) || originalBytes < content.byteLength) {
    throw new Error("Command evidence original byte count is invalid");
  }
  const ref: EvidenceRef = {
    id,
    kind: "command-output",
    sha256: rawSha256(content),
    storedBytes: content.byteLength,
    originalBytes,
    truncated: content.byteLength < originalBytes,
    redactions: [],
    mediaType: "text/plain",
    visibility: "controller",
  };
  assertEvidenceRef(ref, "command-output");
  return ref;
}

function outputPath(projectId: string, id: string): string {
  return `command-evidence/${projectId}/${id}`;
}
