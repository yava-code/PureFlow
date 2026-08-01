import { canonicalHash, compareUtf8 } from "../rnd/canonical";

const relevance = ["yes", "no", "uncertain"] as const;
const expectation = ["pass", "fail", "uncertain"] as const;
const leakage = ["none", "repair", "compiler-status", "observed-outcome", "other"] as const;
const fields = ["causalRelevance", "targetExpected", "rewindExpected", "leakage"] as const;

type CausalRelevance = typeof relevance[number];
type Expectation = typeof expectation[number];
type Leakage = typeof leakage[number];
type RatingField = typeof fields[number];

export interface RatingIndex {
  schemaVersion: 1;
  protocol: "r7-blind-expert-v1";
  cohort: "held-out";
  corpusManifestSha256: string;
  sourcePlanFileSha256: string;
  packetCount: number;
  packets: Array<{ filename: string; packetId: string; packetSha256: string }>;
  indexSha256: string;
}

export interface ExpertRating {
  packetId: string;
  causalRelevance: CausalRelevance;
  targetExpected: Expectation;
  rewindExpected: Expectation;
  leakage: Leakage;
  confidence: number;
  reason: string;
}

export interface RatingBundle {
  schemaVersion: 1;
  protocol: "r7-blind-expert-v1";
  raterId: string;
  ratings: ExpertRating[];
}

export interface R7RatingSummary {
  schemaVersion: 1;
  protocol: "r7-blind-expert-v1";
  packetIndexSha256: string;
  packetCount: number;
  raterIds: [string, string];
  adjudicatorId: string;
  agreement: Record<RatingField, { raw: number; kappa: number | null }>;
  disagreementPackets: number;
  expertValid: number;
  expertValidRate: number;
  leakageCounts: Record<Leakage, number>;
  summarySha256: string;
}

export function summarizeR7Ratings(
  index: RatingIndex,
  first: RatingBundle,
  second: RatingBundle,
  adjudication: RatingBundle,
): R7RatingSummary {
  const ids = validateIndex(index);
  validateBundle(first, ids);
  validateBundle(second, ids);
  validateBundle(adjudication, ids);
  if (first.raterId === second.raterId) throw new Error("R7 requires two independent rater IDs");
  if (adjudication.raterId === first.raterId || adjudication.raterId === second.raterId) {
    throw new Error("R7 adjudicator ID must be distinct from both raters");
  }

  const firstById = new Map(first.ratings.map((rating) => [rating.packetId, rating]));
  const secondById = new Map(second.ratings.map((rating) => [rating.packetId, rating]));
  const finalById = new Map(adjudication.ratings.map((rating) => [rating.packetId, rating]));
  const agreement = Object.fromEntries(fields.map((field) => {
    const left = ids.map((id) => firstById.get(id)![field]);
    const right = ids.map((id) => secondById.get(id)![field]);
    return [field, { raw: rawAgreement(left, right), kappa: cohenKappa(left, right) }];
  })) as R7RatingSummary["agreement"];
  const disagreementPackets = ids.filter((id) => fields.some((field) => firstById.get(id)![field] !== secondById.get(id)![field])).length;
  const finalRatings = ids.map((id) => finalById.get(id)!);
  const expertValid = finalRatings.filter((rating) =>
    rating.causalRelevance === "yes"
    && rating.targetExpected === "pass"
    && rating.rewindExpected === "fail"
    && rating.leakage === "none"
  ).length;
  const leakageCounts = Object.fromEntries(leakage.map((value) => [value, finalRatings.filter((rating) => rating.leakage === value).length])) as Record<Leakage, number>;
  const core = {
    schemaVersion: 1 as const,
    protocol: "r7-blind-expert-v1" as const,
    packetIndexSha256: index.indexSha256,
    packetCount: ids.length,
    raterIds: [first.raterId, second.raterId].sort(compareUtf8) as [string, string],
    adjudicatorId: adjudication.raterId,
    agreement,
    disagreementPackets,
    expertValid,
    expertValidRate: expertValid / ids.length,
    leakageCounts,
  };
  return { ...core, summarySha256: canonicalHash("r7-rating-summary", core) };
}

function validateIndex(index: RatingIndex): string[] {
  if (
    index.schemaVersion !== 1
    || index.protocol !== "r7-blind-expert-v1"
    || index.cohort !== "held-out"
    || !/^[0-9a-f]{64}$/.test(index.corpusManifestSha256)
    || !/^[0-9a-f]{64}$/.test(index.sourcePlanFileSha256)
    || !/^[0-9a-f]{64}$/.test(index.indexSha256)
  ) {
    throw new Error("Invalid R7 rating index");
  }
  const { indexSha256, ...core } = index;
  if (canonicalHash("r7-rater-index", core) !== indexSha256) throw new Error("R7 rating index hash mismatch");
  const ids = index.packets.map(({ packetId }) => packetId).sort(compareUtf8);
  const filenames = index.packets.map(({ filename }) => filename);
  if (
    ids.length === 0
    || ids.length !== index.packetCount
    || new Set(ids).size !== ids.length
    || new Set(filenames).size !== filenames.length
    || ids.some((id) => !/^[0-9a-f]{24}$/.test(id))
    || index.packets.some(({ filename, packetSha256 }) => !/^packet-[0-9]{3}\.json$/.test(filename) || !/^[0-9a-f]{64}$/.test(packetSha256))
  ) {
    throw new Error("Invalid R7 packet identities");
  }
  return ids;
}

function validateBundle(bundle: RatingBundle, expectedIds: string[]): void {
  if (bundle.schemaVersion !== 1 || bundle.protocol !== "r7-blind-expert-v1" || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(bundle.raterId)) {
    throw new Error("Invalid R7 rating bundle identity");
  }
  const ids = bundle.ratings.map(({ packetId }) => packetId).sort(compareUtf8);
  if (ids.length !== expectedIds.length || ids.some((id, index) => id !== expectedIds[index])) {
    throw new Error(`Rating bundle ${bundle.raterId} does not cover the exact packet index`);
  }
  for (const rating of bundle.ratings) {
    if (!relevance.includes(rating.causalRelevance) || !expectation.includes(rating.targetExpected) || !expectation.includes(rating.rewindExpected)) {
      throw new Error(`Invalid categorical rating: ${rating.packetId}`);
    }
    if (!leakage.includes(rating.leakage) || !Number.isInteger(rating.confidence) || rating.confidence < 1 || rating.confidence > 5) {
      throw new Error(`Invalid leakage or confidence rating: ${rating.packetId}`);
    }
    if (rating.reason.trim().length < 10 || rating.reason.length > 1_000) throw new Error(`Invalid rating reason: ${rating.packetId}`);
  }
}

function rawAgreement(left: string[], right: string[]): number {
  return left.filter((value, index) => value === right[index]).length / left.length;
}

function cohenKappa(left: string[], right: string[]): number | null {
  const observed = rawAgreement(left, right);
  const labels = new Set([...left, ...right]);
  let expected = 0;
  for (const label of labels) {
    expected += left.filter((value) => value === label).length / left.length
      * right.filter((value) => value === label).length / right.length;
  }
  return expected === 1 ? null : (observed - expected) / (1 - expected);
}
