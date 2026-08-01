import { canonicalHash, compareUtf8 } from "../rnd/canonical";
import { assertRewindExecutionIntegrity, type RewindExecutionReport } from "./rewind-execute";
import type { RewindCompileResult } from "./rewind-plan";
import type { RewindPatch } from "./rewind-prepare";

export interface RewindPlanFile {
  schemaVersion: 1;
  corpusManifestSha256: string;
  cohort: "development" | "held-out";
  records: Array<{ patch: RewindPatch; result: RewindCompileResult }>;
}

export interface RewindResultFile {
  schemaVersion: 1;
  corpusManifestSha256: string;
  cohort: "development" | "held-out";
  patch: RewindPatch;
  compileResult: RewindCompileResult;
  execution: RewindExecutionReport | null;
}

export interface RewindAuditSummary {
  schemaVersion: 1;
  compilerProtocol: "r7-rewind-v1";
  corpusManifestSha256: string;
  cohort: "development" | "held-out";
  totalPatches: number;
  compiledPatches: number;
  compileAbstentions: number;
  validEpisodes: number;
  validProbes: number;
  compileRate: Rate;
  executableValidityRate: Rate;
  endToEndEpisodeRate: Rate;
  endToEndProbeRate: Rate;
  statusCounts: Record<string, number>;
  medianExecutionMs: number | null;
  totalExecutionMs: number;
  developmentFloorPassed: boolean | null;
  resultReportSha256s: string[];
  summarySha256: string;
}

interface Rate {
  numerator: number;
  denominator: number;
  value: number | null;
}

export function summarizeRewindAudit(plans: RewindPlanFile, results: RewindResultFile[]): RewindAuditSummary {
  if (plans.schemaVersion !== 1 || !/^[0-9a-f]{64}$/.test(plans.corpusManifestSha256)) {
    throw new Error("Invalid R7 plan file identity");
  }
  const planned = new Map<string, RewindPlanFile["records"][number]>();
  for (const record of plans.records) {
    const key = patchKey(record.patch);
    if (planned.has(key)) throw new Error(`Duplicate planned patch: ${key}`);
    planned.set(key, record);
  }

  const observed = new Map<string, RewindResultFile>();
  for (const result of results) {
    const key = patchKey(result.patch);
    if (observed.has(key)) throw new Error(`Duplicate result patch: ${key}`);
    const expected = planned.get(key);
    if (expected === undefined) throw new Error(`Unexpected result patch: ${key}`);
    if (result.schemaVersion !== 1 || result.corpusManifestSha256 !== plans.corpusManifestSha256 || result.cohort !== plans.cohort) {
      throw new Error(`Result identity mismatch: ${key}`);
    }
    if (canonicalHash("r7-summary-patch", result.patch) !== canonicalHash("r7-summary-patch", expected.patch)) {
      throw new Error(`Result patch mismatch: ${key}`);
    }
    if (canonicalHash("r7-summary-compile", result.compileResult) !== canonicalHash("r7-summary-compile", expected.result)) {
      throw new Error(`Compile result mismatch: ${key}`);
    }
    if (expected.result.status !== "compiled" || result.execution === null) {
      throw new Error(`Result does not contain a compiled execution: ${key}`);
    }
    if (result.execution.internalPlanSha256 !== expected.result.internal.internalPlanSha256) {
      throw new Error(`Execution plan mismatch: ${key}`);
    }
    assertRewindExecutionIntegrity(result.execution);
    observed.set(key, result);
  }

  const compiled = plans.records.filter(({ result }) => result.status === "compiled");
  for (const { patch } of compiled) {
    const key = patchKey(patch);
    if (!observed.has(key)) throw new Error(`Missing execution result: ${key}`);
  }
  if (observed.size !== compiled.length) throw new Error("Execution result count mismatch");

  const executions = [...observed.values()].map(({ execution }) => execution!);
  const validEpisodes = executions.filter(({ recoveryValid }) => recoveryValid).length;
  const validProbes = executions.filter(({ probeValid }) => probeValid).length;
  const statusCounts: Record<string, number> = {};
  for (const { result } of plans.records) statusCounts[result.status] = (statusCounts[result.status] ?? 0) + 1;
  for (const execution of executions) statusCounts[execution.status] = (statusCounts[execution.status] ?? 0) + 1;
  const durations = executions.map(executionMs).sort((left, right) => left - right);
  const core = {
    schemaVersion: 1 as const,
    compilerProtocol: "r7-rewind-v1" as const,
    corpusManifestSha256: plans.corpusManifestSha256,
    cohort: plans.cohort,
    totalPatches: plans.records.length,
    compiledPatches: compiled.length,
    compileAbstentions: plans.records.length - compiled.length,
    validEpisodes,
    validProbes,
    compileRate: rate(compiled.length, plans.records.length),
    executableValidityRate: rate(validEpisodes, compiled.length),
    endToEndEpisodeRate: rate(validEpisodes, plans.records.length),
    endToEndProbeRate: rate(validProbes, plans.records.length),
    statusCounts: Object.fromEntries(Object.entries(statusCounts).sort(([left], [right]) => compareUtf8(left, right))),
    medianExecutionMs: median(durations),
    totalExecutionMs: durations.reduce((sum, value) => sum + value, 0),
    developmentFloorPassed: plans.cohort === "development"
      ? validEpisodes / plans.records.length >= 0.6 && validProbes / plans.records.length >= 0.5
      : null,
    resultReportSha256s: executions.map(({ reportSha256 }) => reportSha256).sort(),
  };
  return { ...core, summarySha256: canonicalHash("r7-rewind-summary", core) };
}

function patchKey(patch: RewindPatch): string {
  return `${patch.repositoryId}/${patch.ordinal}`;
}

function rate(numerator: number, denominator: number): Rate {
  return { numerator, denominator, value: denominator === 0 ? null : numerator / denominator };
}

function executionMs(report: RewindExecutionReport): number {
  const receipts = [report.install, report.targetControl, ...report.mutation, ...report.repair];
  return report.setupMs.reduce((sum, value) => sum + value, 0)
    + receipts.reduce((sum, receipt) => sum + (receipt?.durationMs ?? 0), 0);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 1 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2;
}
