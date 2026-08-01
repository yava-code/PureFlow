import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { canonicalHash, rawSha256 } from "../rnd/canonical";
import { R7_NODE_IMAGE } from "../sandbox/toolchains";
import { assertRewindPlanIntegrity, type InternalRewindPlan } from "./rewind-plan";
import {
  classifyRewindEvidence,
  type RewindExecutionStatus,
  type RewindRunEvidence,
  type RewindRunReceipt,
} from "./rewind-runner";

const runFile = promisify(execFile);
const dockerExecutable = process.platform === "win32"
  ? "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"
  : "/usr/bin/docker";
const verifyScript = [
  "const fs=require('node:fs'),c=require('node:crypto');",
  "const pairs=JSON.parse(process.argv[1]);",
  "for(const [p,want] of pairs){const b=fs.readFileSync(p);const h=c.createHash('sha1').update(Buffer.from('blob '+b.length+'\\0')).update(b).digest('hex');if(h!==want){process.stderr.write(p+' '+h+' '+want+'\\n');process.exit(23);}}",
  "process.stdout.write('ok\\n');",
].join("");

interface RawReceipt extends RewindRunReceipt {
  stdout: Buffer;
  stderr: Buffer;
}

interface StateRun {
  receipt: RewindRunReceipt;
  setupMs: number;
  integrityPassed: boolean;
}

export interface RewindExecutionReport {
  schemaVersion: 1;
  compilerProtocol: "r7-rewind-v1";
  internalPlanSha256: string;
  status: RewindExecutionStatus;
  recoveryValid: boolean;
  probeValid: boolean;
  install: RewindRunReceipt | null;
  targetControl: RewindRunReceipt | null;
  mutation: RewindRunReceipt[];
  repair: RewindRunReceipt[];
  setupMs: number[];
  targetArchiveSha256: string | null;
  rewindArchiveSha256: string | null;
  repairArchiveSha256: string | null;
  targetArchiveBytes: number;
  rewindArchiveBytes: number;
  repairArchiveBytes: number;
  productionInvariantPassed: boolean;
  cleanupPassed: boolean;
  reportSha256: string;
}

export function assertRewindExecutionIntegrity(report: RewindExecutionReport): void {
  if (!/^[0-9a-f]{64}$/.test(report.reportSha256)) throw new Error("Invalid R7 execution report hash");
  const { reportSha256, ...core } = report;
  if (canonicalHash("r7-rewind-execution", core) !== reportSha256) {
    throw new Error("R7 execution report hash mismatch");
  }
}

