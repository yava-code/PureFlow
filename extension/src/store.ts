import * as vscode from "vscode";
import { emptyRep } from "./domain";
import type { RepEvent, RepState } from "./types";

const stateKey = "pureflow.currentRep.v1";
const historyKey = "pureflow.repHistory.v1";

export class RepStore {
  private current: RepState;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.current = context.globalState.get<RepState>(stateKey) ?? emptyRep();
  }

  get(): RepState {
    return this.current;
  }

  async set(rep: RepState): Promise<void> {
    const previousEvents = new Set(this.current.events.map((item) => item.id));
    const additions = rep.events.filter((item) => !previousEvents.has(item.id));
    this.current = rep;
    await this.context.globalState.update(stateKey, rep);
    if (additions.length) await this.appendEvents(rep.id, additions);
  }

  async archive(): Promise<void> {
    const history = this.context.globalState.get<RepState[]>(historyKey) ?? [];
    await this.context.globalState.update(historyKey, [this.current, ...history].slice(0, 50));
    await this.set(emptyRep());
  }

  private async appendEvents(repId: string, events: RepEvent[]): Promise<void> {
    const folder = this.context.globalStorageUri;
    await vscode.workspace.fs.createDirectory(folder);
    const uri = vscode.Uri.joinPath(folder, "events.jsonl");
    let existing: Uint8Array<ArrayBufferLike> = new Uint8Array();
    try {
      existing = await vscode.workspace.fs.readFile(uri);
    } catch {
      existing = new Uint8Array();
    }
    const encoder = new TextEncoder();
    const lines = events.map((item) => JSON.stringify({ repId, ...item })).join("\n") + "\n";
    const next = new Uint8Array(existing.length + encoder.encode(lines).length);
    next.set(existing);
    next.set(encoder.encode(lines), existing.length);
    await vscode.workspace.fs.writeFile(uri, next);
  }
}
