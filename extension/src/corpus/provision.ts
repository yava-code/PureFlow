import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { canonicalJson, rawSha256 } from "../rnd/canonical";
import { R7_NODE_IMAGE } from "../sandbox/toolchains";
import type { RepositoryRegistration } from "./freeze";
import type { CandidatePreflight, ProvisionEvidence } from "./scan";

const runFile = promisify(execFile);
const dockerExecutable = process.platform === "win32"
  ? "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"
  : "/usr/bin/docker";
const tarExecutable = process.platform === "win32" ? "C:\\Windows\\System32\\tar.exe" : "/usr/bin/tar";

export interface CorpusDockerInvocation {
  containerName: string;
  workspace: string;
  corepackHome: string;
  network: "bridge" | "none";
  argv: string[];
}

interface CommandReceipt {
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutSha256: string;
  stderrSha256: string;
}

export function selectProvisionCandidates(drafts: readonly CandidatePreflight[]): CandidatePreflight[] {
  const ordered = [...drafts].sort((left, right) => left.ordinal - right.ordinal);
  const selected: CandidatePreflight[] = [];
  for (const draft of ordered) {
    if (selected.length === 10) break;
    if (
      draft.adjacentFirstParent &&
      draft.licenseApproved &&
      draft.lockfilePresent &&
      !draft.dependencyOrLockfileChanged &&
      !draft.unsupportedArtifactPresent &&
      draft.changedLines <= 500 &&
      draft.sourceTreeBytes <= 25 * 1024 * 1024 &&
      draft.supportedTypescriptBoundary &&
      draft.hasAttributedTest
    ) {
      selected.push(structuredClone(draft));
    }
  }
  return selected;
}

export function buildCorpusDockerArgs(invocation: CorpusDockerInvocation): string[] {
  if (!/^pureflow-r7-corpus-[0-9a-f]{24}$/.test(invocation.containerName)) throw new Error("Invalid corpus container name");
  if (invocation.network !== "bridge" && invocation.network !== "none") throw new Error("Invalid corpus network mode");
  assertMount(invocation.workspace);
  assertMount(invocation.corepackHome);
  if (invocation.argv.length < 2 || !["npm", "corepack"].includes(invocation.argv[0]!)) {
    throw new Error("Corpus executable is not registered");
  }
  if (invocation.argv.some((part) => !part || /[\0\r\n]/.test(part))) throw new Error("Invalid corpus argument");

  return [
    "container", "run", "--rm", "--name", invocation.containerName,
    "--network", invocation.network,
    "--read-only",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--memory", "1g",
    "--memory-swap", "1g",
    "--cpus", "2",
    "--pids-limit", "512",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m",
    "--mount", bindMount(invocation.workspace, "/work"),
    "--mount", bindMount(invocation.corepackHome, "/corepack"),
    "--workdir", "/work",
    "--env", "CI=1",
    "--env", "HOME=/tmp",
    "--env", "COREPACK_HOME=/corepack",
    "--env", "npm_config_update_notifier=false",
    "--entrypoint", invocation.argv[0]!,
    R7_NODE_IMAGE,
    ...invocation.argv.slice(1),
  ];
}

export async function provisionRepository(
  repositoryPath: string,
  registration: RepositoryRegistration,
  drafts: readonly CandidatePreflight[],
): Promise<Record<string, ProvisionEvidence>> {
  const selected = selectProvisionCandidates(drafts);
  const evidence: Record<string, ProvisionEvidence> = {};
  for (let offset = 0; offset < selected.length; offset += 3) {
    const batch = selected.slice(offset, offset + 3);
    const results = await Promise.all(batch.map(async (draft) => ({
      targetCommit: draft.targetCommit,
      evidence: await provisionCandidate(resolve(repositoryPath), registration, draft),
    })));
    for (const result of results) evidence[result.targetCommit] = result.evidence;
  }
  return evidence;
}

