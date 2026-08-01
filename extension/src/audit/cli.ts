import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { RepositoryRegistration } from "../corpus/freeze";
import type { CandidatePreflight } from "../corpus/scan";
import { executeRewindPlan } from "./rewind-execute";
import { prepareRewindPlan, type RewindPatch } from "./rewind-prepare";
import { summarizeRewindAudit, type RewindPlanFile, type RewindResultFile } from "./rewind-summary";

void main();

interface CorpusManifestFile {
  manifestSha256: string;
  patches: RewindPatch[];
}

type PlanFile = RewindPlanFile;

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "plan" && args.length === 6) {
    const repositories = await readJson<RepositoryRegistration[]>(args[0]!);
    const manifest = await readJson<CorpusManifestFile>(args[1]!);
    const cohort = args[4];
    if (cohort !== "development" && cohort !== "held-out") throw new Error("Cohort must be development or held-out");
    if (!/^[0-9a-f]{64}$/.test(manifest.manifestSha256)) throw new Error("Invalid corpus manifest hash");
    const records = [];
    for (const patch of manifest.patches.filter((item) => item.cohort === cohort)) {
      const registration = repositories.find(({ repositoryId }) => repositoryId === patch.repositoryId);
      if (registration === undefined) throw new Error(`Missing repository registration: ${patch.repositoryId}`);
      const preflights = await readJson<CandidatePreflight[]>(join(args[2]!, `preflight-${patch.repositoryId}.json`));
      const preflight = preflights.find(({ targetCommit }) => targetCommit === patch.targetCommit);
      if (preflight === undefined) throw new Error(`Missing preflight: ${patch.repositoryId}/${patch.targetCommit}`);
      const result = await prepareRewindPlan(
        join(resolve(args[3]!), patch.repositoryId),
        manifest.manifestSha256,
        patch,
        registration,
        preflight,
      );
      records.push({ patch: structuredClone(patch), result });
    }
    await writeNewJson(args[5]!, {
      schemaVersion: 1,
      corpusManifestSha256: manifest.manifestSha256,
      cohort,
      records,
    });
    process.stdout.write(`Planned ${records.length} ${cohort} rewind candidates.\n`);
  } else if (command === "execute" && args.length === 5) {
    const plans = await readJson<PlanFile>(args[0]!);
    const ordinal = Number(args[2]);
    const record = plans.records.find(({ patch }) => patch.repositoryId === args[1] && patch.ordinal === ordinal);
    if (record === undefined) throw new Error(`Unknown planned patch: ${args[1]}/${args[2]}`);
    const execution = record.result.status === "compiled"
      ? await executeRewindPlan(join(resolve(args[3]!), record.patch.repositoryId), record.result.internal)
      : null;
    await writeNewJson(args[4]!, {
      schemaVersion: 1,
      corpusManifestSha256: plans.corpusManifestSha256,
      cohort: plans.cohort,
      patch: record.patch,
      compileResult: record.result,
      execution,
    });
    process.stdout.write(`Executed ${record.patch.repositoryId}/${record.patch.ordinal}: ${execution?.status ?? record.result.status}.\n`);
  } else if (command === "summarize" && args.length === 3) {
    const plans = await readJson<PlanFile>(args[0]!);
    const directory = resolve(args[1]!);
    const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
    const results = await Promise.all(names.map((name) => readJson<RewindResultFile>(join(directory, name))));
    const summary = summarizeRewindAudit(plans, results);
    await writeNewJson(args[2]!, summary);
    process.stdout.write(`Summarized ${summary.validEpisodes}/${summary.totalPatches} valid ${summary.cohort} episodes.\n`);
  } else {
    process.stderr.write([
      "Usage:",
      "  npm run r7:audit -- plan <repositories.json> <manifest.json> <preflight-dir> <external-root> <development|held-out> <new-plans.json>",
      "  npm run r7:audit -- execute <plans.json> <repository-id> <ordinal> <external-root> <new-result.json>",
      "  npm run r7:audit -- summarize <plans.json> <results-dir> <new-summary.json>",
      "",
    ].join("\n"));
    process.exitCode = 2;
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as T;
}

async function writeNewJson(path: string, value: unknown): Promise<void> {
  await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}
