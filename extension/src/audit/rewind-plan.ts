import { assertRelPath, canonicalHash, compareUtf8 } from "../rnd/canonical";

export const r7RewindCompilerProtocol = "r7-rewind-v1" as const;

export interface RewindSource {
  path: string;
  baseBlobSha1: string | null;
  targetBlobSha1: string | null;
}

export interface RewindSemanticRef {
  path: string;
  symbol: string;
  kind: "function" | "method" | "class" | "module-boundary";
  changedLineSha256: string[];
}

export interface RewindCompilerInput {
  corpusManifestSha256: string;
  patchEvidenceSha256: string;
  repositoryId: string;
  ordinal: number;
  baseCommit: string;
  targetCommit: string;
  nodeVersion: string;
  packageManager: "npm" | "pnpm" | "yarn";
  packageManagerVersion: string;
  installArgv: string[];
  testArgv: string[];
  sources: RewindSource[];
  attributedTestPaths: string[];
  semantic: RewindSemanticRef | null;
}

export interface ParticipantRewindExperience {
  schemaVersion: 1;
  compilerProtocol: typeof r7RewindCompilerProtocol;
  experienceId: string;
  repositoryId: string;
  seam: Pick<RewindSemanticRef, "path" | "symbol" | "kind">;
  writablePaths: string[];
  attributedTestPaths: string[];
  attentionBudgetSeconds: 600;
  observationLabel: "registered-check-outcome";
}

export interface InternalRewindPlan {
  schemaVersion: 1;
  compilerProtocol: typeof r7RewindCompilerProtocol;
  corpusManifestSha256: string;
  patchEvidenceSha256: string;
  repositoryId: string;
  ordinal: number;
  baseCommit: string;
  targetCommit: string;
  nodeVersion: string;
  packageManager: RewindCompilerInput["packageManager"];
  packageManagerVersion: string;
  installArgv: string[];
  testArgv: string[];
  sources: Array<Required<RewindSource>>;
  attributedTestPaths: string[];
  semantic: RewindSemanticRef;
  mutationOperator: "whole-file-base-rewind";
  participantProjectionSha256: string;
  internalPlanSha256: string;
}

export type RewindCompileResult =
  | { status: "compiled"; internal: InternalRewindPlan; participant: ParticipantRewindExperience }
  | { status: "unsupported-source-rewind"; unsupportedPaths: string[] }
  | { status: "unsupported-semantic-boundary" };

export function compileRewindPlan(input: RewindCompilerInput): RewindCompileResult {
  validateInput(input);
  const sources = input.sources
    .map((source) => ({ ...source }))
    .sort((left, right) => compareUtf8(left.path, right.path));
  const unsupportedPaths = sources
    .filter(({ baseBlobSha1, targetBlobSha1 }) => baseBlobSha1 === null || targetBlobSha1 === null)
    .map(({ path }) => path);
  if (unsupportedPaths.length > 0) return { status: "unsupported-source-rewind", unsupportedPaths };
  if (input.semantic === null) return { status: "unsupported-semantic-boundary" };

  const participantCore = {
    schemaVersion: 1 as const,
    compilerProtocol: r7RewindCompilerProtocol,
    repositoryId: input.repositoryId,
    seam: {
      path: input.semantic.path,
      symbol: input.semantic.symbol,
      kind: input.semantic.kind,
    },
    writablePaths: sources.map(({ path }) => path),
    attributedTestPaths: [...input.attributedTestPaths].sort(compareUtf8),
    attentionBudgetSeconds: 600 as const,
    observationLabel: "registered-check-outcome" as const,
  };
  const participant: ParticipantRewindExperience = {
    ...participantCore,
    experienceId: canonicalHash("r7-rewind-experience", participantCore),
  };
  const internalCore = {
    schemaVersion: 1 as const,
    compilerProtocol: r7RewindCompilerProtocol,
    corpusManifestSha256: input.corpusManifestSha256,
    patchEvidenceSha256: input.patchEvidenceSha256,
    repositoryId: input.repositoryId,
    ordinal: input.ordinal,
    baseCommit: input.baseCommit,
    targetCommit: input.targetCommit,
    nodeVersion: input.nodeVersion,
    packageManager: input.packageManager,
    packageManagerVersion: input.packageManagerVersion,
    installArgv: [...input.installArgv],
    testArgv: [...input.testArgv],
    sources: sources as Array<Required<RewindSource>>,
    attributedTestPaths: [...participant.attributedTestPaths],
    semantic: structuredClone(input.semantic),
    mutationOperator: "whole-file-base-rewind" as const,
    participantProjectionSha256: canonicalHash("r7-rewind-participant", participant),
  };
  return {
    status: "compiled",
    participant,
    internal: {
      ...internalCore,
      internalPlanSha256: canonicalHash("r7-rewind-plan", internalCore),
    },
  };
}

function validateInput(input: RewindCompilerInput): void {
  assertSha256(input.corpusManifestSha256, "corpusManifestSha256");
  assertSha256(input.patchEvidenceSha256, "patchEvidenceSha256");
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(input.repositoryId)) throw new Error("Invalid repositoryId");
  if (!Number.isSafeInteger(input.ordinal) || input.ordinal < 1 || input.ordinal > 60) throw new Error("Invalid ordinal");
  assertOid(input.baseCommit, "baseCommit");
  assertOid(input.targetCommit, "targetCommit");
  if (input.baseCommit === input.targetCommit) throw new Error("Patch revisions must differ");
  assertArgv(input.installArgv, "installArgv");
  assertArgv(input.testArgv, "testArgv");
  if (input.sources.length === 0) throw new Error("Rewind plan requires source paths");
  const paths = new Set<string>();
  for (const source of input.sources) {
    assertRelPath(source.path);
    if (paths.has(source.path)) throw new Error(`Duplicate source path: ${source.path}`);
    paths.add(source.path);
    if (source.baseBlobSha1 !== null) assertOid(source.baseBlobSha1, "baseBlobSha1");
    if (source.targetBlobSha1 !== null) assertOid(source.targetBlobSha1, "targetBlobSha1");
  }
  for (const path of input.attributedTestPaths) assertRelPath(path);
  if (input.semantic !== null) {
    assertRelPath(input.semantic.path);
    if (!paths.has(input.semantic.path)) throw new Error("Semantic path is outside writable sources");
    if (!input.semantic.symbol) throw new Error("Semantic symbol is empty");
    input.semantic.changedLineSha256.forEach((hash) => assertSha256(hash, "changedLineSha256"));
  }
}

function assertArgv(argv: readonly string[], label: string): void {
  if (argv.length === 0 || argv.some((part) => !part || /[\0\r\n]/.test(part))) throw new Error(`${label} is invalid`);
}

function assertOid(value: string, label: string): void {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`${label} must be a full Git SHA-1`);
}

function assertSha256(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${label} must be lowercase SHA-256`);
}