async function provisionCandidate(
  repository: string,
  registration: RepositoryRegistration,
  draft: CandidatePreflight,
): Promise<ProvisionEvidence> {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r7-provision-"));
  const corepackHome = join(root, "corepack");
  await mkdir(corepackHome);
  try {
    const base = await provisionRevision(repository, root, "base", draft.baseCommit, registration, corepackHome);
    const target = await provisionRevision(repository, root, "target", draft.targetCommit, registration, corepackHome);
    const record = {
      schemaVersion: 1,
      image: R7_NODE_IMAGE,
      repositoryId: draft.repositoryId,
      baseCommit: draft.baseCommit,
      targetCommit: draft.targetCommit,
      nodeVersion: registration.nodeVersion,
      packageManager: registration.packageManager,
      packageManagerVersion: registration.packageManagerVersion,
      installArgv: registration.installArgv,
      testArgv: registration.testArgv,
      base,
      target,
    };
    return {
      schemaVersion: 1,
      sanitizedBytes: draft.sourceTreeBytes,
      requiresProductionCapability: false,
      executionNeedsNetwork: false,
      basePassed: base.install.exitCode === 0 && base.test?.exitCode === 0,
      targetPassed: target.install.exitCode === 0 && target.test?.exitCode === 0,
      provisionEvidenceSha256: rawSha256(`pureflow/r7-provision-evidence-v1\n${canonicalJson(record)}`),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function provisionRevision(
  repository: string,
  root: string,
  label: "base" | "target",
  revision: string,
  registration: RepositoryRegistration,
  corepackHome: string,
): Promise<{ install: CommandReceipt; test: CommandReceipt | null }> {
  const workspace = join(root, label);
  const archive = join(root, `${label}.tar`);
  await mkdir(workspace);
  await runFile("git", ["archive", "--format=tar", `--output=${archive}`, revision], {
    cwd: repository,
    windowsHide: true,
    env: hostEnvironment(),
    maxBuffer: 1024 * 1024,
  });
  await runFile(tarExecutable, ["-xf", archive, "-C", workspace], {
    windowsHide: true,
    env: hostEnvironment(),
    maxBuffer: 1024 * 1024,
  });
  const install = await runDocker({
    containerName: containerName(),
    workspace,
    corepackHome,
    network: "bridge",
    argv: registration.installArgv,
  }, 8 * 60_000);
  const test = install.exitCode === 0
    ? await runDocker({
        containerName: containerName(),
        workspace,
        corepackHome,
        network: "none",
        argv: registration.testArgv,
      }, 8 * 60_000)
    : null;
  return { install, test };
}

async function runDocker(invocation: CorpusDockerInvocation, timeoutMs: number): Promise<CommandReceipt> {
  const started = Date.now();
  try {
    const { stdout, stderr } = await runFile(dockerExecutable, buildCorpusDockerArgs(invocation), {
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
    const exitCode = typeof failure.code === "number" ? failure.code : null;
    return receipt(exitCode, Boolean(failure.killed), started, failure.stdout ?? Buffer.alloc(0), failure.stderr ?? Buffer.from(failure.message));
  }
}

function receipt(exitCode: number | null, timedOut: boolean, started: number, stdout: Buffer, stderr: Buffer): CommandReceipt {
  return {
    exitCode,
    timedOut,
    durationMs: Date.now() - started,
    stdoutBytes: stdout.byteLength,
    stderrBytes: stderr.byteLength,
    stdoutSha256: rawSha256(stdout),
    stderrSha256: rawSha256(stderr),
  };
}

function containerName(): string {
  return `pureflow-r7-corpus-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

function bindMount(source: string, target: string): string {
  return `type=bind,src=${source},dst=${target}`;
}

function assertMount(path: string): void {
  if (!resolve(path) || /[,\0\r\n]/.test(path)) throw new Error("Unsafe corpus mount path");
}

function hostEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
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
  for (const name of ["SystemRoot", "WINDIR"]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return env;
}
