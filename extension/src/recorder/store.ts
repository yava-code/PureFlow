import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { assertRelPath, canonicalJson } from "../rnd/canonical";
import { assertAgentTask, assertToken, taskIntentHash, type AgentTask } from "../agent/types";
import {
  assertRunEnvelope,
  assertRunSequence,
  eventEvidenceRefs,
  parseRunEnvelope,
  serializeRunEnvelope,
  type RunEnvelope,
  type EvidenceRef,
} from "./events";

export interface LocalTextStorage {
  readText(path: string): Promise<string | undefined>;
  writeText(path: string, value: string): Promise<void>;
  appendText(path: string, value: string): Promise<void>;
  removeTree(prefix: string): Promise<void>;
}

export interface RecorderEvidenceAuthority {
  owns(projectId: string, ref: EvidenceRef): Promise<boolean>;
}

export interface RunRecorder {
  append(event: RunEnvelope): Promise<void>;
  read(runId: string, afterSeq?: number): AsyncIterable<RunEnvelope>;
  lastSeq(runId: string): Promise<number>;
}

export interface TaskStore {
  put(projectId: string, task: AgentTask): Promise<string>;
  get(projectId: string, taskId: string): Promise<AgentTask | undefined>;
  removeProject(projectId: string): Promise<void>;
}

export class LocalRunRecorder implements RunRecorder {
  private readonly pending = new Map<string, Promise<void>>();

  constructor(
    private readonly storage: LocalTextStorage,
    private readonly evidence: RecorderEvidenceAuthority,
  ) {}

  async append(event: RunEnvelope): Promise<void> {
    assertRunEnvelope(event);
    const previous = this.pending.get(event.runId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(() => this.appendUnlocked(event));
    this.pending.set(event.runId, current);
    try {
      await current;
    } finally {
      if (this.pending.get(event.runId) === current) this.pending.delete(event.runId);
    }
  }

  async *read(runId: string, afterSeq = 0): AsyncIterable<RunEnvelope> {
    assertToken(runId, "runId");
    if (!Number.isSafeInteger(afterSeq) || afterSeq < 0) throw new Error("afterSeq must be a non-negative integer");
    const events = await this.load(runId);
    await this.assertEvidenceOwnership(events);
    for (const event of events) {
      if (event.seq > afterSeq) yield structuredClone(event);
    }
  }

  async lastSeq(runId: string): Promise<number> {
    assertToken(runId, "runId");
    return (await this.load(runId)).at(-1)?.seq ?? 0;
  }

  private async appendUnlocked(event: RunEnvelope): Promise<void> {
    const existing = await this.load(event.runId);
    await this.assertEvidenceOwnership([event]);
    assertRunSequence([...existing, event]);
    await this.storage.appendText(runPath(event.runId), `${serializeRunEnvelope(event)}\n`);
  }

  private async load(runId: string): Promise<RunEnvelope[]> {
    const raw = await this.storage.readText(runPath(runId));
    if (raw === undefined || raw === "") return [];
    if (!raw.endsWith("\n")) throw new Error("Flight Recorder JSONL is not append-complete");
    const events = raw.slice(0, -1).split("\n").map(parseRunEnvelope);
    assertRunSequence(events);
    return events;
  }

  private async assertEvidenceOwnership(events: readonly RunEnvelope[]): Promise<void> {
    for (const event of events) {
      for (const ref of eventEvidenceRefs(event)) {
        if (!(await this.evidence.owns(event.projectId, ref))) {
          throw new Error(`Evidence ${ref.id} does not belong to project ${event.projectId}`);
        }
      }
    }
  }
}

export class LocalTaskStore implements TaskStore {
  constructor(private readonly storage: LocalTextStorage) {}

  async put(projectId: string, task: AgentTask): Promise<string> {
    assertToken(projectId, "projectId");
    assertAgentTask(task);
    const path = taskPath(projectId, task.taskId);
    const serialized = canonicalJson(task);
    const existing = await this.storage.readText(path);
    if (existing !== undefined && existing !== serialized) throw new Error(`Task ${task.taskId} already exists with different intent`);
    if (existing === undefined) await this.storage.writeText(path, serialized);
    return taskIntentHash(task);
  }

  async get(projectId: string, taskId: string): Promise<AgentTask | undefined> {
    assertToken(projectId, "projectId");
    assertToken(taskId, "taskId");
    const raw = await this.storage.readText(taskPath(projectId, taskId));
    if (raw === undefined) return undefined;
    let task: unknown;
    try {
      task = JSON.parse(raw);
    } catch {
      throw new Error("Stored task is not valid JSON");
    }
    assertAgentTask(task);
    if (canonicalJson(task) !== raw) throw new Error("Stored task is not canonical JSON");
    return task;
  }

  async removeProject(projectId: string): Promise<void> {
    assertToken(projectId, "projectId");
    await this.storage.removeTree(`tasks/${projectId}`);
  }
}

export class NodeLocalTextStorage implements LocalTextStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  async readText(path: string): Promise<string | undefined> {
    try {
      return await readFile(this.file(path), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async writeText(path: string, value: string): Promise<void> {
    const file = this.file(path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, value, { encoding: "utf8", flag: "wx" });
  }

  async appendText(path: string, value: string): Promise<void> {
    const file = this.file(path);
    await mkdir(dirname(file), { recursive: true });
    await appendFile(file, value, "utf8");
  }

  async removeTree(prefix: string): Promise<void> {
    await rm(this.file(prefix), { recursive: true, force: true });
  }

  private file(path: string): string {
    assertRelPath(path);
    const file = resolve(this.root, path);
    if (!file.startsWith(`${this.root}${sep}`)) throw new Error("Local storage path escapes its root");
    return file;
  }
}

function runPath(runId: string): string {
  assertToken(runId, "runId");
  return `recorder/${runId}.jsonl`;
}

function taskPath(projectId: string, taskId: string): string {
  assertToken(projectId, "projectId");
  assertToken(taskId, "taskId");
  return `tasks/${projectId}/${taskId}.json`;
}
