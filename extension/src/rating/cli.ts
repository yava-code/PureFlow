import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizeR7Ratings, type RatingBundle, type RatingIndex } from "./r7";

void main();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 5) {
    process.stderr.write("Usage: node scripts/r7-rating.mjs <index.json> <rater-a.json> <rater-b.json> <adjudication.json> <new-summary.json>\n");
    process.exitCode = 2;
    return;
  }
  const [index, first, second, adjudication] = await Promise.all([
    readJson<RatingIndex>(args[0]!),
    readJson<RatingBundle>(args[1]!),
    readJson<RatingBundle>(args[2]!),
    readJson<RatingBundle>(args[3]!),
  ]);
  const summary = summarizeR7Ratings(index, first, second, adjudication);
  await writeFile(resolve(args[4]!), `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`Summarized ${summary.expertValid}/${summary.packetCount} expert-valid packets.\n`);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(resolve(path), "utf8")) as T;
}
