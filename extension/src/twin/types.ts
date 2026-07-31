import type { EvidenceRef } from "../recorder/events";
import type {
  FixtureBlobRef,
  FixtureManifest,
  FixtureState,
  TrustedFixtureCommand,
} from "./fixture-contract";

export type TwinState = "preparing" | "ready" | "running" | "completed" | "failed" | "cleaning" | "cleaned";

export interface SnapshotFile {
  path: string;
  sha256: string;
  mode: "100644" | "100755";
}

export interface SanitizedSnapshot {
  schemaVersion: 1;
  id: string;
  projectId: string;
  state: "mutated";
  treeHash: string;
  participantCommit: string;
  files: SnapshotFile[];
  mutationId: string;
  mutationSha256: string;
  createdAt: string;
}

export interface CreateSnapshotInput {
  projectId: string;
  sourceRevision: string;
  mutationId: string;
  mutation: EvidenceRef;
  allowedFiles: string[];
}

export interface TrustedFixtureRecord {
  manifestHash: string;
  manifest: FixtureManifest;
  node: { handle: "fixture-node"; version: string; executableSha256: string };
  blobs: {
    harness: { localHandle: string; ref: FixtureBlobRef };
    oracle: { localHandle: string; ref: FixtureBlobRef };
    mutation: { localHandle: string; ref: FixtureBlobRef };
    repair: { localHandle: string; ref: FixtureBlobRef };
  };
}

export interface TrustedFixtureRequest {
  executionId: string;
  projectId: string;
  fixtureId: string;
  manifestHash: string;
  stateId: FixtureState["id"];
  commandId: string;
  twinHandle: string;
}

export interface CommandResult {
  executionId: string;
  commandId: string;
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  stdout: EvidenceRef;
  stderr: EvidenceRef;
}

export interface CommandRegistrySnapshot {
  schemaVersion: 1;
  projectId: string;
  commands: TrustedFixtureCommand[];
  sha256: string;
}

export interface TwinSession {
  handle: string;
  projectId: string;
  snapshotId: string;
  state: TwinState;
  createdAt: string;
  failure: string | null;
}
