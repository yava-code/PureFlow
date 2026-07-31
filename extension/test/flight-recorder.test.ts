import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { taskIntentHash, type AgentWorkspace } from "../src/agent/types";
import { ReplayDriver, type ReplayTranscript } from "../src/agent/replay-driver";
import {
  parseRunEnvelope,
  serializeRunEnvelope,
  type RunEnvelope,
  type EvidenceRef,
} from "../src/recorder/events";
import {
  LocalRunRecorder,
  LocalTaskStore,
  NodeLocalTextStorage,
  type RecorderEvidenceAuthority,
  type LocalTextStorage,
} from "../src/recorder/store";

const fixturePath = resolve(import.meta.dirname, "fixtures/v0.3/agent-replay/succeeded.json");

describe("R1 replay driver and Flight Recorder", () => {
  it("replays the same normalized sequence without persisting local handles or secrets", async () => {
    const transcript = await loadTranscript();
    const { driver, storage } = setup(transcript);
    const workspace = fixtureWorkspace();
    workspace.localHandle = "C:\\Users\\goose\\secret-project|OPENAI_API_KEY=known-secret-fixture";

    const first = await driver.start(transcript.task, workspace);
    const firstEvents = await collect(driver.events(first.runId));
    const second = await driver.start(transcript.task, workspace);
    const secondEvents = await collect(driver.events(second.runId));

    expect(first).toEqual(transcript.run);
    expect(secondEvents).toEqual(firstEvents);
    expect(firstEvents).toEqual(transcript.events);
    expect(storage.dump()).not.toContain(workspace.localHandle);
    expect(storage.dump()).not.toContain("OPENAI_API_KEY=known-secret-fixture");
  });

  it("round-trips canonical event serialization and matches the task-intent golden hash", async () => {
    const transcript = await loadTranscript();
    const first = transcript.events[0]!;

    expect(parseRunEnvelope(serializeRunEnvelope(first))).toEqual(first);
    expect(taskIntentHash(transcript.task)).toBe("630908dfe4286f1b22a28f531f36bfb01ed28743f722cbbff2ef19b0c476960c");
    expect(first.event).toMatchObject({ type: "task.started", intentHash: taskIntentHash(transcript.task) });
  });

  it("rejects gaps, duplicate sequences, and events after run.finished", async () => {
    const transcript = await loadTranscript();
    const gap = structuredClone(transcript);
    gap.events[1]!.seq = 3;
    await expect(start(gap)).rejects.toThrow("sequence");

    const duplicate = structuredClone(transcript);
    duplicate.events[1]!.seq = 1;
    await expect(start(duplicate)).rejects.toThrow("sequence");

    const late = structuredClone(transcript);
    late.events.push({
      ...late.events[5]!,
      seq: 8,
      at: "2026-07-31T20:00:07.000Z",
    });
    await expect(start(late)).rejects.toThrow("terminal");
  });

  it("rejects duplicate execution IDs and mismatched command IDs", async () => {
    const transcript = await loadTranscript();
    const duplicate = structuredClone(transcript);
    duplicate.events.splice(3, 0, {
      ...duplicate.events[2]!,
      seq: 4,
      at: "2026-07-31T20:00:03.500Z",
    });
    duplicate.events.slice(4).forEach((event, index) => { event.seq = index + 5; });
    await expect(start(duplicate)).rejects.toThrow("executionId");

    const mismatch = structuredClone(transcript);
    const test = mismatch.events[3]!.event;
    if (test.type !== "test.finished") throw new Error("Fixture drift");
    test.commandId = "fixture.other.check";
    await expect(start(mismatch)).rejects.toThrow("commandId");
  });

  it("rejects cross-project evidence and non-canonical stored lines", async () => {
    const transcript = await loadTranscript();
    const crossProject = structuredClone(transcript);
    const plan = crossProject.events[1]!.event;
    if (plan.type !== "plan.recorded") throw new Error("Fixture drift");
    plan.plan.id = "evidence_other_project";
    await expect(start(crossProject)).rejects.toThrow("project");

    const storage = new MemoryStorage();
    const { authority } = evidenceAuthority(transcript, false);
    const store = new LocalRunRecorder(storage, authority);
    await storage.appendText("recorder/run_tenant_cache.jsonl", `${JSON.stringify(transcript.events[0])}\n`);
    await expect(collect(store.read("run_tenant_cache"))).rejects.toThrow("canonical");
  });

  it("rejects path, identity, redaction, and evidence-size violations before storage", async () => {
    const transcript = await loadTranscript();

    const absolute = structuredClone(transcript);
    const changed = absolute.events[5]!.event;
    if (changed.type !== "file.changed") throw new Error("Fixture drift");
    changed.path = "C:/Users/goose/project/src/cache.ts";
    expect(() => setup(absolute)).toThrow("relative");

    const identity = structuredClone(transcript);
    identity.events[2]!.projectId = "project_other";
    expect(() => setup(identity)).toThrow("identity");

    const redactions = structuredClone(transcript);
    const command = redactions.events[4]!.event;
    if (command.type !== "command.finished") throw new Error("Fixture drift");
    command.output.redactions = [
      { ruleId: "z_rule", count: 1 },
      { ruleId: "a_rule", count: 1 },
    ];
    expect(() => setup(redactions)).toThrow("sorted");

    const oversized = structuredClone(transcript);
    const plan = oversized.events[1]!.event;
    if (plan.type !== "plan.recorded") throw new Error("Fixture drift");
    plan.plan.storedBytes = 1024 * 1024 + 1;
    plan.plan.originalBytes = plan.plan.storedBytes;
    expect(() => setup(oversized)).toThrow("byte counts");
  });

  it("represents failed and cancelled runs without inventing a target revision", async () => {
    const transcript = await loadTranscript();

    for (const status of ["failed", "cancelled"] as const) {
      const variant = terminalVariant(transcript, status);
      const run = await start(variant);
      expect(run.status).toBe(status);
      expect(run.targetRevision).toBeUndefined();
      expect(variant.events.at(-1)?.event).toEqual({ type: "run.finished", status });
    }
  });

  it("keeps replay control honest", async () => {
    const transcript = await loadTranscript();
    const { driver } = setup(transcript);
    await driver.start(transcript.task, fixtureWorkspace());

    await expect(driver.followUp(transcript.run.runId, "change the answer")).rejects.toThrow("read-only");
    await expect(driver.cancel(transcript.run.runId)).rejects.toThrow("already finished");
    await expect(driver.events("run_unknown")[Symbol.asyncIterator]().next()).rejects.toThrow("Unknown replay run");
  });

  it("reopens the append-only Flight Recorder from extension-owned filesystem storage", async () => {
    const root = await mkdtemp(join(tmpdir(), "pureflow-r1-store-"));
    try {
      const transcript = await loadTranscript();
      const storage = new NodeLocalTextStorage(root);
      const { authority } = evidenceAuthority(transcript);
      const driver = new ReplayDriver(
        transcript,
        new LocalRunRecorder(storage, authority),
        new LocalTaskStore(storage),
      );
      await driver.start(transcript.task, fixtureWorkspace());

      const reopened = new LocalRunRecorder(new NodeLocalTextStorage(root), authority);
      expect(await collect(reopened.read(transcript.run.runId))).toEqual(transcript.events);
      expect(await reopened.lastSeq(transcript.run.runId)).toBe(transcript.events.length);
      expect(await collect(reopened.read(transcript.run.runId, 5))).toEqual(transcript.events.slice(5));

      const tasks = new LocalTaskStore(new NodeLocalTextStorage(root));
      expect(await tasks.get(transcript.run.projectId, transcript.task.taskId)).toEqual(transcript.task);
      await tasks.removeProject(transcript.run.projectId);
      expect(await tasks.get(transcript.run.projectId, transcript.task.taskId)).toBeUndefined();
      expect(await collect(reopened.read(transcript.run.runId))).toEqual(transcript.events);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects unknown transcript fields and unbounded task intent", async () => {
    const transcript = await loadTranscript();
    const injected = structuredClone(transcript) as ReplayTranscript & { vendorPayload?: string };
    injected.vendorPayload = "hidden reasoning";
    expect(() => setup(injected)).toThrow("unknown");

    const oversized = structuredClone(transcript);
    oversized.task.intent.summary = "x".repeat(4097);
    expect(() => setup(oversized)).toThrow("4096");
  });
});

async function loadTranscript(): Promise<ReplayTranscript> {
  return JSON.parse(await readFile(fixturePath, "utf8")) as ReplayTranscript;
}

function setup(transcript: ReplayTranscript) {
  const storage = new MemoryStorage();
  const { authority } = evidenceAuthority(transcript);
  const recorder = new LocalRunRecorder(storage, authority);
  const tasks = new LocalTaskStore(storage);
  const driver = new ReplayDriver(transcript, recorder, tasks);
  return { driver, storage };
}

async function start(transcript: ReplayTranscript) {
  const { driver } = setup(transcript);
  return driver.start(transcript.task, fixtureWorkspace());
}

function fixtureWorkspace(): AgentWorkspace {
  return {
    schemaVersion: 1,
    projectId: "project_r0_fixture",
    worktreeId: "worktree_fixture_1",
    baseRevision: "dbb7f641fc6215cbeefa8a100645e1caa5b3d0a7",
    trusted: true,
    localHandle: "fixture://tenant-cache-key",
  };
}

function terminalVariant(transcript: ReplayTranscript, status: "failed" | "cancelled"): ReplayTranscript {
  const variant = structuredClone(transcript);
  variant.run.status = status;
  delete variant.run.targetRevision;
  const terminal = variant.events.at(-1)!;
  terminal.event = { type: "run.finished", status };
  return variant;
}

function evidenceAuthority(transcript: ReplayTranscript, includeOther = true) {
  const owners = new Map<string, string>();
  for (const envelope of transcript.events) {
    for (const ref of evidenceRefs(envelope)) owners.set(ref.id, transcript.run.projectId);
  }
  if (includeOther) owners.set("evidence_other_project", "project_other");

  const authority: RecorderEvidenceAuthority = {
    owns: async (projectId, ref) => owners.get(ref.id) === projectId,
  };
  return { authority };
}

function evidenceRefs(envelope: RunEnvelope): EvidenceRef[] {
  switch (envelope.event.type) {
    case "plan.recorded": return [envelope.event.plan];
    case "file.changed": return [envelope.event.diff];
    case "command.finished":
    case "test.finished": return [envelope.event.output];
    default: return [];
  }
}

async function collect(iterable: AsyncIterable<RunEnvelope>): Promise<RunEnvelope[]> {
  const values: RunEnvelope[] = [];
  for await (const value of iterable) values.push(value);
  return values;
}

class MemoryStorage implements LocalTextStorage {
  private readonly files = new Map<string, string>();

  async readText(path: string): Promise<string | undefined> {
    return this.files.get(path);
  }

  async writeText(path: string, value: string): Promise<void> {
    this.files.set(path, value);
  }

  async appendText(path: string, value: string): Promise<void> {
    this.files.set(path, `${this.files.get(path) ?? ""}${value}`);
  }

  async removeTree(prefix: string): Promise<void> {
    for (const path of this.files.keys()) {
      if (path === prefix || path.startsWith(`${prefix}/`)) this.files.delete(path);
    }
  }

  dump(): string {
    return [...this.files.values()].join("\n");
  }
}
