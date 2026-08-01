import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const [checkId, oraclePath] = process.argv.slice(2);
if (!checkId || !oraclePath) {
  throw new Error("Expected a check ID and controller oracle path");
}

const oracle = JSON.parse(await readFile(oraclePath, "utf8"));
const cases = oracle[checkId];
if (!Array.isArray(cases) || cases.length === 0) {
  throw new Error(`Unknown fixture check: ${checkId}`);
}

const source = pathToFileURL(`${process.cwd()}/src/cache-key.ts`).href;
const { cacheKey } = await import(`${source}?execution=${encodeURIComponent(process.env.PUREFLOW_EXECUTION_ID ?? "fixture")}`);

for (const item of cases) {
  const actual = cacheKey(...item.args);
  if (actual !== item.expected) {
    console.error(JSON.stringify({ checkId, expected: item.expected, actual }));
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(JSON.stringify({ checkId, cases: cases.length, status: "passed" }));
}
