import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = await mkdtemp(join(tmpdir(), "pureflow-r7-kit-cli-"));
const rater = join(root, "r7-rater.cjs");
const builder = join(root, "builder.cjs");

try {
  await Promise.all([
    build({
      entryPoints: ["src/rating/workspace-cli.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node22",
      legalComments: "none",
      outfile: rater,
    }),
    build({
      entryPoints: ["src/rating/kit-build-cli.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node22",
      legalComments: "none",
      outfile: builder,
    }),
  ]);
  process.argv.push(rater);
  const loaded = await import(pathToFileURL(builder).href);
  await (loaded.done ?? loaded.default?.done);
} finally {
  await rm(root, { recursive: true, force: true });
}
