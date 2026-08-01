import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalHash } from "../src/rnd/canonical";
import type { ExpertRating, RatingBundle, RatingIndex } from "../src/rating/r7";
import {
  adjudicationDisagreement,
  createAdjudicationWorkspace,
  createRaterWorkspace,
  exportRatingBundle,
  ratingProgress,
  saveRating,
  validatePacket,
  type RaterPacket,
} from "../src/rating/workspace";
import { loadPacketSet } from "../src/rating/workspace-files";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("R7 blind rating workspace", () => {
  it("resumes partial work and exports only exact complete coverage", () => {
    const { index } = packetSet();
    let workspace = createRaterWorkspace(index, "expert-one");

    workspace = saveRating(index, workspace, rating(index.packets[0]!.packetId));
    expect(ratingProgress(index, workspace)).toMatchObject({ complete: 1, total: 2, nextPacketId: index.packets[1]!.packetId });
    expect(() => exportRatingBundle(index, workspace)).toThrow("exact packet index");

    workspace = saveRating(index, workspace, rating(index.packets[1]!.packetId));
    const bundle = exportRatingBundle(index, workspace);
    expect(bundle.raterId).toBe("expert-one");
    expect(bundle.ratings.map(({ packetId }) => packetId)).toEqual(index.packets.map(({ packetId }) => packetId).sort());
  });

  it("rejects a packet changed after the frozen index was built", () => {
    const { index, packets } = packetSet();
    const packet = structuredClone(packets[0]!);
    packet.sourceAndTestDiff = "tampered";
    expect(() => validatePacket(index, packet, index.packets[0]!.filename)).toThrow("packet hash mismatch");
  });

  it("prefills categorical consensus and leaves disagreements for blinded adjudication", () => {
    const { index } = packetSet();
    const first = bundle("expert-one", index.packets.map(({ packetId }) => rating(packetId)));
    const secondRatings = index.packets.map(({ packetId }) => rating(packetId));
    secondRatings[1] = { ...secondRatings[1]!, causalRelevance: "uncertain", reason: "The visible seam may not control the asserted behavior." };
    const second = bundle("expert-two", secondRatings);

    const workspace = createAdjudicationWorkspace(index, first, second, "panel-chair");

    expect(workspace.ratings).toHaveLength(1);
    expect(ratingProgress(index, workspace).nextPacketId).toBe(index.packets[1]!.packetId);
    expect(adjudicationDisagreement(workspace, index.packets[1]!.packetId)?.fields).toEqual(["causalRelevance"]);
    expect(workspace.sourceBundles?.map(({ raterId }) => raterId)).toEqual(["expert-one", "expert-two"]);
  });

  it("verifies every packet and rejects an outcome-like JSON file in the blind directory", async () => {
    const { index, packets } = packetSet();
    const root = await mkdtemp(join(tmpdir(), "pureflow-rater-workspace-"));
    roots.push(root);
    await writeFile(join(root, "index.json"), JSON.stringify(index));
    for (let i = 0; i < packets.length; i += 1) {
      await writeFile(join(root, index.packets[i]!.filename), JSON.stringify(packets[i]));
    }

    const loaded = await loadPacketSet(root);
    expect(loaded.packets.size).toBe(2);

    await writeFile(join(root, "held-out-summary.json"), "{}\n");
    await expect(loadPacketSet(root)).rejects.toThrow("unexpected content");
  });
});

function packetSet(): { index: RatingIndex; packets: RaterPacket[] } {
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
  return { index: { ...core, indexSha256: canonicalHash("r7-rater-index", core) }, packets };
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

function rating(packetId: string): ExpertRating {
  return {
    packetId,
    causalRelevance: "yes",
    targetExpected: "pass",
    rewindExpected: "fail",
    leakage: "none",
    confidence: 4,
    reason: "The visible test directly covers the changed behavior.",
  };
}

function bundle(raterId: string, ratings: ExpertRating[]): RatingBundle {
  return { schemaVersion: 1, protocol: "r7-blind-expert-v1", raterId, ratings };
}