export async function executeRewindPlan(repositoryPath: string, plan: InternalRewindPlan): Promise<RewindExecutionReport> {
  assertRewindPlanIntegrity(plan);
  const repository = resolve(repositoryPath);
  const root = await mkdtemp(join(tmpdir(), "pureflow-r7-audit-"));
  const targetArchive = join(root, "target.tar");
  const rewindArchive = join(root, "rewind.tar");
  const repairArchive = join(root, "repair.tar");
  const volumes = new Set<string>();
  const before = await repositorySnapshot(repository);
  let cleanupPassed = true;
  let install: RewindRunReceipt | null = null;
  let targetControl: RewindRunReceipt | null = null;
  const mutation: RewindRunReceipt[] = [];
  const repair: RewindRunReceipt[] = [];
  const setupMs: number[] = [];
  let integrityPassed = true;
  let targetArchiveBytes = 0;
  let rewindArchiveBytes = 0;
  let repairArchiveBytes = 0;
  let targetArchiveSha256: string | null = null;
  let rewindArchiveSha256: string | null = null;
  let repairArchiveSha256: string | null = null;
  let status: RewindExecutionStatus = "execution-error";

  try {
    await archive(repository, targetArchive, plan.targetCommit);
    await archive(repository, rewindArchive, plan.baseCommit, plan.sources.map(({ path }) => path));
    await archive(repository, repairArchive, plan.targetCommit, plan.sources.map(({ path }) => path));
    [targetArchiveBytes, rewindArchiveBytes, repairArchiveBytes] = await Promise.all([
      stat(targetArchive).then(({ size }) => size),
      stat(rewindArchive).then(({ size }) => size),
      stat(repairArchive).then(({ size }) => size),
    ]);
    const archiveHashes = await Promise.all(
      [targetArchive, rewindArchive, repairArchive].map(async (path) => rawSha256(await readFile(path))),
    );
    targetArchiveSha256 = archiveHashes[0]!;
    rewindArchiveSha256 = archiveHashes[1]!;
    repairArchiveSha256 = archiveHashes[2]!;
    if (rewindArchiveSha256 === repairArchiveSha256) throw new Error("Rewind and repair archives encode the same source state");

    const corepackVolume = await createVolume("c", volumes);
    const dependencyVolume = await createVolume("d", volumes);
    await seedArchive(dependencyVolume, targetArchive);
    if (plan.packageManager === "pnpm") await bootstrapPnpm(dependencyVolume, corepackVolume, plan.packageManagerVersion);
    install = publicReceipt(await runRegistered(dependencyVolume, corepackVolume, "bridge", plan.installArgv, 8 * 60_000));
    if (install.exitCode === 0 && !install.timedOut) {
      const target = await runState(dependencyVolume, corepackVolume, plan, "target", null, null, volumes);
      targetControl = target.receipt;
      setupMs.push(target.setupMs);
      integrityPassed &&= target.integrityPassed;
      if (targetControl.exitCode === 0 && !targetControl.timedOut) {
        for (let index = 0; index < 3; index += 1) {
          const run = await runState(dependencyVolume, corepackVolume, plan, "rewind", rewindArchive, null, volumes);
          mutation.push(run.receipt);
          setupMs.push(run.setupMs);
          integrityPassed &&= run.integrityPassed;
        }
        for (let index = 0; index < 3; index += 1) {
          const run = await runState(dependencyVolume, corepackVolume, plan, "repair", rewindArchive, repairArchive, volumes);
          repair.push(run.receipt);
          setupMs.push(run.setupMs);
          integrityPassed &&= run.integrityPassed;
        }
      }
    }
    if (install !== null && targetControl !== null && mutation.length === 3 && repair.length === 3) {
      const evidence: RewindRunEvidence = { install, targetControl, mutation, repair, integrityPassed };
      status = classifyRewindEvidence(evidence);
    } else if (install !== null && (install.timedOut || install.exitCode === null)) {
      status = "execution-error";
    } else {
      status = "target-control-failed";
    }
  } catch {
    status = "execution-error";
  } finally {
    for (const volume of [...volumes].reverse()) {
      if (!await removeVolume(volume)) cleanupPassed = false;
    }
    await rm(root, { recursive: true, force: true }).catch(() => { cleanupPassed = false; });
  }

  const productionInvariantPassed = before === await repositorySnapshot(repository);
  if (!cleanupPassed) status = "cleanup-failed";
  else if (!productionInvariantPassed || !integrityPassed) status = "integrity-failed";
  const core = {
    schemaVersion: 1 as const,
    compilerProtocol: "r7-rewind-v1" as const,
    internalPlanSha256: plan.internalPlanSha256,
    status,
    recoveryValid: status === "valid",
    probeValid: status === "valid",
    install,
    targetControl,
    mutation,
    repair,
    setupMs,
    targetArchiveSha256,
    rewindArchiveSha256,
    repairArchiveSha256,
    targetArchiveBytes,
    rewindArchiveBytes,
    repairArchiveBytes,
    productionInvariantPassed,
    cleanupPassed,
  };
  return { ...core, reportSha256: canonicalHash("r7-rewind-execution", core) };
}

async function runState(
  dependencyVolume: string,
  corepackVolume: string,
  plan: InternalRewindPlan,
  state: "target" | "rewind" | "repair",
  rewindArchive: string | null,
  repairArchive: string | null,
  volumes: Set<string>,
): Promise<StateRun> {
  const started = Date.now();
  const workspaceVolume = await createVolume("w", volumes);
  try {
    await cloneVolume(dependencyVolume, workspaceVolume);
    if (rewindArchive !== null) await seedArchive(workspaceVolume, rewindArchive);
    if (repairArchive !== null) await seedArchive(workspaceVolume, repairArchive);
    const expected = plan.sources.map(({ path, baseBlobSha1, targetBlobSha1 }) => [
      path,
      state === "rewind" ? baseBlobSha1 : targetBlobSha1,
    ]);
    const before = await verifySources(workspaceVolume, corepackVolume, expected);
    const setupMs = Date.now() - started;
    const result = await runRegistered(workspaceVolume, corepackVolume, "none", plan.testArgv, 8 * 60_000);
    const after = await verifySources(workspaceVolume, corepackVolume, expected);
    return {
      receipt: publicReceipt(result),
      setupMs,
      integrityPassed: before && after,
    };
  } finally {
    if (!await removeVolume(workspaceVolume)) throw new Error("Workspace volume cleanup failed");
    volumes.delete(workspaceVolume);
  }
}

