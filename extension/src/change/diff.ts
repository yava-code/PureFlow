import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { assertRelPath } from "../rnd/canonical";
import { assertGitOid } from "../agent/types";

const runFile = promisify(execFile);
const maxSourceBytes = 1024 * 1024;

export type RevisionChangeStatus = "added" | "modified" | "deleted" | "renamed";

export interface RevisionFileChange {
  status: RevisionChangeStatus;
  beforePath?: string;
  afterPath?: string;
  beforeText?: string;
  afterText?: string;
  beforeChangedLines: number[];
  afterChangedLines: number[];
}

export interface RevisionDiff {
  baseRevision: string;
  targetRevision: string;
  files: RevisionFileChange[];
}

export class GitRevisionDiffReader {
  async read(repository: string, baseRevision: string, targetRevision: string): Promise<RevisionDiff> {
    assertGitOid(baseRevision, "baseRevision");
    assertGitOid(targetRevision, "targetRevision");
    const root = resolve(repository);
    const [base, target] = await Promise.all([
      git(root, ["rev-parse", "--verify", `${baseRevision}^{commit}`]),
      git(root, ["rev-parse", "--verify", `${targetRevision}^{commit}`]),
    ]);
    if (base !== baseRevision || target !== targetRevision) throw new Error("Git revision identity changed during extraction");

    const status = await git(root, [
      "diff",
      "--name-status",
      "-z",
      "--find-renames=90%",
      "--no-ext-diff",
      baseRevision,
      targetRevision,
      "--",
    ], false);
    const entries = parseNameStatus(status);
    if (entries.length > 256) throw new Error("Revision diff exceeds 256 changed files");
    const files: RevisionFileChange[] = [];

    for (const entry of entries) {
      const paths = [entry.beforePath, entry.afterPath].filter((path): path is string => path !== undefined);
      const patch = await git(root, [
        "diff",
        "--unified=0",
        "--no-color",
        "--no-ext-diff",
        "--no-textconv",
        baseRevision,
        targetRevision,
        "--",
        ...paths,
      ], false);
      const lines = parseZeroContextPatch(patch);
      const [beforeText, afterText] = await Promise.all([
        entry.beforePath === undefined ? undefined : readRevisionFile(root, baseRevision, entry.beforePath),
        entry.afterPath === undefined ? undefined : readRevisionFile(root, targetRevision, entry.afterPath),
      ]);
      files.push({ ...entry, beforeText, afterText, beforeChangedLines: lines.before, afterChangedLines: lines.after });
    }

    files.sort((left, right) => Buffer.compare(
      Buffer.from(left.afterPath ?? left.beforePath!, "utf8"),
      Buffer.from(right.afterPath ?? right.beforePath!, "utf8"),
    ));
    return { baseRevision, targetRevision, files };
  }
}

export function parseZeroContextPatch(patch: string): { before: number[]; after: number[] } {
  const before = new Set<number>();
  const after = new Set<number>();
  let oldLine = 0;
  let newLine = 0;
  let inHunk = false;

  for (const line of patch.split(/\r?\n/)) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (header) {
      oldLine = Number(header[1]);
      newLine = Number(header[3]);
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;
    if (line.startsWith("diff --git ") || line.startsWith("@@ ")) {
      inHunk = false;
      continue;
    }
    if (line.startsWith("\\ No newline at end of file")) continue;
    if (line.startsWith("-")) {
      before.add(oldLine++);
      continue;
    }
    if (line.startsWith("+")) {
      after.add(newLine++);
      continue;
    }
    if (line.startsWith(" ")) {
      oldLine += 1;
      newLine += 1;
    }
  }

  return { before: [...before].sort((a, b) => a - b), after: [...after].sort((a, b) => a - b) };
}

function parseNameStatus(value: string): Array<Pick<RevisionFileChange, "status" | "beforePath" | "afterPath">> {
  if (value === "") return [];
  const tokens = value.split("\0");
  if (tokens.at(-1) === "") tokens.pop();
  const files: Array<Pick<RevisionFileChange, "status" | "beforePath" | "afterPath">> = [];

  for (let index = 0; index < tokens.length;) {
    const code = tokens[index++]!;
    if (/^R\d{1,3}$/.test(code)) {
      const beforePath = tokens[index++];
      const afterPath = tokens[index++];
      if (beforePath === undefined || afterPath === undefined) throw new Error("Malformed Git rename status");
      assertBoundedPath(beforePath);
      assertBoundedPath(afterPath);
      files.push({ status: "renamed", beforePath, afterPath });
      continue;
    }

    const path = tokens[index++];
    if (path === undefined) throw new Error("Malformed Git name status");
    assertBoundedPath(path);
    if (code === "A") files.push({ status: "added", afterPath: path });
    else if (code === "D") files.push({ status: "deleted", beforePath: path });
    else if (code === "M") files.push({ status: "modified", beforePath: path, afterPath: path });
    else throw new Error(`Unsupported Git change status: ${code}`);
  }
  return files;
}

async function readRevisionFile(root: string, revision: string, path: string): Promise<string> {
  const value = await git(root, ["show", `${revision}:${path}`], false);
  if (Buffer.byteLength(value, "utf8") > maxSourceBytes) throw new Error(`Changed source exceeds ${maxSourceBytes} bytes`);
  return value;
}

async function git(root: string, args: string[], trim = true): Promise<string> {
  const { stdout } = await runFile("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
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

function assertBoundedPath(path: string): void {
  assertRelPath(path);
  if (Buffer.byteLength(path, "utf8") > 1024) throw new Error("Changed path exceeds 1024 UTF-8 bytes");
}
