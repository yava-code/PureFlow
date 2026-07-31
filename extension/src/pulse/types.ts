import type { EvidenceKind, EvidenceRef } from "../recorder/events";

export interface ChangeClaim {
  schemaVersion: 1;
  checkpointId: string;
  intent: string;
  changedBehavior: string;
  boundary: { path: string; symbol: string };
  invariant: string;
  evidenceRefs: Array<{ id: string; sha256: string; visibility: "participant" }>;
  unresolvedAssumption?: string;
}

export interface ParticipantProbeSurface {
  prompt: string;
  inputs: Array<{ id: string; label: string }>;
}

export interface SideCoachCapsule {
  schemaVersion: 1;
  claimHash: string;
  claim: {
    intent: string;
    changedBehavior: string;
    boundary: { path: string; symbol: string };
    invariant: string;
    unresolvedAssumption?: string;
  };
  evidence: Array<{ kind: EvidenceKind; sha256: string; mediaType: string; excerpt: string }>;
  probe: ParticipantProbeSurface;
  developerAnswer: string;
}

export interface SideCoachProposal {
  schemaVersion: 1;
  hypothesis: string;
  probeInputId?: string;
  clarification?: string;
}

export interface CatalogControlProbe {
  schemaVersion: 1;
  id: string;
  fixtureId: string;
  fixtureManifestHash: string;
  state: "target" | "mutated";
  checkId: string;
  prompt: string;
}

export interface FixtureControlProbe {
  schemaVersion: 1;
  mode: "fixture";
  id: string;
  projectId: string;
  claimHash: string;
  sourceTreeHash: string;
  fixtureId: string;
  fixtureManifestHash: string;
  participant: ParticipantProbeSurface;
}

export interface ParticipantControlProbe {
  schemaVersion: 1;
  id: string;
  internalProbeHash: string;
  claim: ChangeClaim;
  participant: ParticipantProbeSurface;
}

export interface ControlProbeAttempt {
  schemaVersion: 1;
  id: string;
  projectId: string;
  probeId: string;
  internalProbeHash: string;
  claimHash: string;
  sourceTreeHash: string;
  selectedProbeInputId: string;
  prediction: "passes" | "fails";
  selectedEvidenceIds: string[];
  explanation: string;
  committedAt: string;
}

export interface ControlProbeResult {
  schemaVersion: 1;
  projectId: string;
  probeId: string;
  internalProbeHash: string;
  claimHash: string;
  sourceTreeHash: string;
  attemptHash: string;
  probeInputId: string;
  checkId: string | null;
  commandId: string;
  observation: "passes" | "fails" | "execution-error" | "failed-integrity";
  commandStatus: { exitCode: number | null; timedOut: boolean; cancelled: boolean };
  predictionResult: "confirmed" | "falsified" | "invalid";
  commandResultHash: string | null;
  resultHash: string;
}

export interface OpenedParticipantEvidence {
  projectId: string;
  ref: EvidenceRef & { visibility: "participant" };
  content: string;
}

export interface ValidatedClaim {
  claim: ChangeClaim;
  claimHash: string;
  evidence: OpenedParticipantEvidence[];
}
