import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const [plansPath, preflightRoot, repositoryRoot, outputRoot] = process.argv.slice(2);
if (!plansPath || !preflightRoot || !repositoryRoot || !outputRoot) {
  throw new Error("Usage: node scripts/r7-rater-packets.mjs <plans.json> <preflight-dir> <repository-root> <new-output-dir>");
}

const plans = JSON.parse(await readFile(resolve(plansPath), "utf8"));
if (plans.schemaVersion !== 1 || plans.cohort !== "held-out" || !/^[0-9a-f]{64}$/.test(plans.corpusManifestSha256)) {
  throw new Error("Expected a frozen held-out R7 plan file");
}

const output = resolve(outputRoot);
await mkdir(output, { recursive: false });
const preflights = new Map();
const index = [];

for (let offset = 0; offset < plans.records.length; offset += 1) {
  const record = plans.records[offset];
  const { patch } = record;
  let repositoryPreflight = preflights.get(patch.repositoryId);
  if (!repositoryPreflight) {
    repositoryPreflight = JSON.parse(await readFile(join(resolve(preflightRoot), `preflight-${patch.repositoryId}.json`), "utf8"));
    preflights.set(patch.repositoryId, repositoryPreflight);
  }
  const preflight = repositoryPreflight.find((value) => value.targetCommit === patch.targetCommit);
  if (!preflight) throw new Error(`Missing preflight for ${patch.repositoryId}/${patch.ordinal}`);
  const paths = [...new Set([...preflight.changedSourcePaths, ...preflight.changedTestPaths])].sort(compareUtf8);
  const diff = await gitDiff(join(resolve(repositoryRoot), patch.repositoryId), patch.baseCommit, patch.targetCommit, paths);
  const seam = record.result.status === "compiled"
    ? record.result.participant.seam
    : { path: preflight.changedSourcePaths[0], symbol: "<module>", kind: "module-boundary" };
  const packetCore = {
    schemaVersion: 1,
    protocol: "r7-blind-expert-v1",
    packetId: packetId(plans.corpusManifestSha256, patch.repositoryId, patch.ordinal),
    projectAlias: `project-${rawSha256(patch.repositoryId).slice(0, 8)}`,
    seam,
    writablePaths: [...preflight.changedSourcePaths].sort(compareUtf8),
    attributedTestPaths: [...preflight.changedTestPaths].sort(compareUtf8),
    mutationRule: "Keep the target snapshot and target tests. Replace every listed source path with its complete adjacent-base version; if no base version exists, the replay removes that path.",
    observation: "Run the repository's preregistered check and classify only its process outcome.",
    sourceAndTestDiff: diff,
    questions: [
      "Is the proposed rewind causally relevant to the changed behavior?",
      "Should the preregistered check pass on the target snapshot?",
      "Should the preregistered check fail after the proposed rewind?",
      "Does this packet expose a protected repair, compiler status, or observed outcome?",
    ],
  };
  const packet = { ...packetCore, packetSha256: canonicalHash("r7-rater-packet", packetCore) };
  const filename = `packet-${String(offset + 1).padStart(3, "0")}.json`;
  await writeFile(join(output, filename), `${JSON.stringify(packet, null, 2)}\n`, { flag: "wx" });
  index.push({ filename, packetId: packet.packetId, packetSha256: packet.packetSha256 });
}

const indexCore = {
  schemaVersion: 1,
  protocol: "r7-blind-expert-v1",
  cohort: "held-out",
  corpusManifestSha256: plans.corpusManifestSha256,
  sourcePlanFileSha256: rawSha256(await readFile(resolve(plansPath))),
  packetCount: index.length,
  packets: index,
};
const indexFile = { ...indexCore, indexSha256: canonicalHash("r7-rater-index", indexCore) };
await writeFile(join(output, "index.json"), `${JSON.stringify(indexFile, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`Wrote ${index.length} blind held-out packets; index ${indexFile.indexSha256}.\n`);

async function gitDiff(repository, base, target, paths) {
  if (!paths.length) throw new Error("Rater packet has no reviewable paths");
  const { stdout } = await run("git", ["diff", "--no-ext-diff", "--unified=40", base, target, "--", ...paths], {
    cwd: repository,
    encoding: "utf8",
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 256 * 1024,
    env: hostEnvironment(),
  });
  if (!stdout || Buffer.byteLength(stdout, "utf8") > 256 * 1024) throw new Error("Rater diff is empty or too large");
  return stdout.replace(/^index [0-9a-f.]+(?: [0-9]+)?\r?\n/gm, "");
}

function packetId(corpus, repositoryId, ordinal) {
  return rawSha256(`${corpus}\n${repositoryId}\n${ordinal}`).slice(0, 24);
}

function canonicalHash(domain, value) {
  return rawSha256(`pureflow/v0.3/${domain}\n${canonicalJson(value)}`);
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort(compareUtf8);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function rawSha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function hostEnvironment() {
  const env = { GIT_CONFIG_GLOBAL: "NUL", GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0", LANG: "C", LC_ALL: "C" };
  for (const name of ["PATH", "Path", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "TMP", "TEMP"]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return env;
}
