import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rawSha256 } from "../rnd/canonical";
import type {
  DockerExecution,
  DockerExecutionPlan,
  DockerSandboxBackend,
  SandboxCapabilities,
  SandboxCapabilityReceipt,
} from "./types";

interface CliResult {
  code: number | null;
  stdout: Buffer;
  stderr: Buffer;
  stdoutBytes: number;
  stderrBytes: number;
}

const CLI_LIMIT = 256 * 1024;
const DOCKER_EXECUTABLE = process.platform === "win32"
  ? "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"
  : "/usr/bin/docker";

export class DockerCliBackend implements DockerSandboxBackend {
  private readonly killed = new Set<string>();

  async capabilities(image: string): Promise<SandboxCapabilityReceipt> {
    const empty = falseCapabilities();
    try {
      const server = await docker(["version", "--format", "{{json .Server}}"], 15_000);
      if (server.code !== 0) return receipt(image, empty);
      const parsedServer = JSON.parse(server.stdout.toString("utf8")) as { Os?: string };
      if (parsedServer.Os !== "linux") return receipt(image, empty);
      const imageInfo = await docker(["image", "inspect", image, "--format", "{{json .RepoDigests}}"], 15_000);
      if (imageInfo.code !== 0) return receipt(image, empty);
      const digests = JSON.parse(imageInfo.stdout.toString("utf8")) as string[];
      if (!Array.isArray(digests) || !digests.includes(image)) return receipt(image, empty);
      const capabilities = await this.probe(image);
      return receipt(image, capabilities);
    } catch {
      return receipt(image, empty);
    }
  }

  async run(plan: DockerExecutionPlan): Promise<DockerExecution> {
    assertContainerName(plan.containerName);
    const args = runArgs(plan);
    const cap = plan.maxOutputBytes + 8_192;
    let timedOut = false;
    let overflow = false;
    const result = await new Promise<CliResult>((resolveRun, reject) => {
      const child = spawn(DOCKER_EXECUTABLE, args, {
        env: dockerEnvironment(),
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdout = capture(cap, () => {
        overflow = true;
        void this.kill(plan.containerName).catch(() => undefined);
      });
      const stderr = capture(cap, () => {
        overflow = true;
        void this.kill(plan.containerName).catch(() => undefined);
      });
      const timer = setTimeout(() => {
        timedOut = true;
        void this.kill(plan.containerName).catch(() => undefined);
      }, plan.timeoutMs);
      child.stdout.on("data", stdout.add);
      child.stderr.on("data", stderr.add);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        const out = stdout.done();
        const err = stderr.done();
        resolveRun({ code, stdout: out.content, stderr: err.content, stdoutBytes: out.originalBytes, stderrBytes: err.originalBytes });
      });
    });
    const cancelled = this.killed.delete(plan.containerName) && !timedOut;
    if (overflow) throw new Error("Sandbox output exceeded the controller bound");
    return {
      containerName: plan.containerName,
      exitCode: timedOut || cancelled ? null : result.code,
      timedOut,
      cancelled,
      stdout: result.stdout,
      stderr: result.stderr,
      stdoutOriginalBytes: result.stdoutBytes,
      stderrOriginalBytes: result.stderrBytes,
    };
  }

  async kill(containerName: string): Promise<void> {
    assertContainerName(containerName);
    this.killed.add(containerName);
    const result = await docker(["container", "kill", containerName], 15_000);
    if (result.code !== 0 && (await containerStatus(containerName)) === "running") {
      throw new Error("Docker could not terminate the exact sandbox container");
    }
  }

  async cleanup(containerName: string): Promise<boolean> {
    assertContainerName(containerName);
    await docker(["container", "rm", "--force", containerName], 15_000).catch(() => undefined);
    return containerMissing(containerName);
  }

