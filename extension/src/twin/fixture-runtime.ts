import { execFile } from "node:child_process";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertExactKeys, assertSha256, rawSha256 } from "../rnd/canonical";
import { R0_NODE_VERSION, type FixtureRuntime } from "./fixture-contract";

const runFile = promisify(execFile);
const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

interface Artifact {
  url: string;
  downloadSha256: string;
  executableSha256: string;
  format: "binary" | "tar-xz";
  entry: string | null;
}

interface ArtifactCatalog {
  schemaVersion: 1;
  version: string;
  artifacts: Record<string, Artifact>;
}

interface RuntimeMetadata {
  schemaVersion: 1;
  handle: "fixture-node";
  version: string;
  platform: string;
  arch: string;
  sourceUrl: string;
  sourceSha256: string;
  executableSha256: string;
}

export interface InstalledFixtureRuntime extends FixtureRuntime {
  executablePath: string;
}

export async function openFixtureNodeRuntime(): Promise<InstalledFixtureRuntime> {
  const catalog = await readJson<ArtifactCatalog>(join(extensionRoot, "fixture-node-artifacts.json"));
  assertExactKeys(catalog, ["schemaVersion", "version", "artifacts"], "fixture runtime catalog");
  if (catalog.schemaVersion !== 1 || catalog.version !== R0_NODE_VERSION) {
    throw new Error("Fixture runtime catalog version does not match the R0 contract");
  }

  const key = `${process.platform}-${process.arch}`;
  const artifact = catalog.artifacts[key];
  if (!artifact) {
    throw new Error(`Fixture Node ${R0_NODE_VERSION} is not pinned for ${key}`);
  }
  validateArtifact(artifact);

  const root = join(extensionRoot, ".pureflow-runtime", R0_NODE_VERSION, key);
  const executablePath = join(root, process.platform === "win32" ? "node.exe" : "node");
  const metadata = await readJson<RuntimeMetadata>(join(root, "runtime.json"));
  assertExactKeys(
    metadata,
    ["schemaVersion", "handle", "version", "platform", "arch", "sourceUrl", "sourceSha256", "executableSha256"],
    "fixture runtime metadata",
  );

  if (
    metadata.schemaVersion !== 1 ||
    metadata.handle !== "fixture-node" ||
    metadata.version !== R0_NODE_VERSION ||
    metadata.platform !== process.platform ||
    metadata.arch !== process.arch ||
    metadata.sourceUrl !== artifact.url ||
    metadata.sourceSha256 !== artifact.downloadSha256 ||
    metadata.executableSha256 !== artifact.executableSha256
  ) {
    throw new Error("Fixture runtime metadata does not match the pinned artifact catalog");
  }

  const info = await stat(executablePath);
  if (!info.isFile()) {
    throw new Error("Fixture runtime executable is not a regular file");
  }
  const bytes = await readFile(executablePath);
  const executableSha256 = rawSha256(bytes);
  if (executableSha256 !== artifact.executableSha256) {
    throw new Error("Fixture runtime executable hash does not match the pinned artifact");
  }

  const { stdout } = await runFile(executablePath, ["--version"], {
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true,
  });
  if (stdout.trim() !== R0_NODE_VERSION) {
    throw new Error(`Fixture runtime reported an unexpected version: ${stdout.trim()}`);
  }
  if ((await realpath(executablePath)) === (await realpath(process.execPath))) {
    throw new Error("Fixture runtime must not alias the host Node executable");
  }

  return { handle: "fixture-node", version: R0_NODE_VERSION, executableSha256, executablePath };
}

function validateArtifact(artifact: Artifact): void {
  assertExactKeys(artifact, ["url", "downloadSha256", "executableSha256", "format", "entry"], "fixture artifact");
  if (!artifact.url.startsWith(`https://nodejs.org/dist/${R0_NODE_VERSION}/`)) {
    throw new Error("Fixture runtime artifact must come from the pinned Node release");
  }
  assertSha256(artifact.downloadSha256, "fixture artifact downloadSha256");
  assertSha256(artifact.executableSha256, "fixture artifact executableSha256");
  if ((artifact.format === "binary") !== (artifact.entry === null)) {
    throw new Error("Fixture artifact format and entry do not match");
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}
