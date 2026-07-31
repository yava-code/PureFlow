import { compareUtf8 } from "../rnd/canonical";
import type { CandidateSeam, ExtractionResult } from "../change/evidence";

export interface SeamSelection {
  seam: CandidateSeam;
  reasons: string[];
}

export function selectRecoverySeam(result: ExtractionResult): SeamSelection {
  if (result.status !== "supported") {
    throw new Error("Recovery compilation requires fully supported change evidence");
  }
  const eligible = result.seams.filter((seam) =>
    seam.linkedChecks.length > 0 &&
    seam.unit.attribution.status === "attributed" &&
    seam.factors.evidenceGap === 0 &&
    seam.factors.estimatedAttentionMinutes > 0 &&
    seam.factors.estimatedAttentionMinutes <= 10,
  );
  if (eligible.length === 0) throw new Error("No attributed, bounded, test-backed seam is eligible");

  eligible.sort((left, right) =>
    left.factors.estimatedAttentionMinutes - right.factors.estimatedAttentionMinutes ||
    right.linkedChecks.length - left.linkedChecks.length ||
    compareUtf8(left.unit.path, right.unit.path) ||
    compareUtf8(left.unit.symbol, right.unit.symbol) ||
    compareUtf8(left.id, right.id),
  );
  return {
    seam: structuredClone(eligible[0]!),
    reasons: ["attributed-change", "bounded-attention", "test-backed"],
  };
}