async function bootstrapPnpm(workspaceVolume: string, corepackVolume: string, version: string): Promise<void> {
  const install = await runUtility(workspaceVolume, corepackVolume, "bridge", ["corepack", "install", "--global", `pnpm@${version}`], 2 * 60_000);
  if (install.exitCode !== 0) throw new Error("pnpm bootstrap failed");
  const mkdir = await runUtility(workspaceVolume, corepackVolume, "none", ["mkdir", "-p", "/work/.pureflow-bin"], 60_000);
  if (mkdir.exitCode !== 0) throw new Error("pnpm shim directory failed");
  const enable = await runUtility(workspaceVolume, corepackVolume, "none", ["corepack", "enable", "--install-directory", "/work/.pureflow-bin", "pnpm"], 60_000);
  if (enable.exitCode !== 0) throw new Error("pnpm shim failed");
}

async function verifySources(workspaceVolume: string, corepackVolume: string, expected: string[][]): Promise<boolean> {
  const pairs = expected.map(([path, oid]) => [`/work/${path}`, oid]);
  const result = await runUtility(workspaceVolume, corepackVolume, "none", ["node", "-e", verifyScript, JSON.stringify(pairs)], 60_000);
  return result.exitCode === 0 && !result.timedOut && result.stdout.toString("utf8") === "ok\n";
}

