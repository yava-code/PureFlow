import { canonicalHash, compareUtf8 } from "../rnd/canonical";
import {
  validateExpertRating,
  validateRaterId,
  validateRatingBundle,
  validateRatingIndex,
  type ExpertRating,
  type RatingBundle,
  type RatingIndex,
} from "./r7";

const ratingFields = ["causalRelevance", "targetExpected", "rewindExpected", "leakage"] as const;

export interface RaterPacket {
  schemaVersion: 1;
  protocol: "r7-blind-expert-v1";
  packetId: string;
  projectAlias: string;
  seam: { path: string; symbol: string; kind: string };
  writablePaths: string[];
  attributedTestPaths: string[];
  mutationRule: string;
  observation: string;
  sourceAndTestDiff: string;
  questions: string[];
  packetSha256: string;
}

export interface RatingWorkspace {
  schemaVersion: 1;
  protocol: "r7-blind-expert-v1";
  mode: "rater" | "adjudicator";
  packetIndexSha256: string;
  raterId: string;
  sourceBundles?: [RatingBundle, RatingBundle];
  ratings: ExpertRating[];
}

export function createRaterWorkspace(index: RatingIndex, raterId: string): RatingWorkspace {
  validateRatingIndex(index);
  validateRaterId(raterId);
  return {
    schemaVersion: 1,
    protocol: "r7-blind-expert-v1",
    mode: "rater",
    packetIndexSha256: index.indexSha256,
    raterId,
    ratings: [],
  };
}

export function createAdjudicationWorkspace(
  index: RatingIndex,
  first: RatingBundle,
  second: RatingBundle,
  adjudicatorId: string,
): RatingWorkspace {
  const ids = validateRatingIndex(index);
  validateRatingBundle(first, ids);
  validateRatingBundle(second, ids);
  validateRaterId(adjudicatorId);
  if (first.raterId === second.raterId) throw new Error("R7 requires two independent rater IDs");
  if (adjudicatorId === first.raterId || adjudicatorId === second.raterId) {
    throw new Error("R7 adjudicator ID must be distinct from both raters");
  }

  const left = new Map(first.ratings.map((rating) => [rating.packetId, rating]));
  const right = new Map(second.ratings.map((rating) => [rating.packetId, rating]));
  const ratings: ExpertRating[] = [];
  for (const packetId of ids) {
    const firstRating = left.get(packetId)!;
    const secondRating = right.get(packetId)!;
    const changed = ratingFields.filter((field) => firstRating[field] !== secondRating[field]);
    if (changed.length) continue;
    const lowerConfidence = firstRating.confidence <= secondRating.confidence ? firstRating : secondRating;
    ratings.push({
      ...lowerConfidence,
      reason: `Independent raters agreed. ${lowerConfidence.reason}`.slice(0, 1_000),
    });
  }

  return {
    schemaVersion: 1,
    protocol: "r7-blind-expert-v1",
    mode: "adjudicator",
    packetIndexSha256: index.indexSha256,
    raterId: adjudicatorId,
    sourceBundles: [first, second].sort((a, b) => compareUtf8(a.raterId, b.raterId)) as [RatingBundle, RatingBundle],
    ratings: ratings.sort((a, b) => compareUtf8(a.packetId, b.packetId)),
  };
}

export function validatePacket(index: RatingIndex, packet: RaterPacket, filename: string): void {
  validateRatingIndex(index);
  const entry = index.packets.find((candidate) => candidate.filename === filename);
  if (!entry || entry.packetId !== packet.packetId || entry.packetSha256 !== packet.packetSha256) {
    throw new Error(`Packet is not bound to the frozen index: ${filename}`);
  }
  if (packet.schemaVersion !== 1 || packet.protocol !== "r7-blind-expert-v1") {
    throw new Error(`Invalid R7 packet envelope: ${filename}`);
  }
  const { packetSha256, ...core } = packet;
  if (canonicalHash("r7-rater-packet", core) !== packetSha256) {
    throw new Error(`R7 packet hash mismatch: ${filename}`);
  }
}

export function validateWorkspace(index: RatingIndex, workspace: RatingWorkspace): void {
  const ids = new Set(validateRatingIndex(index));
  validateRaterId(workspace.raterId);
  if (
    workspace.schemaVersion !== 1
    || workspace.protocol !== "r7-blind-expert-v1"
    || !["rater", "adjudicator"].includes(workspace.mode)
    || workspace.packetIndexSha256 !== index.indexSha256
  ) {
    throw new Error("Rating workspace does not match the frozen packet index");
  }
  const seen = new Set<string>();
  for (const rating of workspace.ratings) {
    validateExpertRating(rating);
    if (!ids.has(rating.packetId) || seen.has(rating.packetId)) throw new Error(`Invalid workspace coverage: ${rating.packetId}`);
    seen.add(rating.packetId);
  }
  if (workspace.mode === "adjudicator") {
    if (!workspace.sourceBundles || new Set([...workspace.sourceBundles.map(({ raterId }) => raterId), workspace.raterId]).size !== 3) {
      throw new Error("Adjudication workspace requires three distinct identities");
    }
    for (const bundle of workspace.sourceBundles) validateRatingBundle(bundle, [...ids].sort(compareUtf8));
  }
}

export function adjudicationDisagreement(workspace: RatingWorkspace, packetId: string): { first: ExpertRating; second: ExpertRating; fields: string[] } | undefined {
  if (workspace.mode !== "adjudicator" || !workspace.sourceBundles) return undefined;
  const first = workspace.sourceBundles[0].ratings.find((rating) => rating.packetId === packetId);
  const second = workspace.sourceBundles[1].ratings.find((rating) => rating.packetId === packetId);
  if (!first || !second) throw new Error(`Missing adjudication source rating: ${packetId}`);
  const fields = ratingFields.filter((field) => first[field] !== second[field]);
  return fields.length ? { first, second, fields } : undefined;
}

export function saveRating(index: RatingIndex, workspace: RatingWorkspace, rating: ExpertRating): RatingWorkspace {
  validateWorkspace(index, workspace);
  validateExpertRating(rating);
  if (!index.packets.some(({ packetId }) => packetId === rating.packetId)) throw new Error(`Unknown R7 packet: ${rating.packetId}`);
  const ratings = workspace.ratings.filter(({ packetId }) => packetId !== rating.packetId);
  ratings.push(rating);
  return { ...workspace, ratings: ratings.sort((a, b) => compareUtf8(a.packetId, b.packetId)) };
}

export function ratingProgress(index: RatingIndex, workspace: RatingWorkspace): {
  complete: number;
  total: number;
  nextPacketId: string | null;
  pendingPacketIds: string[];
} {
  validateWorkspace(index, workspace);
  const complete = new Set(workspace.ratings.map(({ packetId }) => packetId));
  const pendingPacketIds = index.packets.map(({ packetId }) => packetId).filter((packetId) => !complete.has(packetId));
  return { complete: complete.size, total: index.packetCount, nextPacketId: pendingPacketIds[0] ?? null, pendingPacketIds };
}

export function exportRatingBundle(index: RatingIndex, workspace: RatingWorkspace): RatingBundle {
  const ids = validateRatingIndex(index);
  validateWorkspace(index, workspace);
  const bundle: RatingBundle = {
    schemaVersion: 1,
    protocol: "r7-blind-expert-v1",
    raterId: workspace.raterId,
    ratings: [...workspace.ratings].sort((a, b) => compareUtf8(a.packetId, b.packetId)),
  };
  validateRatingBundle(bundle, ids);
  return bundle;
}
