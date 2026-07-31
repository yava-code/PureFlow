import { assertBoundedText, assertGitOid, assertSchemaVersion, assertToken, type SchemaVersion } from "../agent/types";
import { assertRelPath, assertSha256, canonicalHash, canonicalJson, compareUtf8, rawSha256 } from "../rnd/canonical";
import { assertRunSequence, type EvidenceRef, type RunEnvelope } from "../recorder/events";
import type { RevisionDiff, RevisionFileChange } from "./diff";
import { extractChangedSymbols } from "./symbols";

export type SemanticUnitKind = "function" | "method" | "class" | "module-boundary";

export interface SemanticUnitDraft {
  path: string;
  symbol: string;
  kind: SemanticUnitKind;
  changedLineSha256: string[];
}

export interface SemanticUnit extends SemanticUnitDraft {
  id: string;
  attribution:
    | { status: "attributed"; intentHash: string; evidence: EvidenceRef[] }
    | { status: "unattributed"; gaps: string[] };
}

export interface CandidateSeam {
  schemaVersion: SchemaVersion;
  id: string;
  projectId: string;
  sourceRunId: string;
  baseRevision: string;
  targetRevision: string;
  unit: SemanticUnit;
  linkedChecks: string[];
  evidence: EvidenceRef[];
  gaps: string[];
  factors: {
    blastRadius: number | null;
    novelty: number | null;
    evidenceGap: number | null;
    capabilityAgeMs: number | null;
    estimatedAttentionMinutes: number;
  };
}

export type ExtractionReason =
  | "unsupported-language"
  | "unsupported-syntax"
  | "ambiguous-symbol"
  | "no-changed-unit"
  | "missing-test-link"
  | "partial-parse";

export interface CheckLink {
  path: string;
  symbol: string;
  checks: string[];
}

export interface ChangeEvidenceInput {
  schemaVersion: SchemaVersion;
  projectId: string;
  sourceRunId: string;
  baseRevision: string;
  targetRevision: string;
  diff: RevisionDiff;
  links: CheckLink[];
  events: RunEnvelope[];
}

interface ExtractionContext {
  schemaVersion: SchemaVersion;
  projectId: string;
  sourceRunId: string;
  baseRevision: string;
  targetRevision: string;
}

export type ExtractionResult = ExtractionContext & (
  | { status: "supported"; seams: CandidateSeam[] }
  | { status: "partial"; seams: CandidateSeam[]; reasons: ExtractionReason[] }
  | { status: "unsupported"; seams: []; reasons: ExtractionReason[] }
);

