import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { get } from "node:https";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(await readFile(join(extensionRoot, "fixture-node-artifacts.json"), "utf8"));
const key = `${process.platform}-${process.arch}`;
const artifact = catalog.artifacts[key];

if (!artifact) {
  throw new Error(`Fixture Node ${catalog.version} is not pinned for ${key}`);
}

const runtimeRoot = join(extensionRoot, ".pureflow-runtime", catalog.version, key);
const executable = join(runtimeRoot, process.platform === "win32" ? "node.exe" : "node");
const metadataPath = join(runtimeRoot, "runtime.json");

if (await existingRuntimeIsValid()) {
  console.log(`fixture-node ${catalog.version} ready (${key})`);
  process.exit(0);
}

const tempRoot = await mkdtemp(join(tmpdir(), "pureflow-fixture-node-"));
const downloadPath = join(tempRoot, basename(new URL(artifact.url).pathname));
const runtimeParent = dirname(runtimeRoot);
const staging = join(runtimeParent, `.staging-${randomUUID()}`);

try {
  await download(artifact.url, downloadPath);
  await expectHash(downloadPath, artifact.downloadSha256, "download");
  await mkdir(runtimeParent, { recursive: true });
  await mkdir(staging, { recursive: true });

  const stagedExecutable = join(staging, process.platform === "win32" ? "node.exe" : "node");
  if (artifact.format === "binary") {
    await copyFile(downloadPath, stagedExecutable);
  } else {
    const extracted = join(tempRoot, "extracted");
    await mkdir(extracted);
    const result = spawnSync("tar", ["-xJf", downloadPath, "-C", extracted, artifact.entry], {
      encoding: "utf8",
      shell: false,
      windowsHide: true,
    });
    if (result.status !== 0) {
      throw new Error(`Could not extract fixture Node: ${result.stderr.trim()}`);
    }
    await copyFile(join(extracted, artifact.entry), stagedExecutable);
  }

  if (process.platform !== "win32") {
    await chmod(stagedExecutable, 0o755);
  }
  await expectHash(stagedExecutable, artifact.executableSha256, "executable");
  const version = spawnSync(stagedExecutable, ["--version"], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (version.status !== 0 || version.stdout.trim() !== catalog.version) {
    throw new Error(`Fixture Node reported ${version.stdout.trim() || "no version"}`);
  }

  await writeFile(
    join(staging, "runtime.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      handle: "fixture-node",
      version: catalog.version,
      platform: process.platform,
      arch: process.arch,
      sourceUrl: artifact.url,
      sourceSha256: artifact.downloadSha256,
      executableSha256: artifact.executableSha256,
    }, null, 2)}\n`,
    "utf8",
  );

  await rm(runtimeRoot, { recursive: true, force: true });
  await rename(staging, runtimeRoot);
  console.log(`fixture-node ${catalog.version} provisioned (${key})`);
} finally {
  await rm(staging, { recursive: true, force: true });
  await rm(tempRoot, { recursive: true, force: true });
}

async function existingRuntimeIsValid() {
  try {
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    if (
      metadata.schemaVersion !== 1 ||
      metadata.handle !== "fixture-node" ||
      metadata.version !== catalog.version ||
      metadata.platform !== process.platform ||
      metadata.arch !== process.arch ||
      metadata.sourceUrl !== artifact.url ||
      metadata.sourceSha256 !== artifact.downloadSha256 ||
      metadata.executableSha256 !== artifact.executableSha256
    ) {
      return false;
    }
    await expectHash(executable, artifact.executableSha256, "cached executable");
    const result = spawnSync(executable, ["--version"], { encoding: "utf8", shell: false, windowsHide: true });
    return result.status === 0 && result.stdout.trim() === catalog.version;
  } catch {
    return false;
  }
}

async function download(url, destination, redirects = 0) {
  if (redirects > 3) {
    throw new Error("Too many redirects while provisioning fixture Node");
  }
  await new Promise((resolveDownload, reject) => {
    const request = get(url, { headers: { "User-Agent": "PureFlow-R0-fixture-provisioner" } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(new URL(response.headers.location, url).href, destination, redirects + 1).then(resolveDownload, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Fixture Node download failed with HTTP ${response.statusCode}`));
        return;
      }
      pipeline(response, createWriteStream(destination)).then(resolveDownload, reject);
    });
    request.on("error", reject);
  });
}

async function expectHash(path, expected, label) {
  const bytes = await readFile(path);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) {
    throw new Error(`Fixture Node ${label} hash mismatch: expected ${expected}, got ${actual}`);
  }
}
