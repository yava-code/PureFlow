import { describe, expect, it } from "vitest";
import { summarizeR7Ratings, type ExpertRating, type RatingBundle, type RatingIndex } from "../src/rating/r7";
import { canonicalHash } from "../src/rnd/canonical";

describe("R7 blind expert rating summary", () => {
  it("computes independent agreement and adjudicated validity", () => {
    const index = packetIndex();
    const first = bundle("rater-a", [rating("a".repeat(24)), rating("b".repeat(24))]);
    const second = bundle("rater-b", [rating("a".repeat(24)), { ...rating("b".repeat(24)), causalRelevance: "uncertain" }]);
    const final = bundle("adjudicator", [rating("a".repeat(24)), rating("b".repeat(24))]);

    const summary = summarizeR7Ratings(index, first, second, final);

    expect(summary.expertValid).toBe(2);
    expect(summary.disagreementPackets).toBe(1);
    expect(summary.agreement.causalRelevance.raw).toBe(0.5);
    expect(summary.agreement.targetExpected.raw).toBe(1);
    expect(summary.summarySha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects the same person in both independent slots", () => {
    const ratings = [rating("a".repeat(24)), rating("b".repeat(24))];
    expect(() => summarizeR7Ratings(packetIndex(), bundle("same", ratings), bundle("same", ratings), bundle("judge", ratings)))
      .toThrow("independent rater IDs");
  });

  it("rejects missing packet ratings", () => {
    const ratings = [rating("a".repeat(24)), rating("b".repeat(24))];
    expect(() => summarizeR7Ratings(packetIndex(), bundle("rater-a", ratings.slice(0, 1)), bundle("rater-b", ratings), bundle("judge", ratings)))
      .toThrow("exact packet index");
  });

  it("rejects a packet index changed after export", () => {
    const index = packetIndex();
    index.packets[0]!.packetSha256 = "9".repeat(64);
    const ratings = [rating("a".repeat(24)), rating("b".repeat(24))];
    expect(() => summarizeR7Ratings(index, bundle("rater-a", ratings), bundle("rater-b", ratings), bundle("judge", ratings)))
      .toThrow("index hash mismatch");
  });
});

function packetIndex(): RatingIndex {
  const core = {
    schemaVersion: 1 as const,
    protocol: "r7-blind-expert-v1" as const,
    cohort: "held-out" as const,
    corpusManifestSha256: "d".repeat(64),
    sourcePlanFileSha256: "e".repeat(64),
    packetCount: 2,
    packets: [
      { filename: "packet-001.json", packetId: "a".repeat(24), packetSha256: "1".repeat(64) },
      { filename: "packet-002.json", packetId: "b".repeat(24), packetSha256: "2".repeat(64) },
    ],
  };
  return { ...core, indexSha256: canonicalHash("r7-rater-index", core) };
}

function bundle(raterId: string, ratings: ExpertRating[]): RatingBundle {
  return { schemaVersion: 1, protocol: "r7-blind-expert-v1", raterId, ratings };
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