export function extractChangeEvidence(input: ChangeEvidenceInput): ExtractionResult {
  validateInput(input);
  const context: ExtractionContext = {
    schemaVersion: input.schemaVersion,
    projectId: input.projectId,
    sourceRunId: input.sourceRunId,
    baseRevision: input.baseRevision,
    targetRevision: input.targetRevision,
  };
  const reasons = new Set<ExtractionReason>();
  const drafts: SemanticUnitDraft[] = [];
  let sawTypeScript = false;

  for (const change of input.diff.files) {
    const path = change.afterPath ?? change.beforePath;
    if (path === undefined) continue;
    const linkedPath = input.links.some((link) => link.path === path || link.path === change.beforePath);
    const typeScript = isTypeScript(path);
    if (!typeScript && !linkedPath) continue;
    sawTypeScript ||= typeScript;
    const result = extractChangedSymbols(change);
    result.reasons.forEach((reason) => reasons.add(reason));
    drafts.push(...result.units);
  }

  if (!sawTypeScript && input.diff.files.length > 0) reasons.add("unsupported-language");
  if (drafts.length === 0 && reasons.size === 0) reasons.add("no-changed-unit");

  const first = input.events[0]!.event;
  if (first.type !== "task.started") throw new Error("Run evidence must start with task.started");
  const fileEvents = input.events.filter((envelope) => envelope.event.type === "file.changed");
  const tests = input.events.filter((envelope) => envelope.event.type === "test.finished");
  const seams: CandidateSeam[] = [];

  for (const draft of uniqueDrafts(drafts)) {
    const link = input.links.find((candidate) => candidate.path === draft.path && candidate.symbol === draft.symbol);
    if (link === undefined) {
      reasons.add("missing-test-link");
      continue;
    }

    const change = input.diff.files.find((candidate) => (candidate.afterPath ?? candidate.beforePath) === draft.path);
    if (change === undefined) throw new Error(`Missing revision change for ${draft.path}`);
    const fileEnvelope = fileEvents.find((envelope) => envelope.event.type === "file.changed" && envelope.event.path === draft.path);
    const diffEvidence = fileEnvelope?.event.type === "file.changed" ? fileEnvelope.event.diff : undefined;
    if (fileEnvelope?.event.type === "file.changed") verifyFileEvent(change, fileEnvelope.event);

    const testEvidence = tests
      .filter((envelope) => envelope.event.type === "test.finished" && link.checks.includes(envelope.event.testId))
      .map((envelope) => envelope.event.type === "test.finished" ? envelope.event.output : undefined)
      .filter((value): value is EvidenceRef => value !== undefined);
    const evidence = uniqueEvidence([...(diffEvidence === undefined ? [] : [diffEvidence]), ...testEvidence]);
    const unitEvidence = diffEvidence === undefined ? [] : [structuredClone(diffEvidence)];
    const unit: SemanticUnit = {
      ...structuredClone(draft),
      id: unitId(draft),
      attribution: diffEvidence === undefined
        ? { status: "unattributed", gaps: ["missing-change-evidence"] }
        : { status: "attributed", intentHash: first.intentHash, evidence: unitEvidence },
    };

    const gaps = [
      "blast-radius-unavailable",
      "capability-age-unavailable",
      "novelty-unavailable",
    ];
    if (diffEvidence === undefined) gaps.push("missing-change-evidence");
    for (const check of link.checks) {
      if (!tests.some((envelope) => envelope.event.type === "test.finished" && envelope.event.testId === check)) {
        gaps.push(`missing-test-evidence:${check}`);
      }
    }
    gaps.sort(compareUtf8);

    const missing = (diffEvidence === undefined ? 1 : 0) + link.checks.filter((check) =>
      !tests.some((envelope) => envelope.event.type === "test.finished" && envelope.event.testId === check),
    ).length;
    const evidenceGap = missing / (1 + link.checks.length);
    const seamCore = {
      schemaVersion: 1 as const,
      projectId: input.projectId,
      sourceRunId: input.sourceRunId,
      baseRevision: input.baseRevision,
      targetRevision: input.targetRevision,
      unitId: unit.id,
      linkedChecks: link.checks,
    };
    seams.push({
      schemaVersion: 1,
      id: `seam_${canonicalHash("candidate-seam", seamCore)}`,
      projectId: input.projectId,
      sourceRunId: input.sourceRunId,
      baseRevision: input.baseRevision,
      targetRevision: input.targetRevision,
      unit,
      linkedChecks: [...link.checks],
      evidence,
      gaps,
      factors: {
        blastRadius: null,
        novelty: null,
        evidenceGap,
        capabilityAgeMs: null,
        estimatedAttentionMinutes: 5,
      },
    });
  }

  seams.sort((left, right) => compareUtf8(left.unit.path, right.unit.path) || compareUtf8(left.unit.symbol, right.unit.symbol) || compareUtf8(left.id, right.id));
  const sortedReasons = [...reasons].sort(compareUtf8);
  if (seams.length === 0) {
    if (sortedReasons.length === 0) sortedReasons.push("no-changed-unit");
    return { ...context, status: "unsupported", seams: [], reasons: sortedReasons };
  }
  if (sortedReasons.length > 0) return { ...context, status: "partial", seams, reasons: sortedReasons };
  return { ...context, status: "supported", seams };
}

function validateInput(input: ChangeEvidenceInput): void {
  assertSchemaVersion(input.schemaVersion);
  assertToken(input.projectId, "projectId");
  assertToken(input.sourceRunId, "sourceRunId");
  assertGitOid(input.baseRevision, "baseRevision");
  assertGitOid(input.targetRevision, "targetRevision");
  if (input.diff.baseRevision !== input.baseRevision || input.diff.targetRevision !== input.targetRevision) {
    throw new Error("Diff revision identity does not match extraction context");
  }
  if (input.diff.files.length > 256) throw new Error("Revision diff exceeds 256 changed files");
  let previousPath: string | undefined;
  for (const change of input.diff.files) {
    validateChange(change);
    const path = change.afterPath ?? change.beforePath!;
    if (previousPath !== undefined && compareUtf8(previousPath, path) >= 0) {
      throw new Error("Revision changes must be sorted by unique relative path");
    }
    previousPath = path;
  }
  assertRunSequence(input.events);
  if (input.events.length < 2) throw new Error("Extraction requires terminal run evidence");
  const first = input.events[0]!;
  const last = input.events.at(-1)!;
  if (first.projectId !== input.projectId || first.runId !== input.sourceRunId) throw new Error("Flight Recorder run identity mismatch");
  if (first.event.type !== "task.started" || first.event.baseRevision !== input.baseRevision) {
    throw new Error("Flight Recorder base revision mismatch");
  }
  if (
    last.event.type !== "run.finished" ||
    last.event.status !== "succeeded" ||
    last.event.targetRevision !== input.targetRevision
  ) {
    throw new Error("Extraction requires a matching succeeded target revision");
  }

  const keys = new Set<string>();
  for (const link of input.links) {
    assertRelPath(link.path);
    assertBoundedText(link.symbol, 256, "linked symbol");
    if (link.symbol.length === 0) throw new Error("linked symbol cannot be empty");
    if (link.checks.length === 0) throw new Error("A check link requires at least one check");
    assertSortedTokens(link.checks, "linked checks");
    const key = `${link.path}\0${link.symbol}`;
    if (keys.has(key)) throw new Error(`Duplicate check link: ${link.path}:${link.symbol}`);
    keys.add(key);
  }
  const ordered = [...input.links].sort((left, right) => compareUtf8(left.path, right.path) || compareUtf8(left.symbol, right.symbol));
  if (input.links.some((link, index) => link !== ordered[index])) throw new Error("Check links must be canonically ordered");
}

