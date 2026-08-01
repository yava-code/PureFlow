import { readFile } from "node:fs/promises";
import { buildBlindKit } from "./kit";

export const done = main();

async function main(): Promise<void> {
  try {
    const [packetDir, outputDir, cliBundlePath] = process.argv.slice(2);
    if (!packetDir || !outputDir || !cliBundlePath) {
      process.stderr.write("Usage: node scripts/r7-rater-kit.mjs <packet-dir> <new-output-dir>\n");
      process.exitCode = 2;
      return;
    }
    const manifest = await buildBlindKit(packetDir, outputDir, await readFile(cliBundlePath));
    process.stdout.write(`Built offline blind kit ${manifest.kitSha256} for packet index ${manifest.packetIndexSha256}.\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
