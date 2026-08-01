import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { GitRevisionDiffReader } from "../change/diff";
import { extractChangedSymbols } from "../change/symbols";
import { canonicalHash, canonicalJson, compareUtf8, rawSha256 } from "../rnd/canonical";
import { validateRepositoryRegistration, type CandidateFacts, type RepositoryRegistration } from "./freeze";

const runFile = promisify(execFile);
const lockfiles = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"] as const;

export interface CandidatePreflight {
  schemaVersion: 1;
  repositoryId: string;
  ordinal: number;
  baseCommit: string;
  targetCommit: string;
  adjacentFirstParent: boolean;
  licenseApproved: boolean;
  lockfilePresent: boolean;
  dependencyOrLockfileChanged: boolean;
  unsupportedArtifactPresent: boolean;
  changedLines: number;
  sourceTreeBytes: number;
  supportedTypescriptBoundary: boolean;
  hasAttributedTest: boolean;
  changedSourcePaths: string[];
  changedTestPaths: string[];
  preflightSha256: string;
}

export interface ProvisionEvidence {
  schemaVersion: 1;
  sanitizedBytes: number;
  requiresProductionCapability: boolean;
  executionNeedsNetwork: boolean;
  baseInstallPassed?: boolean;
  baseTestPassed?: boolean;
  targetInstallPassed?: boolean;
  targetTestPassed?: boolean;
  basePassed: boolean;
  targetPassed: boolean;
  provisionEvidenceSha256: string;
}

const provisionKeys = [
  "schemaVersion",
  "sanitizedBytes",
  "requiresProductionCapability",
  "executionNeedsNetwork",
  "basePassed",
  "targetPassed",
  "provisionEvidenceSha256",
] as const;

const diagnosticProvisionKeys = [
  ...provisionKeys,
  "baseInstallPassed",
  "baseTestPassed",
  "targetInstallPassed",
  "targetTestPassed",
] as const;

export function isCoarseCandidate(paths: readonly string[]): boolean {
  return paths.some(isSourcePath) && paths.some(isTestPath);
}

export async function scanRepository(
  repositoryPath: string,
  registration: RepositoryRegistration,
): Promise<CandidatePreflight[]> {
  validateRepositoryRegistration(registration);
  const root = resolve(repositoryPath);
  const pinnedTip = await git(root, ["rev-parse", "--verify", `${registration.pinnedTip}^{commit}`]);
  if (pinnedTip !== registration.pinnedTip) throw new Error("Pinned repository tip is unavailable or changed");
  if (registration.candidateHistoryArgv[0] !== "git") throw new Error("Candidate history executable must be git");

  const history = (await git(root, registration.candidateHistoryArgv.slice(1)))
    .split(/\r?\n/)
    .filter(Boolean);
  if (history[0] !== registration.pinnedTip) throw new Error("Candidate history does not start at the pinned tip");

  const drafts: CandidatePreflight[] = [];
  let ordinal = 0;
  for (const targetCommit of history) {
    const parents = (await git(root, ["rev-list", "--parents", "-n", "1", targetCommit])).split(" ");
    if (parents.length < 2) continue;
    const baseCommit = parents[1]!;
    const paths = splitNul(await git(root, ["diff", "--name-only", "-z", baseCommit, targetCommit], false));
    if (!isCoarseCandidate(paths)) continue;
    ordinal += 1;
    if (ordinal > 60) break;
    drafts.push(await inspectCandidate(root, registration.repositoryId, approvedLicense(registration.licenseSpdx), ordinal, baseCommit, targetCommit, parents, paths));
  }
  return drafts;
}

