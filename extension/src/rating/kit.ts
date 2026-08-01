import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { assertExactKeys, assertRelPath, assertSha256, canonicalHash, compareUtf8, rawSha256 } from "../rnd/canonical";
import { loadPacketSet } from "./workspace-files";

export interface BlindKitManifest {
  schemaVersion: 1;
  protocol: "r7-blind-kit-v1";
  packetProtocol: "r7-blind-expert-v1";
  packetIndexSha256: string;
  runtime: "node>=22";
  files: Array<{ path: string; bytes: number; sha256: string }>;
  kitSha256: string;
}

export async function buildBlindKit(packetDir: string, outputDir: string, cliBundle: Uint8Array): Promise<BlindKitManifest> {
  const packetSet = await loadPacketSet(packetDir);
  const output = resolve(outputDir);
  await mkdir(output, { recursive: false });
  await mkdir(join(output, "packets"));

  const files = new Map<string, Uint8Array>();
  files.set("r7-rater.cjs", cliBundle);
  files.set("README.md", Buffer.from(readme(), "utf8"));
  files.set("packets/index.json", await readFile(join(packetSet.dir, "index.json")));
  for (const { filename } of packetSet.index.packets) {
    files.set(`packets/${filename}`, await readFile(join(packetSet.dir, filename)));
  }

  for (const [path, bytes] of [...files].sort(([left], [right]) => compareUtf8(left, right))) {
    assertRelPath(path);
    await writeFile(join(output, ...path.split("/")), bytes, { flag: "wx" });
  }

  const entries = [...files]
    .map(([path, bytes]) => ({ path, bytes: bytes.byteLength, sha256: rawSha256(bytes) }))
    .sort((left, right) => compareUtf8(left.path, right.path));
  const core = {
    schemaVersion: 1 as const,
    protocol: "r7-blind-kit-v1" as const,
    packetProtocol: "r7-blind-expert-v1" as const,
    packetIndexSha256: packetSet.index.indexSha256,
    runtime: "node>=22" as const,
    files: entries,
  };
  const manifest = { ...core, kitSha256: canonicalHash("r7-blind-kit", core) };
  await writeFile(join(output, "kit.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  await verifyBlindKit(output);
  return manifest;
}

export async function verifyBlindKit(kitDir: string): Promise<BlindKitManifest> {
  const root = resolve(kitDir);
  const manifest = JSON.parse(await readFile(join(root, "kit.json"), "utf8")) as BlindKitManifest;
  validateManifest(manifest);
  const actualPaths = (await walk(root)).sort(compareUtf8);
  const expectedPaths = [...manifest.files.map(({ path }) => path), "kit.json"].sort(compareUtf8);
  if (actualPaths.length !== expectedPaths.length || actualPaths.some((path, index) => path !== expectedPaths[index])) {
    throw new Error("Blind kit contains missing or unexpected files");
  }

  for (const entry of manifest.files) {
    const bytes = await readFile(join(root, ...entry.path.split("/")));
    if (bytes.byteLength !== entry.bytes || rawSha256(bytes) !== entry.sha256) {
      throw new Error(`Blind kit file mismatch: ${entry.path}`);
    }
  }
  const packets = await loadPacketSet(join(root, "packets"));
  if (packets.index.indexSha256 !== manifest.packetIndexSha256) {
    throw new Error("Blind kit packet index mismatch");
  }
  return manifest;
}

function validateManifest(manifest: BlindKitManifest): void {
  assertExactKeys(manifest, ["schemaVersion", "protocol", "packetProtocol", "packetIndexSha256", "runtime", "files", "kitSha256"], "blind kit manifest");
  if (
    manifest.schemaVersion !== 1
    || manifest.protocol !== "r7-blind-kit-v1"
    || manifest.packetProtocol !== "r7-blind-expert-v1"
    || manifest.runtime !== "node>=22"
  ) {
    throw new Error("Invalid blind kit manifest");
  }
  assertSha256(manifest.packetIndexSha256, "packet index hash");
  assertSha256(manifest.kitSha256, "kit hash");
  if (!Array.isArray(manifest.files) || manifest.files.length < 4) throw new Error("Blind kit manifest has no files");
  const seen = new Set<string>();
  for (const file of manifest.files) {
    assertExactKeys(file, ["path", "bytes", "sha256"], "blind kit file");
    assertRelPath(file.path);
    if (!/^(README\.md|r7-rater\.cjs|packets\/index\.json|packets\/packet-[0-9]{3}\.json)$/.test(file.path)) {
      throw new Error(`Blind kit file is outside the allowlist: ${file.path}`);
    }
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 1) throw new Error(`Invalid blind kit file size: ${file.path}`);
    assertSha256(file.sha256, `${file.path} hash`);
    const folded = file.path.toLowerCase();
    if (seen.has(folded)) throw new Error(`Duplicate blind kit path: ${file.path}`);
    seen.add(folded);
  }
  const required = ["README.md", "r7-rater.cjs", "packets/index.json"];
  if (required.some((path) => !seen.has(path.toLowerCase()))) throw new Error("Blind kit is missing a required file");
  const { kitSha256, ...core } = manifest;
  if (canonicalHash("r7-blind-kit", core) !== kitSha256) throw new Error("Blind kit manifest hash mismatch");
}

async function walk(root: string, dir = root): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Blind kit rejects symlinks: ${entry.name}`);
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await walk(root, absolute));
    } else if (entry.isFile()) {
      result.push(relative(root, absolute).split(sep).join("/"));
    } else {
      throw new Error(`Blind kit rejects special files: ${entry.name}`);
    }
  }
  return result;
}

function readme(): string {
  return `# PureFlow R7 blind expert kit

This directory contains only the frozen expert packets and a prebundled local CLI. Do not search commit history, execute the disclosed project code, or request compiler outcomes while rating.

Requires Node.js 22 or newer. No npm install or network access is required.

From this directory:

\`\`\`powershell
node .\\r7-rater.cjs verify-kit .
$ratingRoot = Join-Path $env:TEMP "pureflow-r7-expert-a"
New-Item -ItemType Directory -Path $ratingRoot
$workspace = Join-Path $ratingRoot "workspace.json"
$bundle = Join-Path $ratingRoot "expert-a.json"

node .\\r7-rater.cjs init .\\packets expert-a $workspace
node .\\r7-rater.cjs next .\\packets $workspace
node .\\r7-rater.cjs answer .\\packets $workspace <packet-id> yes pass fail none 4 "Reason grounded in the visible diff"
node .\\r7-rater.cjs status .\\packets $workspace
node .\\r7-rater.cjs export .\\packets $workspace $bundle
\`\`\`

Keep workspaces and exported bundles outside this directory. The verifier rejects added or changed files.
`;
}
