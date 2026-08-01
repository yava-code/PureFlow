export interface RewindRunReceipt {
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutSha256: string;
  stderrSha256: string;
}

export interface RewindRunEvidence {
  install: RewindRunReceipt;
  targetControl: RewindRunReceipt;
  mutation: RewindRunReceipt[];
  repair: RewindRunReceipt[];
  integrityPassed: boolean;
}

export type RewindExecutionStatus =
  | "valid"
  | "target-control-failed"
  | "mutation-did-not-fail"
  | "mutation-not-reproducible"
  | "repair-failed"
  | "integrity-failed"
  | "execution-error"
  | "cleanup-failed";

export function classifyRewindEvidence(evidence: RewindRunEvidence): RewindExecutionStatus {
  if (evidence.mutation.length !== 3 || evidence.repair.length !== 3) throw new Error("R7 requires three mutation and repair runs");
  const receipts = [evidence.install, evidence.targetControl, ...evidence.mutation, ...evidence.repair];
  if (receipts.some(({ exitCode, timedOut }) => timedOut || exitCode === null)) return "execution-error";
  if (evidence.install.exitCode !== 0 || evidence.targetControl.exitCode !== 0) return "target-control-failed";
  if (!evidence.integrityPassed) return "integrity-failed";
  const mutationFailures = evidence.mutation.map(({ exitCode }) => exitCode !== 0);
  if (mutationFailures.every((failed) => !failed)) return "mutation-did-not-fail";
  if (!mutationFailures.every(Boolean)) return "mutation-not-reproducible";
  if (evidence.repair.some(({ exitCode }) => exitCode !== 0)) return "repair-failed";
  return "valid";
}
