import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { GitRevisionDiffReader } from "../change/diff";
import { extractChangedSymbols } from "../change/symbols";
import type { RepositoryRegistration } from "../corpus/freeze";
import type { CandidatePreflight } from "../corpus/scan";
import { compareUtf8 } from "../rnd/canonical";
import { compileRewindPlan, type RewindCompileResult, type RewindSemanticRef } from "./rewind-plan";

const runFile = promisify(execFile);

export interface RewindPatch {
  repositoryId: string;
  ordinal: number;
  baseCommit: string;
  targetCommit: string;
  evidenceSha256: string;
  cohort: "development" | "held-out";
}

export async function prepareRewindPlan(
  repositoryPath: string,
  corpusManifestSha256: string,
  patch: RewindPatch,
  registration: RepositoryRegistration,
  preflight: CandidatePreflight,
): Promise<RewindCompileResult> {
  assertBindings(patch, registration, preflight);
  const root = resolve(repositoryPath);
  const pinned = await git(root, ["rev-parse", "--verify", `${registration.pinnedTip}^{commit}`]);
  if (pinned !== registration.pinnedTip) throw new Error("Registered repository tip is unavailable");
  const sources = await Promise.all(preflight.changedSourcePaths.map(async (path) => ({
    path,
    baseBlobSha1: await blobOid(root, patch.baseCommit, path),
    targetBlobSha1: await blobOid(root, patch.targetCommit, path),
  })));
  const diff = await new GitRevisionDiffReader().read(root, patch.baseCommit, patch.targetCommit);
  const sourcePaths = new Set(preflight.changedSourcePaths);
  const units = diff.files
    .filter((file) => sourcePaths.has(file.afterPath ?? file.beforePath ?? ""))
    .flatMap((file) => extractChangedSymbols(file).units)
    .sort((left, right) =>
      compareUtf8(left.path, right.path) || compareUtf8(left.symbol, right.symbol) || compareUtf8(left.kind, right.kind),
    );
  const semantic: RewindSemanticRef | null = units[0] === undefined ? null : {
    path: units[0].path,
    symbol: units[0].symbol,
    kind: units[0].kind,
    changedLineSha256: [...units[0].changedLineSha256],
  };
  return compileRewindPlan({
    corpusManifestSha256,
    patchEvidenceSha256: patch.evidenceSha256,
    repositoryId: patch.repositoryId,
    ordinal: patch.ordinal,
    baseCommit: patch.baseCommit,
    targetCommit: patch.targetCommit,
    nodeVersion: registration.nodeVersion,
    packageManager: registration.packageManager,
    packageManagerVersion: registration.packageManagerVersion,
    installArgv: [...registration.installArgv],
    testArgv: [...registration.testArgv],
    sources,
    attributedTestPaths: [...preflight.changedTestPaths],
    semantic,
  });
}

function assertBindings(patch: RewindPatch, registration: RepositoryRegistration, preflight: CandidatePreflight): void {
  if (
    patch.repositoryId !== registration.repositoryId ||
    patch.repositoryId !== preflight.repositoryId ||
    patch.ordinal !== preflight.ordinal ||
    patch.baseCommit !== preflight.baseCommit ||
    patch.targetCommit !== preflight.targetCommit
  ) {
    throw new Error("Corpus patch, registration, and preflight identity differ");
  }
}

async function blobOid(root: string, revision: string, path: string): Promise<string | null> {
  try {
    const oid = await git(root, ["rev-parse", `${revision}:${path}`]);
    const type = await git(root, ["cat-file", "-t", oid]);
    return type === "blob" && /^[0-9a-f]{40}$/.test(oid) ? oid : null;
  } catch {
    return null;
  }
}

async function git(root: string, args: string[]): Promise<string> {
  const { stdout } = await runFile("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: gitEnvironment(),
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout.trim();
}

function gitEnvironment(): NodeJS.ProcessEnv {
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
