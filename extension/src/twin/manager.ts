import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { assertToken } from "../agent/types";
import { FixtureSnapshotStore } from "./snapshot";
import type { TwinSession } from "./types";

interface ManagedTwin extends TwinSession {
  root: string;
  evaluationRoot: string;
  active: number;
}

export class TwinManager {
  private readonly root: string;
  private readonly sessions = new Map<string, ManagedTwin>();

  constructor(root: string, private readonly snapshots: FixtureSnapshotStore) {
    this.root = resolve(root);
  }

  async prepare(projectId: string, snapshotId: string): Promise<TwinSession> {
    assertToken(projectId, "projectId");
    assertToken(snapshotId, "snapshotId");
    if (!(await this.snapshots.get(projectId, snapshotId))) {
      throw new Error("Snapshot does not belong to this project");
    }
    await mkdir(this.root, { recursive: true });
    const root = await mkdtemp(`${this.root}${sep}pureflow-twin-`);
    const evaluationRoot = await mkdtemp(`${this.root}${sep}pureflow-eval-`);
    const handle = randomUUID().replaceAll("-", "");
    const session: ManagedTwin = {
      handle,
      projectId,
      snapshotId,
      state: "preparing",
      createdAt: new Date().toISOString(),
      failure: null,
      root,
      evaluationRoot,
      active: 0,
    };
    this.sessions.set(handle, session);

    try {
      const destination = this.snapshots.reserveDestination(root);
      await this.snapshots.materialize(projectId, snapshotId, destination);
      session.state = "ready";
      return publicSession(session);
    } catch (error) {
      session.state = "failed";
      session.failure = error instanceof Error ? error.message : String(error);
      await this.removeRoots(session);
      throw error;
    }
  }

  get(projectId: string, handle: string): TwinSession | undefined {
    const session = this.sessions.get(handle);
    if (!session || session.projectId !== projectId) return undefined;
    return publicSession(session);
  }

  resolveReadyRoot(projectId: string, handle: string): string {
    assertToken(projectId, "projectId");
    assertToken(handle, "twinHandle");
    const session = this.sessions.get(handle);
    if (!session || session.projectId !== projectId) throw new Error("Unknown twin handle for project");
    if (!["ready", "running", "completed"].includes(session.state)) {
      throw new Error(`Twin is not executable in state ${session.state}`);
    }
    return this.owned(session.root, "pureflow-twin-");
  }

  beginExecution(projectId: string, handle: string): string {
    const root = this.resolveReadyRoot(projectId, handle);
    const session = this.sessions.get(handle)!;
    session.active += 1;
    session.state = "running";
    return root;
  }

  finishExecution(projectId: string, handle: string, failed = false): void {
    const session = this.sessions.get(handle);
    if (!session || session.projectId !== projectId || session.active < 1) {
      throw new Error("Twin execution lifecycle is inconsistent");
    }
    session.active -= 1;
    if (failed) {
      session.state = "failed";
    } else if (session.active === 0) {
      session.state = "completed";
    }
  }

  async cleanup(projectId: string, handle: string, options: { preserveFailed?: boolean } = {}): Promise<void> {
    const session = this.sessions.get(handle);
    if (!session || session.projectId !== projectId) throw new Error("Unknown twin handle for project");
    if (session.active) throw new Error("Cannot clean a running twin");
    if (session.state === "failed" && options.preserveFailed) return;
    if (session.state === "cleaned") return;
    session.state = "cleaning";
    await this.removeRoots(session);
    session.state = "cleaned";
  }

  private async removeRoots(session: ManagedTwin): Promise<void> {
    const twin = this.owned(session.root, "pureflow-twin-");
    const evaluation = this.owned(session.evaluationRoot, "pureflow-eval-");
    await Promise.all([
      rm(twin, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }),
      rm(evaluation, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }),
    ]);
  }

  private owned(path: string, prefix: string): string {
    const value = resolve(path);
    if (!value.startsWith(`${this.root}${sep}`) || !basename(value).startsWith(prefix)) {
      throw new Error("Twin cleanup target is outside the controller root");
    }
    return value;
  }
}

function publicSession(session: ManagedTwin): TwinSession {
  return {
    handle: session.handle,
    projectId: session.projectId,
    snapshotId: session.snapshotId,
    state: session.state,
    createdAt: session.createdAt,
    failure: session.failure,
  };
}
