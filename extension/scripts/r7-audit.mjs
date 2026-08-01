import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = await mkdtemp(join(tmpdir(), "pureflow-r7-audit-cli-"));
const outfile = join(root, "cli.cjs");

try {
  await build({
    entryPoints: ["src/audit/cli.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    outfile,
  });
  await import(pathToFileURL(outfile).href);
} finally {
  await rm(root, { recursive: true, force: true });
}
