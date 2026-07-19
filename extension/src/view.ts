import * as vscode from "vscode";
import {
  addHypothesis,
  answerDefense,
  commitment,
  finishRep,
  logTest,
  recordDoc,
  resolveHypothesis,
  revealRecall,
  startDefense,
  startRep,
  stats,
  summary,
} from "./domain";
import { Coach } from "./coach";
import { searchKnowledge } from "./knowledge";
import { RepStore } from "./store";
import type { ClientState, KnowledgeResult, Ownership, RepState } from "./types";

interface GitRepository {
  diff(cached?: boolean): Promise<string>;
}

interface GitApi {
  repositories: GitRepository[];
}

export class PureFlowView implements vscode.WebviewViewProvider {
  static readonly viewType = "pureflow.console";
  private view?: vscode.WebviewView;
  private panel?: vscode.WebviewPanel;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly store: RepStore,
    private readonly coach: Coach,
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist")],
    };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((message) => this.handle(message), undefined, this.context.subscriptions);
    view.onDidChangeVisibility(() => {
      if (view.visible) void this.pushState();
    });
  }

  async focus(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.pushState();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "pureflow.trainingConsole",
      "PureFlow",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist")],
      },
    );
    this.panel = panel;
    panel.webview.html = this.html(panel.webview);
    panel.webview.onDidReceiveMessage((message) => this.handle(message), undefined, this.context.subscriptions);
    panel.onDidDispose(() => {
      this.panel = undefined;
    });
    await this.pushState();
  }

  async prefillSearch(query: string): Promise<void> {
    await this.focus();
    await this.post({ type: "prefillSearch", query });
    await this.search(query);
  }

  async startFromCommand(): Promise<void> {
    await this.focus();
    await this.post({ type: "showStart" });
  }

  async finishFromCommand(): Promise<void> {
    const rep = this.store.get();
    if (rep.phase !== "active") {
      void vscode.window.showInformationMessage("PureFlow has no active Rep.");
      return;
    }
    await this.focus();
    await this.post({ type: "showFinish" });
  }

  async pushState(): Promise<void> {
    const rep = this.store.get();
    const state: ClientState = {
      rep,
      stats: stats(rep),
      aiExtensions: this.detectAiExtensions(),
      coachConfigured: await this.coach.configured(),
      contractAddress:
        vscode.workspace.getConfiguration("pureflow").get<string>("monadContractAddress") ?? "",
    };
    await this.post({ type: "state", state });
  }

  private async handle(message: Record<string, unknown>): Promise<void> {
    try {
      switch (message.type) {
        case "ready":
          await this.pushState();
          await this.search("");
          break;
        case "startRep": {
          if (this.detectAiExtensions().length) {
            const choice = await vscode.window.showWarningMessage(
              "PureFlow found AI extensions in this profile. The Rep can continue, but Comfort Shield is not complete.",
              "Start anyway",
              "Review extensions",
            );
            if (choice === "Review extensions") {
              await vscode.commands.executeCommand("workbench.extensions.action.showInstalledExtensions");
              return;
            }
            if (choice !== "Start anyway") return;
          }
          await this.store.set(startRep(String(message.goal ?? ""), Number(message.duration ?? 25)));
          await vscode.commands.executeCommand("workbench.action.toggleZenMode");
          await this.pushState();
          break;
        }
        case "newRep":
          await this.store.archive();
          await this.pushState();
          break;
        case "addHypothesis":
          await this.store.set(addHypothesis(this.store.get(), String(message.text ?? "")));
          await this.pushState();
          break;
        case "resolveHypothesis":
          await this.store.set(
            resolveHypothesis(
              this.store.get(),
              String(message.id),
              message.result === "confirmed" ? "confirmed" : "rejected",
            ),
          );
          await this.pushState();
          break;
        case "logTest":
          await this.store.set(logTest(this.store.get(), message.status === "passed" ? "passed" : "failed"));
          await this.pushState();
          break;
        case "runTests":
          await vscode.commands.executeCommand("workbench.action.tasks.test");
          break;
        case "revealRecall":
          await this.store.set(revealRecall(this.store.get(), Number(message.level) as 1 | 2 | 3));
          await this.pushState();
          break;
        case "search":
          await this.search(String(message.query ?? ""));
          break;
        case "openSource": {
          const source = message.source as KnowledgeResult;
          if (this.store.get().phase === "active") {
            await this.store.set(recordDoc(this.store.get(), source.source, source.title));
          }
          await vscode.env.openExternal(vscode.Uri.parse(source.url));
          await this.pushState();
          break;
        }
        case "finishRep":
          await this.store.set(
            finishRep(
              this.store.get(),
              String(message.outcome ?? ""),
              Number(message.ownership) as Ownership,
            ),
          );
          await this.pushState();
          break;
        case "startDefense": {
          const share = message.share as Record<string, boolean> | undefined;
          const context = await this.defenseContext(share ?? {});
          const questions = await this.coach.questions(this.store.get(), context);
          await this.store.set(startDefense(this.store.get(), questions));
          await this.pushState();
          break;
        }
        case "answerDefense":
          await this.store.set(
            answerDefense(this.store.get(), {
              question: String(message.question ?? ""),
              answer: String(message.answer ?? ""),
              selfRated: Number(message.selfRated) as 1 | 2 | 3,
            }),
          );
          await this.pushState();
          break;
        case "copySummary":
          await vscode.env.clipboard.writeText(summary(this.store.get()));
          await this.post({ type: "toast", message: "Summary copied without code or file names." });
          break;
        case "exportPng":
          await this.savePng(String(message.data ?? ""));
          break;
        case "configureCoach":
          if (await this.coach.configure()) {
            await this.post({ type: "toast", message: "Coach configured. It remains offline during Reps." });
            await this.pushState();
          }
          break;
        case "prepareAttestation": {
          const rep = this.store.get();
          const value = stats(rep, rep.finishedAt);
          await this.post({
            type: "attestation",
            payload: {
              commitment: commitment(rep),
              focusedSeconds: value.focusedSeconds,
              testRuns: value.testRuns,
              debugLoops: value.debugLoops,
              ownership: rep.ownership,
            },
          });
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "PureFlow could not complete that action.";
      await this.post({ type: "error", message });
    }
  }

  private async search(query: string): Promise<void> {
    await this.post({ type: "knowledgeLoading" });
    const results = await searchKnowledge(query);
    await this.post({ type: "knowledgeResults", query, results });
  }

  private async defenseContext(share: Record<string, boolean>): Promise<string> {
    const rep = this.store.get();
    const parts: string[] = [];
    if (share.notes) {
      parts.push(
        `Session notes:\n${rep.hypotheses.map((item) => `- ${item.text} (${item.result ?? "open"})`).join("\n")}`,
      );
    }
    if (share.tests) {
      parts.push(
        `Test evidence:\n${rep.events.filter((item) => item.type === "test.finished").map((item) => `- ${item.label}`).join("\n")}`,
      );
    }
    if (share.diff) {
      const diff = await this.gitDiff();
      if (diff) parts.push(`Git diff:\n${diff}`);
    }
    return parts.length ? parts.join("\n\n") : "No repository context shared.";
  }

  private async gitDiff(): Promise<string> {
    const extension = vscode.extensions.getExtension("vscode.git");
    if (!extension) return "";
    const exports = extension.isActive ? extension.exports : await extension.activate();
    const api = exports.getAPI(1) as GitApi;
    const repository = api.repositories[0];
    if (!repository) return "";
    const [working, staged] = await Promise.all([repository.diff(false), repository.diff(true)]);
    return `${staged}\n${working}`.trim().slice(0, 24_000);
  }

  private detectAiExtensions(): string[] {
    const ids = vscode.workspace.getConfiguration("pureflow").get<string[]>("aiExtensionIds") ?? [];
    return ids.filter((id) => Boolean(vscode.extensions.getExtension(id)));
  }

  private async savePng(data: string): Promise<void> {
    if (!data.startsWith("data:image/png;base64,")) throw new Error("Invalid Rep Card image.");
    const target = await vscode.window.showSaveDialog({
      filters: { PNG: ["png"] },
      defaultUri: vscode.Uri.file(`pureflow-rep-${new Date().toISOString().slice(0, 10)}.png`),
    });
    if (!target) return;
    const bytes = Buffer.from(data.slice("data:image/png;base64,".length), "base64");
    await vscode.workspace.fs.writeFile(target, bytes);
    await this.post({ type: "toast", message: "Privacy-safe Rep Card exported." });
  }

  private post(message: unknown): Thenable<boolean> | Promise<boolean> {
    const targets = [this.view?.webview, this.panel?.webview].filter((item): item is vscode.Webview => Boolean(item));
    if (!targets.length) return Promise.resolve(false);
    return Promise.all(targets.map((target) => target.postMessage(message))).then((values) => values.some(Boolean));
  }

  private html(webview: vscode.Webview): string {
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js"));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css"));
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';" />
  <link href="${style}" rel="stylesheet" />
  <title>PureFlow</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}
