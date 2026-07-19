import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  MonadProjectError,
  type MonadProjectScan,
  type MonadProjectScanOptions,
  type ProjectEntry,
  type ProjectEvidence,
  type ProjectReader,
  type ProjectScanIssue,
  type ProjectTechnology,
} from "./types";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vscode-test",
  "artifacts",
  "build",
  "cache",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "release",
]);

const defaultReader: ProjectReader = {
  async readDirectory(location) {
    const entries = await readdir(location, { withFileTypes: true });
    return entries.map((entry): ProjectEntry => ({
      name: entry.name,
      kind: entry.isFile() ? "file" : entry.isDirectory() ? "directory" : "other",
    }));
  },
  readFile(location) {
    return readFile(location, "utf8");
  },
};

const hardhatConfig = /^hardhat\.config\.(?:[cm]?[jt]s)$/i;
const wagmiConfig = /^wagmi\.config\.(?:[cm]?[jt]s)$/i;
const monadSignal = /monadTestnet|monad-testnet|testnet-rpc\.monad\.xyz|chainId\s*[:=]\s*10_?143|0x279f/i;

interface PackageManifest {
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
  optionalDependencies?: Record<string, unknown>;
}

export async function scanMonadProject(
  workspaceRoot: string,
  options: MonadProjectScanOptions = {},
): Promise<MonadProjectScan> {
  if (!workspaceRoot.trim()) {
    throw new MonadProjectError("invalid-root", workspaceRoot, "Project root cannot be empty.");
  }

  const root = resolve(workspaceRoot);
  const reader = options.reader ?? defaultReader;
  const maxDepth = boundedInteger(options.maxDepth, 8, 0, 20);
  const maxFiles = boundedInteger(options.maxFiles, 5_000, 1, 50_000);
  const evidence: ProjectEvidence[] = [];
  const evidenceKeys = new Set<string>();
  const issues: ProjectScanIssue[] = [];
  const issueKeys = new Set<string>();
  const solidityFiles: string[] = [];
  const packageFiles: string[] = [];
  const configFiles: string[] = [];
  const monadConfigFiles: string[] = [];
  let filesScanned = 0;
  let truncated = false;
  let stopped = false;

  const addEvidence = (technology: ProjectTechnology, path: string, reason: string) => {
    const key = `${technology}\0${path}\0${reason}`;
    if (evidenceKeys.has(key)) return;
    evidenceKeys.add(key);
    evidence.push({ technology, path, reason });
  };

  const addIssue = (issue: ProjectScanIssue) => {
    const key = `${issue.code}\0${issue.path}`;
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push(issue);
  };

  const readConfig = async (absolute: string, relative: string) => {
    let content: string;
    try {
      content = await reader.readFile(absolute);
    } catch {
      addIssue({ code: "unreadable-file", path: relative, message: "Could not read project configuration." });
      return;
    }
    if (monadSignal.test(content)) monadConfigFiles.push(relative);
  };

  const readPackage = async (absolute: string, relative: string) => {
    let manifest: PackageManifest;
    try {
      manifest = JSON.parse(await reader.readFile(absolute)) as PackageManifest;
    } catch {
      addIssue({ code: "invalid-package-json", path: relative, message: "Could not parse package.json." });
      return;
    }
    const names = new Set(
      [
        manifest.dependencies,
        manifest.devDependencies,
        manifest.peerDependencies,
        manifest.optionalDependencies,
      ].flatMap((group) => (group && typeof group === "object" ? Object.keys(group) : [])),
    );
    if (names.has("hardhat")) addEvidence("hardhat", relative, "Hardhat package dependency");
    if (names.has("wagmi")) addEvidence("wagmi", relative, "wagmi package dependency");
    if (names.has("viem")) addEvidence("viem", relative, "viem package dependency");
    if (names.has("solc")) addEvidence("solidity", relative, "Solidity compiler dependency");
  };

  const walk = async (absolute: string, relativeDirectory: string, depth: number, isRoot = false): Promise<void> => {
    if (stopped) return;
    let entries: readonly ProjectEntry[];
    try {
      entries = await reader.readDirectory(absolute);
    } catch (error) {
      if (isRoot) {
        throw new MonadProjectError(
          "root-unreadable",
          root,
          "Could not read the project root.",
          { cause: error },
        );
      }
      addIssue({
        code: "unreadable-directory",
        path: relativeDirectory || ".",
        message: "Could not read this project directory.",
      });
      return;
    }

    const sorted = [...entries]
      .filter((entry) => validEntryName(entry.name))
      .sort((left, right) => compareText(left.name, right.name));

    for (const entry of sorted) {
      if (stopped) return;
      const relative = toProjectPath(relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name);
      const child = join(absolute, entry.name);
      if (entry.kind === "directory") {
        if (ignoredDirectories.has(entry.name.toLowerCase())) continue;
        if (depth >= maxDepth) {
          truncated = true;
          addIssue({ code: "scan-limit", path: relative, message: `Skipped directories deeper than ${maxDepth}.` });
          continue;
        }
        await walk(child, relative, depth + 1);
        continue;
      }
      if (entry.kind !== "file") continue;
      if (filesScanned >= maxFiles) {
        truncated = true;
        stopped = true;
        addIssue({ code: "scan-limit", path: relative, message: `Stopped after scanning ${maxFiles} files.` });
        return;
      }
      filesScanned++;

      const lower = entry.name.toLowerCase();
      if (lower.endsWith(".sol")) {
        solidityFiles.push(relative);
        addEvidence("solidity", relative, "Solidity source file");
      }
      if (hardhatConfig.test(entry.name)) {
        configFiles.push(relative);
        addEvidence("hardhat", relative, "Hardhat configuration");
        await readConfig(child, relative);
      } else if (lower === "foundry.toml") {
        configFiles.push(relative);
        addEvidence("foundry", relative, "Foundry configuration");
        await readConfig(child, relative);
      } else if (wagmiConfig.test(entry.name)) {
        configFiles.push(relative);
        addEvidence("wagmi", relative, "wagmi configuration");
        await readConfig(child, relative);
      }
      if (lower === "package.json") {
        packageFiles.push(relative);
        await readPackage(child, relative);
      }
    }
  };

  await walk(root, "", 0, true);

  const technologies: Record<ProjectTechnology, boolean> = {
    hardhat: false,
    foundry: false,
    solidity: false,
    wagmi: false,
    viem: false,
  };
  for (const item of evidence) technologies[item.technology] = true;

  return {
    root,
    filesScanned,
    truncated,
    technologies,
    evidence: evidence.sort(compareEvidence),
    solidityFiles: solidityFiles.sort(compareText),
    packageFiles: packageFiles.sort(compareText),
    configFiles: configFiles.sort(compareText),
    monadConfigFiles: [...new Set(monadConfigFiles)].sort(compareText),
    issues: issues.sort((left, right) => compareText(`${left.path}\0${left.code}`, `${right.path}\0${right.code}`)),
  };
}

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function validEntryName(value: string): boolean {
  return Boolean(value) && value !== "." && value !== ".." && !/[\\/]/.test(value);
}

function toProjectPath(value: string): string {
  return value.replaceAll("\\", "/");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareEvidence(left: ProjectEvidence, right: ProjectEvidence): number {
  return compareText(
    `${left.technology}\0${left.path}\0${left.reason}`,
    `${right.technology}\0${right.path}\0${right.reason}`,
  );
}
