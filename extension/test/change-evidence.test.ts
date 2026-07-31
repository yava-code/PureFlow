import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GitRevisionDiffReader, parseZeroContextPatch, type RevisionFileChange } from "../src/change/diff";
import { extractChangeEvidence, type ChangeEvidenceInput } from "../src/change/evidence";
import { extractChangedSymbols } from "../src/change/symbols";
import type { RunEnvelope } from "../src/recorder/events";
import { createTenantCacheKeyFixture, type TenantCacheKeyFixture } from "../src/twin/fixture-factory";

const transcriptPath = resolve(import.meta.dirname, "fixtures/v0.3/agent-replay/succeeded.json");
const roots: string[] = [];
const fixtures = new Map<string, TenantCacheKeyFixture>();

afterEach(async () => {
  await Promise.all(roots.splice(0).map(async (root) => {
    const fixture = fixtures.get(root);
    if (fixture) {
      await fixture.dispose();
      fixtures.delete(root);
    } else {
      await rm(root, { recursive: true, force: true });
    }
  }));
});

describe("R2 change evidence", () => {
  it("extracts the fixture's test-backed cacheKey seam deterministically", async () => {
    const fixture = await createFixture();
    const diff = await new GitRevisionDiffReader().read(fixture.root, fixture.baseRevision, fixture.targetRevision);
    const events = await loadEvents();
    const input: ChangeEvidenceInput = {
      schemaVersion: 1,
      projectId: "project_r0_fixture",
      sourceRunId: "run_tenant_cache",
      baseRevision: fixture.baseRevision,
      targetRevision: fixture.targetRevision,
      diff,
      links: fixture.manifest.changedSymbols.map(({ path, symbol }) => ({
        path,
        symbol,
        checks: fixture.manifest.targetChecks,
      })),
      events,
    };

    const first = extractChangeEvidence(input);
    const second = extractChangeEvidence(structuredClone(input));

    expect(second).toEqual(first);
    expect(first.status).toBe("supported");
    if (first.status !== "supported") throw new Error("Fixture extraction unexpectedly failed");
    expect(first.seams).toHaveLength(1);
    expect(first.seams[0]).toMatchObject({
      id: "seam_399963ca630c2692340c063eaa0519597f0e41faa726bb117e94c582c2d75633",
      projectId: input.projectId,
      sourceRunId: input.sourceRunId,
      baseRevision: fixture.baseRevision,
      targetRevision: fixture.targetRevision,
      linkedChecks: ["cache-key.tenant-isolation"],
      unit: {
        id: "unit_b6d20215f29aeccd3aa086184330527ca6e1073875ff44bb4f6d56214265ecae",
        path: "src/cache-key.ts",
        symbol: "cacheKey",
        kind: "function",
        attribution: { status: "attributed", intentHash: events[0]!.event.type === "task.started" ? events[0]!.event.intentHash : "" },
      },
      factors: {
        blastRadius: null,
        novelty: null,
        evidenceGap: 0,
        capabilityAgeMs: null,
        estimatedAttentionMinutes: 5,
      },
    });
    expect(first.seams[0]!.unit.changedLineSha256).toHaveLength(4);
    expect(first.seams[0]!.evidence.map(({ id }) => id)).toEqual([
      "evidence_diff_1",
      "evidence_test_1",
    ]);
    expect(first.seams[0]!.gaps).toEqual([
      "blast-radius-unavailable",
      "capability-age-unavailable",
      "novelty-unavailable",
    ]);
  }, 30_000);

  it("handles file rename, multiple files, added functions, and deleted functions", () => {
    const renamed = change({
      status: "renamed",
      beforePath: "src/old.ts",
      afterPath: "src/new.ts",
      beforeText: "export function stable() { return 1; }\n",
      afterText: "export function stable() { return 1; }\n",
    });
    expect(extractChangedSymbols(renamed)).toEqual({
      units: [{ path: "src/new.ts", symbol: "stable", kind: "function", changedLineSha256: [] }],
      reasons: [],
    });

    const added = change({
      status: "added",
      afterPath: "src/added.ts",
      afterText: "export function added(value: number) {\n  return value + 1;\n}\n",
      afterChangedLines: [1, 2, 3],
    });
    const deleted = change({
      status: "deleted",
      beforePath: "src/deleted.ts",
      beforeText: "export function deleted() {\n  return false;\n}\n",
      beforeChangedLines: [1, 2, 3],
    });
    expect(extractChangedSymbols(added).units).toMatchObject([{ path: "src/added.ts", symbol: "added", kind: "function" }]);
    expect(extractChangedSymbols(deleted).units).toMatchObject([{ path: "src/deleted.ts", symbol: "deleted", kind: "function" }]);

    const input = syntheticInput([added, deleted], [
      { path: "src/added.ts", symbol: "added", checks: ["added.check"] },
      { path: "src/deleted.ts", symbol: "deleted", checks: ["deleted.check"] },
    ]);
    const result = extractChangeEvidence(input);
    expect(result.status).toBe("supported");
    expect(result.seams.map(({ unit }) => `${unit.path}:${unit.symbol}`)).toEqual([
      "src/added.ts:added",
      "src/deleted.ts:deleted",
    ]);
  });

  it("parses zero-context Git hunks without treating headers as source lines", () => {
    const patch = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,2 +1,3 @@",
      "-const a = 1;",
      "-const b = 2;",
      "+const a = 3;",
      "+const b = 4;",
      "+const c = 5;",
      "@@ -8 +9,0 @@",
      "-removed();",
      "",
    ].join("\n");

    expect(parseZeroContextPatch(patch)).toEqual({ before: [1, 2, 8], after: [1, 2, 3] });
  });

  it("selects a class boundary when a changed field is outside its methods", () => {
    const classChange = change({
      status: "modified",
      beforePath: "src/service.ts",
      afterPath: "src/service.ts",
      beforeText: "export class Service {\n  enabled = false;\n  run() { return this.enabled; }\n}\n",
      afterText: "export class Service {\n  enabled = true;\n  run() { return this.enabled; }\n}\n",
      beforeChangedLines: [2],
      afterChangedLines: [2],
    });

    expect(extractChangedSymbols(classChange).units).toMatchObject([
      { path: "src/service.ts", symbol: "Service", kind: "class" },
    ]);
  });

  it("fails honestly for unsupported syntax and missing test links", () => {
    const broken = change({
      status: "modified",
      beforePath: "src/broken.ts",
      afterPath: "src/broken.ts",
      beforeText: "export function okay() { return true; }\n",
      afterText: "export function broken(\n",
      beforeChangedLines: [1],
      afterChangedLines: [1],
    });
    const unsupported = extractChangeEvidence(syntheticInput([broken], []));
    expect(unsupported).toMatchObject({ status: "unsupported", seams: [], reasons: ["unsupported-syntax"] });

    const valid = change({
      status: "modified",
      beforePath: "src/unlinked.ts",
      afterPath: "src/unlinked.ts",
      beforeText: "export function unlinked() { return 1; }\n",
      afterText: "export function unlinked() { return 2; }\n",
      beforeChangedLines: [1],
      afterChangedLines: [1],
    });
    expect(extractChangeEvidence(syntheticInput([valid], []))).toMatchObject({
      status: "unsupported",
      seams: [],
      reasons: ["missing-test-link"],
    });

    const nonTypeScript = change({
      status: "modified",
      beforePath: "src/cache.py",
      afterPath: "src/cache.py",
      beforeText: "def cache(): return 1\n",
      afterText: "def cache(): return 2\n",
      beforeChangedLines: [1],
      afterChangedLines: [1],
    });
    expect(extractChangeEvidence(syntheticInput([nonTypeScript], []))).toMatchObject({
      status: "unsupported",
      seams: [],
      reasons: ["unsupported-language"],
    });
  });

  it("rejects unsafe paths and revision or run identity drift", () => {
    const unsafe = change({
      status: "modified",
      beforePath: "C:/work/src/cache.ts",
      afterPath: "C:/work/src/cache.ts",
      beforeText: "export function cache() { return 1; }\n",
      afterText: "export function cache() { return 2; }\n",
      beforeChangedLines: [1],
      afterChangedLines: [1],
    });
    expect(() => extractChangedSymbols(unsafe)).toThrow("relative");

    const valid = change({
      status: "modified",
      beforePath: "src/cache.ts",
      afterPath: "src/cache.ts",
      beforeText: "export function cache() { return 1; }\n",
      afterText: "export function cache() { return 2; }\n",
      beforeChangedLines: [1],
      afterChangedLines: [1],
    });
    const input = syntheticInput([valid], [{ path: "src/cache.ts", symbol: "cache", checks: ["cache.check"] }]);
    input.diff.targetRevision = "3".repeat(40);
    expect(() => extractChangeEvidence(input)).toThrow("revision identity");

    const runDrift = syntheticInput([valid], [{ path: "src/cache.ts", symbol: "cache", checks: ["cache.check"] }]);
    runDrift.events[0]!.runId = "run_other";
    expect(() => extractChangeEvidence(runDrift)).toThrow("identity");
  });
});

