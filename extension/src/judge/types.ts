import type { EvidenceRef } from "../recorder/events";
import type { InternalExperience } from "../experience/types";

export interface JudgeResult {
  schemaVersion: 1;
  experienceId: string;
  outcome: "passed" | "partial" | "failed" | "failed-integrity" | "abandoned" | "revealed";
  checks: Array<{ id: string; status: "passed" | "failed"; evidence: EvidenceRef }>;
  hintsUsed: number;
  elapsedMs: number;
  candidateDiffHash?: string;
  resultHash: string;
}

export interface JudgeAttempt {
  experience: InternalExperience;
  twinHandle: string;
  hintsUsed: number;
  elapsedMs: number;
}
