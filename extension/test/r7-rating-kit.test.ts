import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { build } from "esbuild";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalHash, rawSha256 } from "../src/rnd/canonical";
import { buildBlindKit, verifyBlindKit, type BlindKitManifest } from "../src/rating/kit";
import type { RatingIndex } from "../src/rating/r7";
import type { RaterPacket } from "../src/rating/workspace";

const roots: string[] = [];
const run = promisify(execFile);

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("R7 standalone blind kit", () => {
  it("builds reproducibly and verifies every allowed file", async () => {
    const root = await scratch();
    const packets = join(root, "source-packets");
    await writePackets(packets);
    const first = await buildBlindKit(packets, join(root, "kit-a"), Buffer.from("#!/usr/bin/env node\n"));
    const second = await buildBlindKit(packets, join(root, "kit-b"), Buffer.from("#!/usr/bin/env node\n"));

    expect(second).toEqual(first);
    expect((await verifyBlindKit(join(root, "kit-a"))).kitSha256).toBe(first.kitSha256);
    expect(first.files.map(({ path }) => path)).toEqual([
      "README.md",
      "packets/index.json",
      "packets/packet-001.json",
      "packets/packet-002.json",
      "r7-rater.cjs",
    ]);
  });

  it("rejects a changed bundled CLI", async () => {
    const root = await scratch();
    const packets = join(root, "source-packets");
    await writePackets(packets);
    await buildBlindKit(packets, join(root, "kit"), Buffer.from("original cli"));
    await writeFile(join(root, "kit", "r7-rater.cjs"), "changed cli");

    await expect(verifyBlindKit(join(root, "kit"))).rejects.toThrow("file mismatch");
  });

  it("rejects an outcome file even when a rewritten manifest accounts for it", async () => {
    const root = await scratch();
    const packets = join(root, "source-packets");
    await writePackets(packets);
    const kit = join(root, "kit");
    await buildBlindKit(packets, kit, Buffer.from("original cli"));
    const outcome = Buffer.from("{}\n");
    await writeFile(join(kit, "outcome.json"), outcome);
    const manifest = JSON.parse(await readFile(join(kit, "kit.json"), "utf8")) as BlindKitManifest;
    const core = {
      ...manifest,
      files: [...manifest.files, { path: "outcome.json", bytes: outcome.byteLength, sha256: rawSha256(outcome) }],
    };
    const { kitSha256: _old, ...withoutHash } = core;
    await writeFile(join(kit, "kit.json"), JSON.stringify({ ...withoutHash, kitSha256: canonicalHash("r7-blind-kit", withoutHash) }));

    await expect(verifyBlindKit(kit)).rejects.toThrow("outside the allowlist");
  });

  it("refuses to overwrite an existing output directory", async () => {
    const root = await scratch();
    const packets = join(root, "source-packets");
    await writePackets(packets);
    const output = join(root, "kit");
    await buildBlindKit(packets, output, Buffer.from("original cli"));

    await expect(buildBlindKit(packets, output, Buffer.from("original cli"))).rejects.toThrow();
  });

  it("runs the prebundled CLI without a repository checkout or npm install", async () => {
    const root = await scratch();
    const packets = join(root, "source-packets");
    const bundled = join(root, "r7-rater.cjs");
    await writePackets(packets);
    await build({
      entryPoints: ["src/rating/workspace-cli.ts"],
      bundle: true,
      platform: "node",
      format: "cjs",
      target: "node22",
      legalComments: "none",
      outfile: bundled,
    });
    const kit = join(root, "kit");
    await buildBlindKit(packets, kit, await readFile(bundled));
    const cli = join(kit, "r7-rater.cjs");
    const verified = await run(process.execPath, [cli, "verify-kit", kit], { cwd: root, windowsHide: true });
    expect(verified.stdout).toContain("Verified blind kit");

    const workspace = join(root, "workspace.json");
    const initialized = await run(process.execPath, [cli, "init", join(kit, "packets"), "expert-smoke", workspace], { cwd: root, windowsHide: true });
    expect(initialized.stdout).toContain("Rated 0/2");
  });
});

async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r7-kit-test-"));
  roots.push(root);
  return root;
}

async function writePackets(dir: string): Promise<void> {
  await mkdir(dir);
  const packets = [packet("a".repeat(24), "src/a.ts"), packet("b".repeat(24), "src/b.ts")];
  const core = {
    schemaVersion: 1 as const,
    protocol: "r7-blind-expert-v1" as const,
    cohort: "held-out" as const,
    corpusManifestSha256: "d".repeat(64),
    sourcePlanFileSha256: "e".repeat(64),
    packetCount: packets.length,
    packets: packets.map((value, index) => ({
      filename: `packet-${String(index + 1).padStart(3, "0")}.json`,
      packetId: value.packetId,
      packetSha256: value.packetSha256,
    })),
  };
  const index: RatingIndex = { ...core, indexSha256: canonicalHash("r7-rater-index", core) };
  await writeFile(join(dir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  await Promise.all(packets.map((value, index) => writeFile(join(dir, `packet-${String(index + 1).padStart(3, "0")}.json`), `${JSON.stringify(value, null, 2)}\n`)));
}

function packet(packetId: string, path: string): RaterPacket {
  const core = {
    schemaVersion: 1 as const,
    protocol: "r7-blind-expert-v1" as const,
    packetId,
    projectAlias: "project-12345678",
    seam: { path, symbol: "run", kind: "function" },
    writablePaths: [path],
    attributedTestPaths: [path.replace("src", "test")],
    mutationRule: "Replace the changed source with its adjacent base version.",
    observation: "Run the preregistered check and classify its process outcome.",
    sourceAndTestDiff: `diff --git a/${path} b/${path}`,
    questions: ["Is the proposed rewind causally relevant?"],
  };
  return { ...core, packetSha256: canonicalHash("r7-rater-packet", core) };
}
