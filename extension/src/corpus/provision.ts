import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
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

export interface CorpusDockerInvocation {
  containerName: string;
  workspaceVolume: string;
  corepackVolume: string;
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
  assertVolume(invocation.workspaceVolume);
  assertVolume(invocation.corepackVolume);
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
    "--mount", volumeMount(invocation.workspaceVolume, "/work"),
    "--mount", volumeMount(invocation.corepackVolume, "/corepack"),
    "--workdir", "/work",
    "--env", "CI=1",
    "--env", "HOME=/tmp",
    "--env", "COREPACK_HOME=/corepack",
    "--env", "COREPACK_ENABLE_PROJECT_SPEC=0",
    "--env", "PATH=/work/.pureflow-bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
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
  const corepackVolume = volumeName("c");
  await createVolume(corepackVolume);
  try {
    const base = await provisionRevision(repository, root, "base", draft.baseCommit, registration, corepackVolume);
    const target = await provisionRevision(repository, root, "target", draft.targetCommit, registration, corepackVolume);
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
    await removeVolume(corepackVolume);
    await rm(root, { recursive: true, force: true });
  }
}

async function provisionRevision(
  repository: string,
  root: string,
  label: "base" | "target",
  revision: string,
  registration: RepositoryRegistration,
  corepackVolume: string,
): Promise<{ bootstrap: CommandReceipt[]; install: CommandReceipt; test: CommandReceipt | null }> {
  const archive = join(root, `${label}.tar`);
  await runFile("git", ["archive", "--format=tar", `--output=${archive}`, revision], {
    cwd: repository,
    windowsHide: true,
    env: hostEnvironment(),
    maxBuffer: 1024 * 1024,
  });
  const workspaceVolume = volumeName("w");
  await createVolume(workspaceVolume);
  try {
    await seedVolume(workspaceVolume, archive);
    const bootstrap: CommandReceipt[] = [];
    if (registration.packageManager === "pnpm") {
      bootstrap.push(await runDocker({
        containerName: containerName(),
        workspaceVolume,
        corepackVolume,
        network: "bridge",
        argv: ["corepack", "install", "--global", `pnpm@${registration.packageManagerVersion}`],
      }, 2 * 60_000));
      if (bootstrap[0]!.exitCode === 0) {
        bootstrap.push(await runDocker({
          containerName: containerName(),
          workspaceVolume,
          corepackVolume,
          network: "none",
          argv: ["corepack", "enable", "--install-directory", "/work/.pureflow-bin", "pnpm"],
        }, 60_000));
      }
    }
    const bootstrapPassed = bootstrap.every(({ exitCode }) => exitCode === 0) &&
      (registration.packageManager !== "pnpm" || bootstrap.length === 2);
    const install = bootstrapPassed ? await runDocker({
      containerName: containerName(),
      workspaceVolume,
      corepackVolume,
      network: "bridge",
      argv: registration.installArgv,
    }, 8 * 60_000) : failedPrerequisite();
    const test = install.exitCode === 0
      ? await runDocker({
          containerName: containerName(),
          workspaceVolume,
          corepackVolume,
          network: "none",
          argv: registration.testArgv,
        }, 8 * 60_000)
      : null;
    return { bootstrap, install, test };
  } finally {
    await removeVolume(workspaceVolume);
  }
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

function failedPrerequisite(): CommandReceipt {
  const empty = Buffer.alloc(0);
  return receipt(null, false, Date.now(), empty, Buffer.from("controller bootstrap failed"));
}

function containerName(): string {
  return `pureflow-r7-corpus-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

function volumeMount(source: string, target: string): string {
  return `type=volume,src=${source},dst=${target}`;
}

function assertVolume(value: string): void {
  if (!/^pureflow-r7-corpus-[cw]-[0-9a-f]{24}$/.test(value)) throw new Error("Unsafe corpus volume mount");
}

function volumeName(kind: "c" | "w"): string {
  return `pureflow-r7-corpus-${kind}-${randomUUID().replaceAll("-", "").slice(0, 24)}`;
}

async function createVolume(name: string): Promise<void> {
  assertVolume(name);
  await runFile(dockerExecutable, ["volume", "create", name], {
    windowsHide: true,
    env: dockerEnvironment(),
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  });
}

async function removeVolume(name: string): Promise<void> {
  assertVolume(name);
  await runFile(dockerExecutable, ["volume", "rm", "--force", name], {
    windowsHide: true,
    env: dockerEnvironment(),
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  }).catch(() => undefined);
}

async function seedVolume(volume: string, archive: string): Promise<void> {
  assertVolume(volume);
  if (/[,\0\r\n]/.test(archive)) throw new Error("Unsafe corpus archive mount");
  const args = [
    "container", "run", "--rm", "--name", containerName(),
    "--network", "none", "--read-only",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--memory", "256m", "--memory-swap", "256m", "--cpus", "1", "--pids-limit", "64",
    "--mount", volumeMount(volume, "/work"),
    "--mount", `type=bind,src=${archive},dst=/source.tar,readonly`,
    "--entrypoint", "tar", R7_NODE_IMAGE, "-xf", "/source.tar", "-C", "/work",
  ];
  await runFile(dockerExecutable, args, {
    windowsHide: true,
    env: dockerEnvironment(),
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
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