async function createFixture(): Promise<TenantCacheKeyFixture> {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r0b-r2-"));
  roots.push(root);
  const fixture = await createTenantCacheKeyFixture(root);
  fixtures.set(root, fixture);
  return fixture;
}

async function loadEvents(): Promise<RunEnvelope[]> {
  const transcript = JSON.parse(await readFile(transcriptPath, "utf8")) as { events: RunEnvelope[] };
  return transcript.events;
}

function change(input: Partial<RevisionFileChange> & Pick<RevisionFileChange, "status">): RevisionFileChange {
  return {
    status: input.status,
    beforePath: input.beforePath,
    afterPath: input.afterPath,
    beforeText: input.beforeText,
    afterText: input.afterText,
    beforeChangedLines: input.beforeChangedLines ?? [],
    afterChangedLines: input.afterChangedLines ?? [],
  };
}

function syntheticInput(
  files: RevisionFileChange[],
  links: ChangeEvidenceInput["links"],
): ChangeEvidenceInput {
  const baseRevision = "1".repeat(40);
  const targetRevision = "2".repeat(40);
  return {
    schemaVersion: 1,
    projectId: "project_synthetic",
    sourceRunId: "run_synthetic",
    baseRevision,
    targetRevision,
    diff: { baseRevision, targetRevision, files },
    links,
    events: boundaryEvents(baseRevision, targetRevision),
  };
}

function boundaryEvents(baseRevision: string, targetRevision: string): RunEnvelope[] {
  return [
    {
      schemaVersion: 1,
      projectId: "project_synthetic",
      runId: "run_synthetic",
      seq: 1,
      at: "2026-07-31T21:00:00.000Z",
      event: {
        type: "task.started",
        taskId: "task_synthetic",
        baseRevision,
        intentHash: "a".repeat(64),
      },
    },
    {
      schemaVersion: 1,
      projectId: "project_synthetic",
      runId: "run_synthetic",
      seq: 2,
      at: "2026-07-31T21:00:01.000Z",
      event: { type: "run.finished", status: "succeeded", targetRevision },
    },
  ];
}
