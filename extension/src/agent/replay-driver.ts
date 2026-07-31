import { canonicalJson } from "../rnd/canonical";
import {
  assertRunSequence,
  type RunEnvelope,
} from "../recorder/events";
import type { RunRecorder, TaskStore } from "../recorder/store";
import type { AgentDriver } from "./driver";
import {
  assertAgentRun,
  assertAgentTask,
  assertAgentWorkspace,
  assertObjectShape,
  assertRecord,
  assertSchemaVersion,
  assertToken,
  taskIntentHash,
  type AgentRun,
  type AgentTask,
  type AgentWorkspace,
  type SchemaVersion,
} from "./types";

export interface ReplayTranscript {
  schemaVersion: SchemaVersion;
  driverId: string;
  task: AgentTask;
  run: AgentRun;
  events: RunEnvelope[];
}

export class ReplayDriver implements AgentDriver {
  private readonly transcript: ReplayTranscript;
  private readonly started = new Set<string>();

  constructor(
    transcript: ReplayTranscript,
    private readonly recorder: RunRecorder,
    private readonly tasks: TaskStore,
  ) {
    assertReplayTranscript(transcript);
    this.transcript = structuredClone(transcript);
  }

  async start(task: AgentTask, workspace: AgentWorkspace): Promise<AgentRun> {
    assertAgentTask(task);
    assertAgentWorkspace(workspace);
    const expected = this.transcript;
    if (canonicalJson(task) !== canonicalJson(expected.task)) throw new Error("Replay task does not match the checked transcript");
    if (workspace.projectId !== expected.run.projectId || workspace.baseRevision !== expected.run.baseRevision) {
      throw new Error("Replay workspace does not match the checked transcript");
    }

    const intentHash = await this.tasks.put(workspace.projectId, task);
    const started = expected.events[0]!.event;
    if (started.type !== "task.started" || started.intentHash !== intentHash) {
      throw new Error("Replay task intent hash does not match task.started");
    }

    const existing = await collect(this.recorder.read(expected.run.runId));
    if (existing.length === 0) {
      for (const event of expected.events) await this.recorder.append(event);
    } else if (canonicalJson(existing) !== canonicalJson(expected.events)) {
      throw new Error("Existing Flight Recorder data does not match the checked replay transcript");
    }

    this.started.add(expected.run.runId);
    return structuredClone(expected.run);
  }

  async followUp(runId: string, _message: string): Promise<void> {
    this.assertKnown(runId);
    throw new Error("Replay driver is read-only and cannot accept follow-up messages");
  }

  async cancel(runId: string): Promise<void> {
    this.assertKnown(runId);
    throw new Error("Replay run is already finished");
  }

  async *events(runId: string): AsyncIterable<RunEnvelope> {
    this.assertKnown(runId);
    yield* this.recorder.read(runId);
  }

  private assertKnown(runId: string): void {
    assertToken(runId, "runId");
    if (!this.started.has(runId)) throw new Error(`Unknown replay run: ${runId}`);
  }
}

export function assertReplayTranscript(value: unknown): asserts value is ReplayTranscript {
  assertRecord(value, "replay transcript");
  assertObjectShape(value, ["schemaVersion", "driverId", "task", "run", "events"], [], "replay transcript");
  assertSchemaVersion(value.schemaVersion);
  assertToken(value.driverId, "driverId");
  if (value.driverId !== "pureflow.replay.v1") throw new Error("Unsupported replay driverId");
  assertAgentTask(value.task);
  assertAgentRun(value.run);
  if (!Array.isArray(value.events) || value.events.length < 2) throw new Error("Replay transcript requires events");
  assertRunSequence(value.events as RunEnvelope[]);

  const transcript = value as unknown as ReplayTranscript;
  const first = transcript.events[0]!;
  const terminal = transcript.events.at(-1)!;
  if (
    first.projectId !== transcript.run.projectId ||
    first.runId !== transcript.run.runId ||
    transcript.run.driverId !== transcript.driverId ||
    transcript.run.taskId !== transcript.task.taskId
  ) {
    throw new Error("Replay transcript identity mismatch");
  }
  if (first.event.type !== "task.started") throw new Error("Replay transcript must start with task.started");
  if (first.event.taskId !== transcript.task.taskId || first.event.baseRevision !== transcript.run.baseRevision) {
    throw new Error("Replay task.started mismatch");
  }
  if (first.event.intentHash !== taskIntentHash(transcript.task)) throw new Error("Replay task intent hash mismatch");
  if (terminal.event.type !== "run.finished" || terminal.event.status !== transcript.run.status) {
    throw new Error("Replay terminal status mismatch");
  }
  if (terminal.event.targetRevision !== transcript.run.targetRevision) {
    throw new Error("Replay target revision mismatch");
  }
  if (first.at !== transcript.run.startedAt || terminal.at !== transcript.run.finishedAt) {
    throw new Error("Replay run timestamps do not match its boundary events");
  }
}

async function collect(iterable: AsyncIterable<RunEnvelope>): Promise<RunEnvelope[]> {
  const events: RunEnvelope[] = [];
  for await (const event of iterable) events.push(event);
  return events;
}
