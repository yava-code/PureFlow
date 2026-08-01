import { describe, expect, it } from "vitest";
import { classifyRewindEvidence, type RewindRunEvidence, type RewindRunReceipt } from "../src/audit/rewind-runner";

describe("R7 rewind execution classification", () => {
  it("accepts only three clean failures followed by three clean repairs", () => {
    expect(classifyRewindEvidence(evidence())).toBe("valid");
  });

  it("rejects a mutation that does not break the registered observation", () => {
    const value = evidence();
    value.mutation = [receipt(0), receipt(0), receipt(0)];
    expect(classifyRewindEvidence(value)).toBe("mutation-did-not-fail");
  });

  it("separates an unstable mutation from a consistently surviving one", () => {
    const value = evidence();
    value.mutation[1] = receipt(0);
    expect(classifyRewindEvidence(value)).toBe("mutation-not-reproducible");
  });

  it("never treats a timeout as a predicted failure", () => {
    const value = evidence();
    value.mutation[0] = { ...receipt(null), timedOut: true };
    expect(classifyRewindEvidence(value)).toBe("execution-error");
  });

  it("keeps a broken protected repair distinct from mutation coverage", () => {
    const value = evidence();
    value.repair[2] = receipt(1);
    expect(classifyRewindEvidence(value)).toBe("repair-failed");
  });
});

function evidence(): RewindRunEvidence {
  return {
    install: receipt(0),
    targetControl: receipt(0),
    mutation: [receipt(1), receipt(1), receipt(1)],
    repair: [receipt(0), receipt(0), receipt(0)],
    integrityPassed: true,
  };
}

function receipt(exitCode: number | null): RewindRunReceipt {
  return {
    exitCode,
    timedOut: false,
    durationMs: 10,
    stdoutBytes: 0,
    stderrBytes: 0,
    stdoutSha256: "a".repeat(64),
    stderrSha256: "b".repeat(64),
  };
}
