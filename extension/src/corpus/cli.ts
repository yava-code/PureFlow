import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { completeCandidate, deferCandidate, scanRepository, type CandidatePreflight, type ProvisionEvidence } from "./scan";
import { freezeCorpus, type CandidateFacts, type RepositoryRegistration } from "./freeze";

void main();

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (command === "scan" && args.length === 4) {
    const repositories = await readJson<RepositoryRegistration[]>(args[0]!);
    const registration = repositories.find(({ repositoryId }) => repositoryId === args[1]);
    if (registration === undefined) throw new Error(`Unknown repository registration: ${args[1]}`);
    const drafts = await scanRepository(resolve(args[2]!), registration);
    await writeNewJson(args[3]!, drafts);
    process.stdout.write(`Scanned ${drafts.length} coarse candidates for ${registration.repositoryId}.\n`);
  } else if (command === "complete" && args.length === 3) {
    const drafts = await readJson<CandidatePreflight[]>(args[0]!);
    const evidence = await readJson<Record<string, ProvisionEvidence>>(args[1]!);
    const completed = drafts.map((draft) => {
      const item = evidence[draft.targetCommit];
      return item === undefined ? deferCandidate(draft) : completeCandidate(draft, item);
    });
    await writeNewJson(args[2]!, completed);
    process.stdout.write(`Completed ${completed.length} eligibility records.\n`);
  } else if (command === "freeze" && args.length === 3) {
    const repositories = await readJson<RepositoryRegistration[]>(args[0]!);
    const candidates = await readJson<CandidateFacts[]>(args[1]!);
    const manifest = freezeCorpus(repositories, candidates);
    await writeNewJson(args[2]!, manifest);
    process.stdout.write(`Frozen ${manifest.patches.length} patches as ${manifest.manifestSha256}.\n`);
  } else {
    process.stderr.write([
      "Usage:",
      "  npm run r7:corpus -- scan <repositories.json> <repository-id> <git-repository> <preflight.json>",
      "  npm run r7:corpus -- complete <preflight.json> <provision-evidence.json> <candidates.json>",
      "  npm run r7:corpus -- freeze <repositories.json> <candidates.json> <manifest.json>",
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