async function archive(repository: string, output: string, revision: string, paths: string[] = []): Promise<void> {
  await runFile("git", ["archive", "--format=tar", `--output=${output}`, revision, ...paths], {
    cwd: repository,
    windowsHide: true,
    env: hostEnvironment(),
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
}

async function seedArchive(volume: string, archivePath: string): Promise<void> {
  assertVolume(volume);
  if (/[\0\r\n,]/.test(archivePath)) throw new Error("Unsafe archive mount");
  const result = await runDocker([
    "container", "run", "--rm", "--name", containerName(),
    ...isolation("none", 256),
    "--mount", volumeMount(volume, "/work"),
    "--mount", `type=bind,src=${archivePath},dst=/source.tar,readonly`,
    "--entrypoint", "tar", R7_NODE_IMAGE, "-xf", "/source.tar", "-C", "/work",
  ], 60_000);
  if (result.exitCode !== 0) throw new Error("Archive seed failed");
}

async function cloneVolume(source: string, target: string): Promise<void> {
  assertVolume(source);
  assertVolume(target);
  const result = await runDocker([
    "container", "run", "--rm", "--name", containerName(),
    ...isolation("none", 256),
    "--mount", `${volumeMount(source, "/source")},readonly`,
    "--mount", volumeMount(target, "/work"),
    "--entrypoint", "cp", R7_NODE_IMAGE, "-a", "/source/.", "/work/",
  ], 4 * 60_000);
  if (result.exitCode !== 0) throw new Error("Dependency volume clone failed");
}

async function runRegistered(
  workspaceVolume: string,
  corepackVolume: string,
  network: "bridge" | "none",
  argv: string[],
  timeoutMs: number,
): Promise<RawReceipt> {
  if (!['npm', 'corepack'].includes(argv[0]!) || argv.length < 2) throw new Error("Unregistered audit executable");
  return runUtility(workspaceVolume, corepackVolume, network, argv, timeoutMs);
}

async function runUtility(
  workspaceVolume: string,
  corepackVolume: string,
  network: "bridge" | "none",
  argv: string[],
  timeoutMs: number,
): Promise<RawReceipt> {
  assertVolume(workspaceVolume);
  assertVolume(corepackVolume);
  if (!['npm', 'corepack', 'mkdir', 'node'].includes(argv[0]!) || argv.some((part) => !part || /[\0\r\n]/.test(part))) {
    throw new Error("Unsafe audit command");
  }
  return runDocker([
    "container", "run", "--rm", "--name", containerName(),
    ...isolation(network, 1024),
    "--mount", volumeMount(workspaceVolume, "/work"),
    "--mount", volumeMount(corepackVolume, "/corepack"),
    "--workdir", "/work",
    "--env", "CI=1",
    "--env", "HOME=/tmp",
    "--env", "COREPACK_HOME=/corepack",
    "--env", "COREPACK_ENABLE_PROJECT_SPEC=0",
    "--env", "PATH=/work/.pureflow-bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "--env", "npm_config_update_notifier=false",
    "--entrypoint", argv[0]!, R7_NODE_IMAGE, ...argv.slice(1),
  ], timeoutMs);
}

function isolation(network: "bridge" | "none", memoryMb: number): string[] {
  return [
    "--network", network,
    "--read-only",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--memory", `${memoryMb}m`,
    "--memory-swap", `${memoryMb}m`,
    "--cpus", "2",
    "--pids-limit", "512",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m",
  ];
}

async function runDocker(args: string[], timeoutMs: number): Promise<RawReceipt> {
  const started = Date.now();
  const nameIndex = args.indexOf("--name") + 1;
  const name = args[nameIndex];
  if (nameIndex === 0 || name === undefined || !/^pureflow-r7-audit-[0-9a-f]{24}$/.test(name)) throw new Error("Invalid audit container identity");
  try {
    const { stdout, stderr } = await runFile(dockerExecutable, args, {
      encoding: "buffer",
      windowsHide: true,
      env: dockerEnvironment(),
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      maxBuffer: 1024 * 1024,
    });
    return receipt(0, false, started, stdout, stderr);
  } catch (error) {
    const failure = error as Error & { code?: number | string; killed?: boolean; stdout?: Buffer; stderr?: Buffer };
    return receipt(typeof failure.code === "number" ? failure.code : null, Boolean(failure.killed), started, failure.stdout ?? Buffer.alloc(0), failure.stderr ?? Buffer.from(failure.message));
  } finally {
    await runFile(dockerExecutable, ["container", "rm", "--force", name], {
      windowsHide: true,
      env: dockerEnvironment(),
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    }).catch(() => undefined);
  }
}

function receipt(exitCode: number | null, timedOut: boolean, started: number, stdout: Buffer, stderr: Buffer): RawReceipt {
  return {
    exitCode,
    timedOut,
    durationMs: Date.now() - started,
    stdoutBytes: stdout.byteLength,
    stderrBytes: stderr.byteLength,
    stdoutSha256: rawSha256(stdout),
    stderrSha256: rawSha256(stderr),
    stdout,
    stderr,
  };
}

function publicReceipt(value: RawReceipt): RewindRunReceipt {
  const { stdout: _stdout, stderr: _stderr, ...publicValue } = value;
  return publicValue;
}

async function createVolume(kind: "c" | "d" | "w", volumes: Set<string>): Promise<string> {
  const name = `pureflow-r7-audit-${kind}-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  assertVolume(name);
  await runFile(dockerExecutable, ["volume", "create", name], {
    windowsHide: true,
    env: dockerEnvironment(),
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
  volumes.add(name);
  return name;
}

async function removeVolume(name: string): Promise<boolean> {
  assertVolume(name);
  try {
    await runFile(dockerExecutable, ["volume", "rm", "--force", name], {
      windowsHide: true,
      env: dockerEnvironment(),
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
    return true;
  } catch {
    return false;
  }
}

function assertVolume(value: string): void {
  if (!/^pureflow-r7-audit-[cdw]-[0-9a-f]{24}$/.test(value)) throw new Error("Invalid audit volume identity");
}

function volumeMount(source: string, target: string): string {
  return `type=volume,src=${source},dst=${target}`;
}

function containerName(): string {
  return `pureflow-r7-audit-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

async function repositorySnapshot(repository: string): Promise<string> {
  const [head, status] = await Promise.all([
    git(repository, ["rev-parse", "HEAD"]),
    git(repository, ["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  return rawSha256(`${head}\n${status}`);
}

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await runFile("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: hostEnvironment(),
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

function hostEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    LANG: "C",
    LC_ALL: "C",
  };
  for (const name of ["PATH", "Path", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "TMP", "TEMP"]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return env;
}

function dockerEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of ["PATH", "Path", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "DOCKER_HOST", "DOCKER_CONTEXT", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "TEMP", "TMP"]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return env;
}
