import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GitRevisionDiffReader } from "../src/change/diff";
import { extractChangeEvidence, type ExtractionResult } from "../src/change/evidence";
import { FixtureExperienceCompiler, serializeParticipantExperience } from "../src/experience/compile";
import { selectRecoverySeam } from "../src/experience/select";
import { FixturePhaseAJudge } from "../src/judge/run";
import type { ReplayTranscript } from "../src/agent/replay-driver";
import { BuiltinFixtureCatalog } from "../src/twin/catalog";
import {
  FixtureCommandRegistry,
  LocalCommandEvidenceStore,
  MemoryCommandEvidenceStore,
  TrustedFixtureProcessRunner,
} from "../src/twin/commands";
import {
  createTenantCacheKeyFixture,
  EXPECTED_TENANT_CACHE_KEY,
  type TenantCacheKeyFixture,
} from "../src/twin/fixture-factory";
import { TwinManager } from "../src/twin/manager";
import { FixtureSnapshotStore } from "../src/twin/snapshot";
import { NodeLocalTextStorage } from "../src/recorder/store";

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
      await rm(root, { recursive: true, force: true, maxRetries: 3 });
    }
  }));
});

describe("R4 Experience Compiler and Phase-A Judge", () => {
  it("compiles one deterministic recovery episode and a strict participant projection", async () => {
    const env = await setup();
    const extraction = await fixtureExtraction();
    const first = await env.compiler.compile({
      extraction,
      fixtureId: "tenant-cache-key",
      manifestHash: EXPECTED_TENANT_CACHE_KEY.manifestHash,
    });
    const second = await env.compiler.compile({
      extraction,
      fixtureId: "tenant-cache-key",
      manifestHash: EXPECTED_TENANT_CACHE_KEY.manifestHash,
    });

    expect(first.selectionReasons).toEqual([
      "attributed-change",
      "bounded-attention",
      "fixture-supported",
      "test-backed",
    ]);
    expect(first.internal).toMatchObject({
      kind: "recover",
      projectId: "project_r0_fixture",
      sourceRunId: "run_tenant_cache",
      sourceBaseRevision: EXPECTED_TENANT_CACHE_KEY.baseRevision,
      sourceTargetRevision: EXPECTED_TENANT_CACHE_KEY.targetRevision,
      snapshotTreeHash: EXPECTED_TENANT_CACHE_KEY.mutatedTreeHash,
      scope: {
        symbols: ["src/cache-key.ts#cacheKey"],
        tests: ["cache-key.tenant-isolation"],
        concepts: ["tested-boundary-recovery"],
      },
    });
    expect(second.internal.commandRegistryHash).toBe(first.internal.commandRegistryHash);
    expect(second.internal.snapshotTreeHash).toBe(first.internal.snapshotTreeHash);

    const serialized = serializeParticipantExperience(first.participant);
    expect(JSON.parse(serialized)).toEqual(first.participant);
    for (const forbidden of [
      "sourceRunId",
      "sourceBaseRevision",
      "sourceTargetRevision",
      "commandRegistryHash",
      "judge",
      "hiddenAnswer",
      "setup",
      EXPECTED_TENANT_CACHE_KEY.targetRevision,
      first.internal.hiddenAnswer.sha256,
      resolve("D:/pureflow"),
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    const injected = { ...first.participant, sourceRunId: "leak" };
    expect(() => serializeParticipantExperience(injected as typeof first.participant)).toThrow("unknown");
  }, 45_000);

  it("rejects partial, untested, and fixture-mismatched seams", async () => {
    const extraction = await fixtureExtraction();
    expect(selectRecoverySeam(extraction).seam).toBeDefined();

    const partial = { ...extraction, status: "partial", reasons: ["partial-parse"] } as ExtractionResult;
    expect(() => selectRecoverySeam(partial)).toThrow("supported");

    const untested = structuredClone(extraction);
    if (untested.status !== "supported") throw new Error("Expected supported fixture");
    untested.seams[0]!.linkedChecks = [];
    expect(() => selectRecoverySeam(untested)).toThrow("test-backed");

    const env = await setup();
    const drift = structuredClone(extraction);
    if (drift.status !== "supported") throw new Error("Expected supported fixture");
    drift.seams[0]!.targetRevision = "0".repeat(40);
    await expect(env.compiler.compile({
      extraction: drift,
      fixtureId: "tenant-cache-key",
      manifestHash: EXPECTED_TENANT_CACHE_KEY.manifestHash,
    })).rejects.toThrow("fixture");

    const compiled = await compile(env);
    const injected = { ...compiled.internal, expectedAnswer: "trust me" };
    await expect(env.judge.evaluate({
      experience: injected as typeof compiled.internal,
      twinHandle: "opaque_twin",
      hintsUsed: 0,
      elapsedMs: 1,
    })).rejects.toThrow("unknown");
  }, 45_000);

  it("rejects no-op and unrelated candidates without executing them", async () => {
    const env = await setup();
    const compiled = await compile(env);
    const twin = await env.twins.prepare(compiled.internal.projectId, compiled.internal.snapshotId);

    const noOp = await env.judge.evaluate({
      experience: compiled.internal,
      twinHandle: twin.handle,
      hintsUsed: 0,
      elapsedMs: 2_000,
    });
    expect(noOp).toMatchObject({ outcome: "failed", checks: [{ id: "candidate-diff", status: "failed" }] });

    const root = env.twins.resolveReadyRoot(compiled.internal.projectId, twin.handle);
    await writeFile(join(root, "src", "cache-key.ts"), "export function cacheKey(): string { return 'unrelated'; }\n");
    const unrelated = await env.judge.evaluate({
      experience: compiled.internal,
      twinHandle: twin.handle,
      hintsUsed: 1,
      elapsedMs: 3_000,
    });
    expect(unrelated).toMatchObject({ outcome: "failed", checks: [{ id: "candidate-diff", status: "failed" }] });
    expect(env.runner.completedCount).toBe(0);
  }, 45_000);

  it("fails integrity for protected or out-of-scope changes", async () => {
    const env = await setup();
    const compiled = await compile(env);
    const protectedTwin = await env.twins.prepare(compiled.internal.projectId, compiled.internal.snapshotId);
    const protectedRoot = env.twins.resolveReadyRoot(compiled.internal.projectId, protectedTwin.handle);
    await writeFile(join(protectedRoot, ".gitattributes"), "* -text\n");

    await expect(env.judge.evaluate({
      experience: compiled.internal,
      twinHandle: protectedTwin.handle,
      hintsUsed: 0,
      elapsedMs: 1_000,
    })).resolves.toMatchObject({ outcome: "failed-integrity" });

    const extraTwin = await env.twins.prepare(compiled.internal.projectId, compiled.internal.snapshotId);
    const extraRoot = env.twins.resolveReadyRoot(compiled.internal.projectId, extraTwin.handle);
    await writeFile(join(extraRoot, "answer.txt"), "bypass\n");
    await expect(env.judge.evaluate({
      experience: compiled.internal,
      twinHandle: extraTwin.handle,
      hintsUsed: 0,
      elapsedMs: 1_000,
    })).resolves.toMatchObject({ outcome: "failed-integrity" });
    expect(env.runner.completedCount).toBe(0);
  }, 45_000);

  it("accepts only the exact known repair and replays deterministically", async () => {
    const env = await setup();
    const compiled = await compile(env);
    const results = [];

    for (let index = 0; index < 3; index += 1) {
      const twin = await env.twins.prepare(compiled.internal.projectId, compiled.internal.snapshotId);
      const root = env.twins.resolveReadyRoot(compiled.internal.projectId, twin.handle);
      await writeFile(
        join(root, "src", "cache-key.ts"),
        "export function cacheKey(tenant: string, id: string): string {\n  return `${tenant}:${id}`;\n}\n",
      );
      results.push(await env.judge.evaluate({
        experience: compiled.internal,
        twinHandle: twin.handle,
        hintsUsed: 0,
        elapsedMs: 4_000,
      }));
    }

    expect(results[0]).toMatchObject({
      outcome: "passed",
      checks: [{ id: "cache-key.tenant-isolation", status: "passed" }],
      hintsUsed: 0,
      elapsedMs: 4_000,
    });
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(results[0]!.candidateDiffHash).toBeDefined();
    expect(env.runner.completedCount).toBe(3);
  }, 60_000);

  it("records reveal and abandonment without executable readiness evidence", async () => {
    const env = await setup();
    const compiled = await compile(env);

    const revealed = await env.judge.close(compiled.internal, "revealed", 2, 900);
    const abandoned = await env.judge.close(compiled.internal, "abandoned", 0, 500);
    expect(revealed).toMatchObject({ outcome: "revealed", checks: [], hintsUsed: 2 });
    expect(abandoned).toMatchObject({ outcome: "abandoned", checks: [], hintsUsed: 0 });
    expect(revealed.resultHash).not.toBe(abandoned.resultHash);
    expect(env.runner.completedCount).toBe(0);
  }, 45_000);

  it("persists and re-verifies bounded judge evidence locally", async () => {
    const root = await mkdtemp(join(tmpdir(), "pureflow-r4-evidence-"));
    roots.push(root);
    const first = new LocalCommandEvidenceStore(new NodeLocalTextStorage(root));
    const content = Buffer.from("{\"exitCode\":0}", "utf8");
    const ref = await first.putNamed("project-a", "judge_fixture_check", content, content.byteLength);
    const reopened = new LocalCommandEvidenceStore(new NodeLocalTextStorage(root));

    await expect(reopened.open("project-a", ref)).resolves.toBe(content.toString("utf8"));
    await expect(reopened.open("project-b", ref)).resolves.toBeUndefined();
    await writeFile(join(root, "command-evidence", "project-a", "judge_fixture_check.b64"), "dGFtcGVyZWQ=");
    await expect(reopened.open("project-a", ref)).rejects.toThrow("integrity");
  });
});

class CountingRunner extends TrustedFixtureProcessRunner {
  completedCount = 0;

  override async run(request: Parameters<TrustedFixtureProcessRunner["run"]>[0]) {
    const result = await super.run(request);
    this.completedCount += 1;
    return result;
  }
}

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r4-test-"));
  roots.push(root);
  const catalog = new BuiltinFixtureCatalog();
  const snapshots = new FixtureSnapshotStore(join(root, "snapshots"), catalog, {
    now: () => "2026-01-03T00:00:00.000Z",
  });
  const twins = new TwinManager(join(root, "twins"), snapshots);
  const evidence = new MemoryCommandEvidenceStore();
  const runner = new CountingRunner(catalog, twins, evidence);
  const registry = new FixtureCommandRegistry(
    catalog,
    "tenant-cache-key",
    EXPECTED_TENANT_CACHE_KEY.manifestHash,
  );
  const compiler = new FixtureExperienceCompiler(catalog, snapshots, registry, {
    id: () => "experience_fixture_recovery_1",
  });
  const judge = new FixturePhaseAJudge(catalog, snapshots, twins, registry, runner, evidence);
  return { catalog, snapshots, twins, evidence, runner, registry, compiler, judge };
}

async function compile(env: Awaited<ReturnType<typeof setup>>) {
  return env.compiler.compile({
    extraction: await fixtureExtraction(),
    fixtureId: "tenant-cache-key",
    manifestHash: EXPECTED_TENANT_CACHE_KEY.manifestHash,
  });
}

async function fixtureExtraction(): Promise<ExtractionResult> {
  const fixture = await createFixture();
  const diff = await new GitRevisionDiffReader().read(fixture.root, fixture.baseRevision, fixture.targetRevision);
  const transcript = JSON.parse(await readFile(transcriptPath, "utf8")) as ReplayTranscript;
  return extractChangeEvidence({
    schemaVersion: 1,
    projectId: transcript.run.projectId,
    sourceRunId: transcript.run.runId,
    baseRevision: fixture.baseRevision,
    targetRevision: fixture.targetRevision,
    diff,
    links: fixture.manifest.changedSymbols.map(({ path, symbol }) => ({
      path,
      symbol,
      checks: fixture.manifest.targetChecks,
    })),
    events: transcript.events,
  });
}

async function createFixture(): Promise<TenantCacheKeyFixture> {
  const root = await mkdtemp(join(tmpdir(), "pureflow-r0b-"));
  roots.push(root);
  const fixture = await createTenantCacheKeyFixture(root);
  fixtures.set(root, fixture);
  return fixture;
}