export function completeCandidate(draft: CandidatePreflight, evidence: ProvisionEvidence): CandidateFacts {
  if (!hasExactKeys(evidence, provisionKeys) && !hasExactKeys(evidence, diagnosticProvisionKeys)) {
    throw new Error("provision evidence contains unknown or missing fields");
  }
  if (evidence.schemaVersion !== 1) throw new Error("Unsupported provision evidence schema");
  if (!Number.isSafeInteger(evidence.sanitizedBytes) || evidence.sanitizedBytes < 0) throw new Error("Invalid sanitizedBytes");
  assertSha256(evidence.provisionEvidenceSha256, "provisionEvidenceSha256");
  const facts = {
    schemaVersion: 1 as const,
    repositoryId: draft.repositoryId,
    ordinal: draft.ordinal,
    baseCommit: draft.baseCommit,
    targetCommit: draft.targetCommit,
    adjacentFirstParent: draft.adjacentFirstParent,
    licenseApproved: draft.licenseApproved,
    lockfilePresent: draft.lockfilePresent,
    dependencyOrLockfileChanged: draft.dependencyOrLockfileChanged,
    unsupportedArtifactPresent: draft.unsupportedArtifactPresent,
    changedLines: draft.changedLines,
    sanitizedBytes: evidence.sanitizedBytes,
    supportedTypescriptBoundary: draft.supportedTypescriptBoundary,
    hasAttributedTest: draft.hasAttributedTest,
    requiresProductionCapability: evidence.requiresProductionCapability,
    executionNeedsNetwork: evidence.executionNeedsNetwork,
    basePassed: evidence.basePassed,
    targetPassed: evidence.targetPassed,
  };
  return {
    ...facts,
    evidenceSha256: rawSha256(`pureflow/r7-candidate-evidence-v1\n${canonicalJson({
      facts,
      preflightSha256: draft.preflightSha256,
      provisionEvidenceSha256: evidence.provisionEvidenceSha256,
    })}`),
  };
}

export function deferCandidate(draft: CandidatePreflight): CandidateFacts {
  const facts = {
    schemaVersion: 1 as const,
    repositoryId: draft.repositoryId,
    ordinal: draft.ordinal,
    baseCommit: draft.baseCommit,
    targetCommit: draft.targetCommit,
    adjacentFirstParent: draft.adjacentFirstParent,
    licenseApproved: draft.licenseApproved,
    lockfilePresent: draft.lockfilePresent,
    dependencyOrLockfileChanged: draft.dependencyOrLockfileChanged,
    unsupportedArtifactPresent: draft.unsupportedArtifactPresent,
    changedLines: draft.changedLines,
    sanitizedBytes: draft.sourceTreeBytes,
    supportedTypescriptBoundary: draft.supportedTypescriptBoundary,
    hasAttributedTest: draft.hasAttributedTest,
    requiresProductionCapability: null,
    executionNeedsNetwork: null,
    basePassed: null,
    targetPassed: null,
  };
  return {
    ...facts,
    evidenceSha256: rawSha256(`pureflow/r7-candidate-evidence-v1\n${canonicalJson({
      facts,
      preflightSha256: draft.preflightSha256,
      provisionEvidenceSha256: null,
    })}`),
  };
}

async function inspectCandidate(
  root: string,
  repositoryId: string,
  licenseApproved: boolean,
  ordinal: number,
  baseCommit: string,
  targetCommit: string,
  parents: string[],
  paths: string[],
): Promise<CandidatePreflight> {
  const changedSourcePaths = paths.filter(isSourcePath).sort(compareUtf8);
  const changedTestPaths = paths.filter(isTestPath).sort(compareUtf8);
  const [baseTree, targetTree, numstat, baseLocks, targetLocks] = await Promise.all([
    inspectTree(root, baseCommit),
    inspectTree(root, targetCommit),
    git(root, ["diff", "--numstat", baseCommit, targetCommit], false),
    existingLockfiles(root, baseCommit),
    existingLockfiles(root, targetCommit),
  ]);
  const sharedLocks = baseLocks.filter((path) => targetLocks.includes(path));
  const dependencyOrLockfileChanged = paths.some((path) => path === "package.json" || lockfiles.includes(path as typeof lockfiles[number]));
  const stats = parseNumstat(numstat);
  let supportedTypescriptBoundary = false;
  let hasAttributedTest = false;
  let extractionFailed = false;

  try {
    const diff = await new GitRevisionDiffReader().read(root, baseCommit, targetCommit);
    const units = diff.files
      .filter((file) => isSourcePath(file.afterPath ?? file.beforePath ?? ""))
      .flatMap((file) => extractChangedSymbols(file).units);
    supportedTypescriptBoundary = units.length > 0;
    const symbols = [...new Set(units.map(({ symbol }) => symbol.split(".").at(-1)!).filter((symbol) => symbol !== "<module>"))];
    const tests = diff.files.filter((file) => isTestPath(file.afterPath ?? file.beforePath ?? ""));
    hasAttributedTest = tests.some((file) => {
      const text = `${file.beforeText ?? ""}\n${file.afterText ?? ""}`;
      return symbols.some((symbol) => new RegExp(`\\b${escapeRegex(symbol)}\\b`).test(text)) ||
        changedSourcePaths.some((path) => text.includes(sourceStem(path)));
    });
  } catch {
    extractionFailed = true;
  }

  const draft = {
    schemaVersion: 1 as const,
    repositoryId,
    ordinal,
    baseCommit,
    targetCommit,
    adjacentFirstParent: parents[0] === targetCommit && parents[1] === baseCommit,
    licenseApproved,
    lockfilePresent: sharedLocks.length > 0,
    dependencyOrLockfileChanged,
    unsupportedArtifactPresent: extractionFailed || stats.binary || baseTree.unsupported || targetTree.unsupported,
    changedLines: stats.changedLines,
    sourceTreeBytes: targetTree.bytes,
    supportedTypescriptBoundary,
    hasAttributedTest,
    changedSourcePaths,
    changedTestPaths,
  };
  return {
    ...draft,
    preflightSha256: canonicalHash("r7-candidate-preflight", draft),
  };
}