function verifyFileEvent(change: RevisionFileChange, event: Extract<RunEnvelope["event"], { type: "file.changed" }>): void {
  if (change.beforeText !== undefined && rawSha256(Buffer.from(change.beforeText, "utf8")) !== event.beforeSha256) {
    throw new Error(`Flight Recorder before hash mismatch for ${event.path}`);
  }
  if (change.afterText !== undefined && rawSha256(Buffer.from(change.afterText, "utf8")) !== event.afterSha256) {
    throw new Error(`Flight Recorder after hash mismatch for ${event.path}`);
  }
}

function unitId(draft: SemanticUnitDraft): string {
  const value = {
    schemaVersion: 1,
    path: draft.path,
    symbol: draft.symbol,
    kind: draft.kind,
    changedLineSha256: draft.changedLineSha256,
  };
  return `unit_${canonicalHash("semantic-unit", value)}`;
}

function uniqueDrafts(drafts: SemanticUnitDraft[]): SemanticUnitDraft[] {
  const values = new Map<string, SemanticUnitDraft>();
  for (const draft of drafts) {
    assertRelPath(draft.path);
    assertBoundedText(draft.symbol, 256, "semantic symbol");
    if (draft.symbol.length === 0) throw new Error("semantic symbol cannot be empty");
    draft.changedLineSha256.forEach((hash) => assertSha256(hash, "changed line hash"));
    const key = `${draft.path}\0${draft.symbol}\0${draft.kind}`;
    const existing = values.get(key);
    values.set(key, {
      ...draft,
      changedLineSha256: [...new Set([...(existing?.changedLineSha256 ?? []), ...draft.changedLineSha256])].sort(compareUtf8),
    });
  }
  return [...values.values()].sort((left, right) => compareUtf8(left.path, right.path) || compareUtf8(left.symbol, right.symbol));
}

function uniqueEvidence(refs: EvidenceRef[]): EvidenceRef[] {
  const values = new Map<string, EvidenceRef>();
  for (const ref of refs) {
    const existing = values.get(ref.id);
    if (existing !== undefined && canonicalJson(existing) !== canonicalJson(ref)) {
      throw new Error(`Evidence ID ${ref.id} resolves to different records`);
    }
    values.set(ref.id, structuredClone(ref));
  }
  return [...values.values()].sort((left, right) => compareUtf8(left.id, right.id));
}

function assertSortedTokens(values: readonly string[], label: string): void {
  let previous: string | undefined;
  for (const value of values) {
    assertToken(value, label);
    if (previous !== undefined && compareUtf8(previous, value) >= 0) throw new Error(`${label} must be sorted and unique`);
    previous = value;
  }
}

function validateChange(change: RevisionFileChange): void {
  if (!["added", "modified", "deleted", "renamed"].includes(change.status)) throw new Error("Unknown revision change status");
  for (const path of [change.beforePath, change.afterPath]) {
    if (path === undefined) continue;
    assertRelPath(path);
    if (Buffer.byteLength(path, "utf8") > 1024) throw new Error("Changed path exceeds 1024 UTF-8 bytes");
  }
  const validShape =
    (change.status === "added" && change.beforePath === undefined && change.beforeText === undefined && change.afterPath !== undefined && change.afterText !== undefined) ||
    (change.status === "deleted" && change.beforePath !== undefined && change.beforeText !== undefined && change.afterPath === undefined && change.afterText === undefined) ||
    (change.status === "modified" && change.beforePath !== undefined && change.beforeText !== undefined && change.afterPath === change.beforePath && change.afterText !== undefined) ||
    (change.status === "renamed" && change.beforePath !== undefined && change.beforeText !== undefined && change.afterPath !== undefined && change.afterText !== undefined && change.beforePath !== change.afterPath);
  if (!validShape) throw new Error(`Invalid ${change.status} revision change shape`);
  for (const text of [change.beforeText, change.afterText]) {
    if (text !== undefined && Buffer.byteLength(text, "utf8") > 1024 * 1024) throw new Error("Changed source exceeds 1048576 bytes");
  }
  for (const [label, lines] of [["before", change.beforeChangedLines], ["after", change.afterChangedLines]] as const) {
    let previous = 0;
    for (const line of lines) {
      if (!Number.isSafeInteger(line) || line < 1 || line <= previous) throw new Error(`${label} changed lines must be sorted unique positive integers`);
      previous = line;
    }
  }
}

function isTypeScript(path: string): boolean {
  return (path.endsWith(".ts") || path.endsWith(".tsx")) && !path.endsWith(".d.ts");
}