  private async probe(image: string): Promise<SandboxCapabilities> {
    const root = await mkdtemp(join(tmpdir(), "pureflow-r7-cap-"));
    const oracle = join(root, "oracle.txt");
    const name = `pureflow-r7-cap-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const killer = `${name}-kill`;
    await writeFile(oracle, "immutable-oracle");
    try {
      const source = await realpath(oracle);
      const script = [
        "const fs=require('fs'),net=require('net');",
        "let rootReadOnly=false,oracleReadOnly=false;",
        "try{fs.writeFileSync('/pureflow-probe','x')}catch(e){rootReadOnly=['EROFS','EACCES','EPERM'].includes(e.code)}",
        "try{fs.writeFileSync('/oracle.txt','x')}catch(e){oracleReadOnly=['EROFS','EACCES','EPERM'].includes(e.code)}",
        "const s=net.connect({host:'1.1.1.1',port:53,timeout:1200});",
        "let outbound=false; s.on('connect',()=>{outbound=true;s.destroy()});",
        "s.on('error',()=>{});s.on('timeout',()=>s.destroy());",
        "setTimeout(()=>{console.log(JSON.stringify({rootReadOnly,oracleReadOnly,outbound}));},1400);",
      ].join("");
      const run = await docker([
        "container", "run", "--name", name,
        "--network", "none", "--read-only", "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges", "--memory", "128m", "--memory-swap", "128m",
        "--cpus", "0.5", "--pids-limit", "64", "--user", "65532:65532",
        "--mount", bindMount(source, "/oracle.txt"), image, "node", "-e", script,
      ], 20_000);
      const inspect = await docker(["container", "inspect", name], 10_000);
      const data = inspect.code === 0 ? (JSON.parse(inspect.stdout.toString("utf8")) as Array<{
        HostConfig: { NetworkMode: string; ReadonlyRootfs: boolean; Memory: number; MemorySwap: number; NanoCpus: number; PidsLimit: number | null; CapDrop: string[] | null; SecurityOpt: string[] | null };
        Mounts: Array<{ Destination: string; RW: boolean }>;
      }>)[0] : undefined;
      const observed = parseProbe(run.stdout);
      const oracleUnchanged = rawSha256(await readFile(oracle)) === rawSha256("immutable-oracle");
      const killed = await this.probeKill(image, killer);
      const mounts = data?.Mounts ?? [];
      return {
        networkNone: run.code === 0 && data?.HostConfig.NetworkMode === "none" && observed?.outbound === false,
        hostFilesystemIsolated: Boolean(data?.HostConfig.ReadonlyRootfs && observed?.rootReadOnly && mounts.length === 1 && mounts[0]?.Destination === "/oracle.txt"),
        readOnlyOracleMount: Boolean(observed?.oracleReadOnly && oracleUnchanged && mounts[0]?.RW === false),
        processTreeKill: killed,
        resourceLimits: Boolean(
          data?.HostConfig.Memory === 134_217_728 &&
          data.HostConfig.MemorySwap === 134_217_728 &&
          data.HostConfig.NanoCpus === 500_000_000 &&
          data.HostConfig.PidsLimit === 64 &&
          data.HostConfig.CapDrop?.includes("ALL") &&
          data.HostConfig.SecurityOpt?.includes("no-new-privileges"),
        ),
      };
    } finally {
      await this.cleanup(name);
      await rm(root, { recursive: true, force: true });
    }
  }

  private async probeKill(image: string, name: string): Promise<boolean> {
    const script = "require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)']);setInterval(()=>{},1000)";
    let stopped = false;
    let removed = false;
    try {
      const started = await docker([
        "container", "run", "--detach", "--name", name, "--network", "none", "--read-only",
        "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--memory", "128m", "--memory-swap", "128m",
        "--cpus", "0.5", "--pids-limit", "64", "--user", "65532:65532", image, "node", "-e", script,
      ], 15_000);
      if (started.code !== 0) return false;
      const killed = await docker(["container", "kill", name], 15_000);
      const inspected = await docker(["container", "inspect", "--format", "{{.State.Status}}", name], 10_000);
      stopped = killed.code === 0 && inspected.stdout.toString("utf8").trim() === "exited";
    } finally {
      removed = await this.cleanup(name);
    }
    return stopped && removed;
  }
}

function runArgs(plan: DockerExecutionPlan): string[] {
  const args = [
    "container", "run", "--name", plan.containerName,
    "--network", plan.network,
    "--read-only",
    "--user", plan.user,
    "--cap-drop", plan.capDrop[0],
    "--security-opt", plan.securityOpt[0],
    "--memory", String(plan.memoryBytes),
    "--memory-swap", String(plan.memoryBytes),
    "--cpus", String(plan.nanoCpus / 1_000_000_000),
    "--pids-limit", String(plan.pidsLimit),
    "--workdir", plan.cwd,
    "--entrypoint", plan.entrypoint,
  ];
  for (const [key, value] of Object.entries(plan.env)) args.push("--env", `${key}=${value}`);
  for (const mount of plan.mounts) args.push("--mount", bindMount(mount.source, mount.target));
  for (const item of plan.tmpfs) args.push("--tmpfs", `${item.target}:${item.options}`);
  args.push(plan.image, ...plan.args);
  return args;
}

function bindMount(source: string, target: string): string {
  if (source.includes(",") || target.includes(",")) throw new Error("Sandbox bind mount contains an unsupported comma");
  return `type=bind,src=${source},dst=${target},readonly`;
}

async function docker(args: string[], timeoutMs: number): Promise<CliResult> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(DOCKER_EXECUTABLE, args, {
      env: dockerEnvironment(),
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = capture(CLI_LIMIT);
    const stderr = capture(CLI_LIMIT);
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", stdout.add);
    child.stderr.on("data", stderr.add);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      const out = stdout.done();
      const err = stderr.done();
      resolveRun({ code, stdout: out.content, stderr: err.content, stdoutBytes: out.originalBytes, stderrBytes: err.originalBytes });
    });
  });
}

function capture(limit: number, overflow?: () => void): { add(chunk: Buffer): void; done(): { content: Buffer; originalBytes: number } } {
  const chunks: Buffer[] = [];
  let stored = 0;
  let originalBytes = 0;
  let overflowed = false;
  return {
    add(chunk) {
      originalBytes += chunk.byteLength;
      if (stored < limit) {
        const part = chunk.subarray(0, limit - stored);
        chunks.push(part);
        stored += part.byteLength;
      }
      if (!overflowed && originalBytes > limit) {
        overflowed = true;
        overflow?.();
      }
    },
    done: () => ({ content: Buffer.concat(chunks), originalBytes }),
  };
}

async function containerMissing(name: string): Promise<boolean> {
  const result = await docker(["container", "inspect", name], 10_000);
  return result.code !== 0;
}

async function containerStatus(name: string): Promise<string | undefined> {
  const result = await docker(["container", "inspect", "--format", "{{.State.Status}}", name], 10_000);
  if (result.code !== 0) return undefined;
  return result.stdout.toString("utf8").trim();
}

function dockerEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ["SYSTEMROOT", "WINDIR"] as const) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

function assertContainerName(value: string): void {
  if (!/^pureflow-r7-(?:[0-9a-f]{24}|cap-[0-9a-f]{20}(?:-kill)?)$/.test(value)) {
    throw new Error("Docker sandbox container name is not controller-owned");
  }
}

function parseProbe(output: Buffer): { rootReadOnly: boolean; oracleReadOnly: boolean; outbound: boolean } | undefined {
  const line = output.toString("utf8").trim().split(/\r?\n/).at(-1);
  if (!line) return undefined;
  try {
    const value = JSON.parse(line) as { rootReadOnly?: unknown; oracleReadOnly?: unknown; outbound?: unknown };
    if (typeof value.rootReadOnly !== "boolean" || typeof value.oracleReadOnly !== "boolean" || typeof value.outbound !== "boolean") return undefined;
    return value as { rootReadOnly: boolean; oracleReadOnly: boolean; outbound: boolean };
  } catch {
    return undefined;
  }
}

function receipt(imageDigest: string, capabilities: SandboxCapabilities): SandboxCapabilityReceipt {
  return {
    backendId: "docker-cli-linux",
    imageDigest,
    measuredAt: new Date().toISOString(),
    capabilities,
  };
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