async function inspectTree(root: string, revision: string): Promise<{ bytes: number; unsupported: boolean }> {
  const records = splitNul(await git(root, ["ls-tree", "-r", "-l", "-z", revision], false));
  let bytes = 0;
  let unsupported = false;
  for (const record of records) {
    const match = /^(\d{6}) (\w+) ([0-9a-f]+)\s+(-|\d+)\t([\s\S]+)$/.exec(record);
    if (!match) throw new Error("Malformed Git tree record");
    const [, mode, type, , size, path] = match;
    if (type !== "blob" || mode === "120000" || mode === "160000") unsupported = true;
    if (size !== "-") bytes += Number(size);
    if (isUnsupportedPath(path!)) unsupported = true;
    if (isSnapshotPath(path!) && size !== "-" && Number(size) > 1024 * 1024) unsupported = true;
  }
  if (!Number.isSafeInteger(bytes)) throw new Error("Repository tree size exceeds safe integer range");
  return { bytes, unsupported };
}

async function existingLockfiles(root: string, revision: string): Promise<string[]> {
  const result: string[] = [];
  for (const path of lockfiles) {
    if (await gitObjectExists(root, `${revision}:${path}`)) result.push(path);
  }
  return result;
}

async function gitObjectExists(root: string, spec: string): Promise<boolean> {
  try {
    await runFile("git", ["cat-file", "-e", spec], { cwd: root, windowsHide: true, env: gitEnvironment() });
    return true;
  } catch {
    return false;
  }
}

function parseNumstat(value: string): { changedLines: number; binary: boolean } {
  let changedLines = 0;
  let binary = false;
  for (const line of value.split(/\r?\n/).filter(Boolean)) {
    const [added, deleted] = line.split("\t", 3);
    if (added === "-" || deleted === "-") {
      binary = true;
      continue;
    }
    const count = Number(added) + Number(deleted);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Malformed Git numstat");
    changedLines += count;
  }
  return { changedLines, binary };
}

function isSourcePath(path: string): boolean {
  return /\.(?:ts|tsx)$/.test(path) && !path.endsWith(".d.ts") && !isTestPath(path) && !isUnsupportedPath(path);
}

function isTestPath(path: string): boolean {
  return /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)/i.test(path) || /\.(?:test|spec)\.(?:ts|tsx)$/.test(path);
}

function isUnsupportedPath(path: string): boolean {
  return /(?:^|\/)(?:node_modules|vendor|vendors|dist|build|generated|coverage)(?:\/|$)/i.test(path);
}

function isSnapshotPath(path: string): boolean {
  return /(?:^|\/)(?:__snapshots__)(?:\/|$)/i.test(path) || /\.snap$/i.test(path);
}

function approvedLicense(value: string): boolean {
  return ["0BSD", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "MIT"].includes(value);
}

function sourceStem(path: string): string {
  return path.split("/").at(-1)!.replace(/\.(?:ts|tsx)$/, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitNul(value: string): string[] {
  const records = value.split("\0");
  if (records.at(-1) === "") records.pop();
  return records;
}

async function git(root: string, args: string[], trim = true): Promise<string> {
  const { stdout } = await runFile("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
    env: gitEnvironment(),
  });
  return trim ? stdout.trim() : stdout;
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

function assertSha256(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${label} must be lowercase SHA-256`);
}

function assertExactKeys(value: object, allowed: readonly string[], label: string): void {
  const expected = new Set(allowed);
  const actual = Reflect.ownKeys(value);
  if (actual.length !== expected.size || actual.some((key) => typeof key !== "string" || !expected.has(key))) {
    throw new Error(`${label} contains unknown or missing fields`);
  }
}

function hasExactKeys(value: object, allowed: readonly string[]): boolean {
  const expected = new Set(allowed);
  const actual = Reflect.ownKeys(value);
  return actual.length === expected.size && actual.every((key) => typeof key === "string" && expected.has(key));
}
