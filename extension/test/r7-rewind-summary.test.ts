import { describe, expect, it } from "vitest";
import { compileRewindPlan, type RewindCompilerInput } from "../src/audit/rewind-plan";
import type { RewindExecutionReport } from "../src/audit/rewind-execute";
import type { RewindRunReceipt } from "../src/audit/rewind-runner";
import { summarizeRewindAudit, type RewindPlanFile, type RewindResultFile } from "../src/audit/rewind-summary";
import { canonicalHash } from "../src/rnd/canonical";

describe("R7 rewind audit summary", () => {
  it("counts the full cohort, compiled validity, and end-to-end yield separately", () => {
    const plans = planFile();
    const results = [resultFile(plans, 1, "valid"), resultFile(plans, 2, "mutation-did-not-fail")];

    const summary = summarizeRewindAudit(plans, results);

    expect(summary).toMatchObject({
      totalPatches: 3,
      compiledPatches: 2,
      compileAbstentions: 1,
      validEpisodes: 1,
      validProbes: 1,
      compileRate: { numerator: 2, denominator: 3, value: 2 / 3 },
      executableValidityRate: { numerator: 1, denominator: 2, value: 0.5 },
      endToEndEpisodeRate: { numerator: 1, denominator: 3, value: 1 / 3 },
      developmentFloorPassed: false,
      statusCounts: { compiled: 2, "mutation-did-not-fail": 1, "unsupported-source-rewind": 1, valid: 1 },
    });
    expect(summary.summarySha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a result receipt changed after execution", () => {
    const plans = planFile();
    const results = [resultFile(plans, 1, "valid"), resultFile(plans, 2, "valid")];
    results[0]!.execution!.mutation[0]!.exitCode = 0;

    expect(() => summarizeRewindAudit(plans, results)).toThrow("report hash mismatch");
  });

  it("rejects a missing compiled result", () => {
    const plans = planFile();
    expect(() => summarizeRewindAudit(plans, [resultFile(plans, 1, "valid")])).toThrow("Missing execution result");
  });
});

function planFile(): RewindPlanFile {
  const first = compileRewindPlan(input(1));
  const second = compileRewindPlan(input(2));
  const unsupportedInput = input(3);
  unsupportedInput.sources[0]!.baseBlobSha1 = null;
  const unsupported = compileRewindPlan(unsupportedInput);
  return {
    schemaVersion: 1,
    corpusManifestSha256: "a".repeat(64),
    cohort: "development",
    records: [
      { patch: patch(1), result: first },
      { patch: patch(2), result: second },
      { patch: patch(3), result: unsupported },
    ],
  };
}

function resultFile(plans: RewindPlanFile, ordinal: number, status: "valid" | "mutation-did-not-fail"): RewindResultFile {
  const record = plans.records.find(({ patch: value }) => value.ordinal === ordinal)!;
  if (record.result.status !== "compiled") throw new Error("Fixture result is not compiled");
  return {
    schemaVersion: 1,
    corpusManifestSha256: plans.corpusManifestSha256,
    cohort: plans.cohort,
    patch: structuredClone(record.patch),
    compileResult: structuredClone(record.result),
    execution: report(record.result.internal.internalPlanSha256, status),
  };
}

function report(internalPlanSha256: string, status: "valid" | "mutation-did-not-fail"): RewindExecutionReport {
  const pass = receipt(0);
  const fail = receipt(1);
  const core = {
    schemaVersion: 1 as const,
    compilerProtocol: "r7-rewind-v1" as const,
    internalPlanSha256,
    status,
    recoveryValid: status === "valid",
    probeValid: status === "valid",
    install: pass,
    targetControl: pass,
    mutation: status === "valid" ? [fail, fail, fail] : [pass, pass, pass],
    repair: [pass, pass, pass],
    setupMs: [2, 2, 2, 2, 2, 2, 2],
    targetArchiveSha256: "1".repeat(64),
    rewindArchiveSha256: "2".repeat(64),
    repairArchiveSha256: "3".repeat(64),
    targetArchiveBytes: 100,
    rewindArchiveBytes: 50,
    repairArchiveBytes: 50,
    productionInvariantPassed: true,
    cleanupPassed: true,
  };
  return { ...core, reportSha256: canonicalHash("r7-rewind-execution", core) };
}

function receipt(exitCode: number): RewindRunReceipt {
  return {
    exitCode,
    timedOut: false,
    durationMs: 10,
    stdoutBytes: 0,
    stderrBytes: 0,
    stdoutSha256: "4".repeat(64),
    stderrSha256: "5".repeat(64),
  };
}

function patch(ordinal: number) {
  return {
    repositoryId: "repo-a",
    ordinal,
    baseCommit: "b".repeat(40),
    targetCommit: "c".repeat(40),
    evidenceSha256: `${ordinal}`.repeat(64),
    cohort: "development" as const,
  };
}

function input(ordinal: number): RewindCompilerInput {
  return {
    corpusManifestSha256: "a".repeat(64),
    patchEvidenceSha256: `${ordinal}`.repeat(64),
    repositoryId: "repo-a",
    ordinal,
    baseCommit: "b".repeat(40),
    targetCommit: "c".repeat(40),
    nodeVersion: "22.17.0",
    packageManager: "npm",
    packageManagerVersion: "10.9.2",
    installArgv: ["npm", "ci"],
    testArgv: ["npm", "test"],
    sources: [{ path: "src/cache.ts", baseBlobSha1: "d".repeat(40), targetBlobSha1: "e".repeat(40) }],
    attributedTestPaths: ["test/cache.test.ts"],
    semantic: {
      path: "src/cache.ts",
      symbol: "cacheKey",
      kind: "function",
      changedLineSha256: ["f".repeat(64)],
    },
  };
}
