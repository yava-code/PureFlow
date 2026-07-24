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
import {
  inspectTarget,
  MonadRpcClient,
  scanMonadProject,
  type AddressInspection,
  type MonadNetworkSnapshot,
  type MonadProjectScan,
  type TransactionInspection,
} from "./monad";
import type { MentorIntent } from "./protocol";
import { mentorEditorContext, selectionQuery, type EditorContext } from "./selection";
import { PureFlowStatus } from "./status";
import { RepStore } from "./store";
import type {
  ClientState,
  EditorContext as ClientEditorContext,
  KnowledgeResult,
  MentorMode,
  MentorRequest,
  MonadHealth,
  MonadInspection,
  MonadProjectReport,
  Ownership,
  RepState,
  SidebarRoute,
} from "./types";
import { WorkspaceService } from "./workspace";

interface GitRepository {
  diff(cached?: boolean): Promise<string>;
}

interface GitApi {
  repositories: GitRepository[];
}

export class PureFlowView implements vscode.WebviewViewProvider {
  static readonly viewType = "pureflow.console";
  private view?: vscode.WebviewView;
  private ready = false;
  private readonly pending: unknown[] = [];
  private pendingSearch?: string;
  private pendingInspection?: string;
  private pendingDoctor = false;
  private route: SidebarRoute = "workspace";
  private editor?: ClientEditorContext;
  private monadHealth: MonadHealth = { status: "loading" };

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly store: RepStore,
    private readonly coach: Coach,
    private readonly workspace: WorkspaceService,
    private readonly status: PureFlowStatus,
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.ready = false;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist")],
    };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((message) => this.handle(message), undefined, this.context.subscriptions);
    view.onDidChangeVisibility(() => {
      if (view.visible && this.ready) {
        void Promise.all([this.pushState(), this.pushWorkspace()]);
        if (!this.monadHealth.checkedAt || Date.now() - this.monadHealth.checkedAt > 30_000) {
          void this.refreshMonad();
        }
      }
    });
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
        this.ready = false;
      }
    });
  }

  async focus(): Promise<void> {
    await vscode.commands.executeCommand("workbench.view.extension.pureflow");
    this.view?.show(false);
  }

  async showWorkspace(): Promise<void> {
    this.route = "workspace";
    await this.deliver({ type: "route", route: "workspace" });
  }

  async requestMentor(mode: MentorIntent, context: EditorContext): Promise<void> {
    this.route = "mentor";
    this.editor = context;
    await this.deliver(
      { type: "route", route: "mentor" },
      { type: "mentorContext", mode, context },
    );
  }

  async prefillSearch(query: string): Promise<void> {
    this.route = "mentor";
    await this.deliver(
      { type: "route", route: "mentor" },
      { type: "prefillSearch", query },
    );
    if (!this.ready) {
      this.pendingSearch = query;
      return;
    }
    await this.search(query);
  }

  async startFromCommand(): Promise<void> {
    this.route = "focus";
    await this.deliver(
      { type: "route", route: "focus" },
      { type: "showStart" },
    );
  }

  async finishFromCommand(): Promise<void> {
    const rep = this.store.get();
    if (rep.phase !== "active") {
      void vscode.window.showInformationMessage("PureFlow has no active Rep.");
      return;
    }
    this.route = "focus";
    await this.deliver(
      { type: "route", route: "focus" },
      { type: "showFinish" },
    );
  }

  async inspectFromCommand(value: string): Promise<void> {
    this.route = "monad";
    await this.deliver({ type: "route", route: "monad" });
    if (!this.ready) {
      this.pendingInspection = value;
      return;
    }
    await this.inspectMonad(value);
  }

  async doctorFromCommand(): Promise<void> {
    this.route = "monad";
    await this.deliver({ type: "route", route: "monad" });
    if (!this.ready) {
      this.pendingDoctor = true;
      return;
    }
    await this.runMonadDoctor();
  }

  async pushState(): Promise<void> {
    this.status.refresh();
    const rep = this.store.get();
    const workspace = await this.workspace.snapshot();
    const state: ClientState = {
      rep,
      stats: stats(rep),
      aiExtensions: this.detectAiExtensions(),
      coachConfigured: await this.coach.configured(),
      contractAddress:
        vscode.workspace.getConfiguration("pureflow").get<string>("monadContractAddress") ?? "",
      route: this.route,
      workspace,
      editor: this.editor,
      monad: this.monadHealth,
    };
    await this.post({ type: "state", state });
  }

  async pushWorkspace(): Promise<void> {
    this.status.refresh();
    await this.post({ type: "workspaceState", workspace: await this.workspace.snapshot() });
  }

  private async handle(message: Record<string, unknown>): Promise<void> {
    try {
      switch (message.type) {
        case "ready":
          this.ready = true;
          await this.pushState();
          await this.pushWorkspace();
          await this.search("");
          await this.flushPending();
          void this.refreshMonad();
          if (this.pendingSearch !== undefined) {
            const query = this.pendingSearch;
            this.pendingSearch = undefined;
            await this.search(query);
          }
          if (this.pendingInspection !== undefined) {
            const value = this.pendingInspection;
            this.pendingInspection = undefined;
            await this.inspectMonad(value);
          }
          if (this.pendingDoctor) {
            this.pendingDoctor = false;
            await this.runMonadDoctor();
          }
          break;
        case "route":
          if (isSidebarRoute(message.route)) this.route = message.route;
          break;
        case "openProject":
          await this.workspace.openProject();
          break;
        case "createProject":
          await this.workspace.createProject();
          break;
        case "openTerminal":
          this.workspace.openTerminal();
          break;
        case "openSourceControl":
          await vscode.commands.executeCommand("workbench.view.scm");
          break;
        case "searchSelection":
          await this.prefillSearch(selectionQuery());
          break;
        case "mentor": {
          const mode = mentorMode(message.mode);
          const supplied = isEditorContext(message.context) ? message.context : undefined;
          const context = supplied ?? await mentorEditorContext(mode === "quiz");
          if (!context) {
            throw new Error(mode === "quiz" ? "Open a function or select code to start a quiz." : "Select code in the editor first.");
          }
          this.editor = context;
          this.route = "mentor";
          await this.post({ type: "mentorLoading" });
          const request: MentorRequest = {
            mode,
            file: context.file,
            language: context.language,
            startLine: context.startLine,
            endLine: context.endLine,
            code: context.code,
            question: String(message.reasoning ?? "").trim() || undefined,
          };
          const result = await this.coach.mentor(this.store.get(), request);
          await this.post({ type: "mentorResult", result });
          break;
        }
        case "refreshMonad":
          await this.refreshMonad();
          break;
        case "inspectMonad":
          await this.inspectMonad(String(message.value ?? ""));
          break;
        case "runMonadDoctor":
          await this.runMonadDoctor();
          break;
        case "copyAttestation": {
          const payload = attestationPayload(message.payload);
          await vscode.env.clipboard.writeText(JSON.stringify(payload, null, 2));
          await this.post({ type: "toast", message: "Prepared proof payload copied. It has not been published." });
          break;
        }
        case "openAttestation": {
          const payload = attestationPayload(message.payload);
          const url = this.attestationUrl(payload);
          await vscode.env.openExternal(vscode.Uri.parse(url));
          break;
        }
        case "openExternal":
          await openHttpUrl(String(message.url ?? ""));
          break;
        case "startRep": {
          if (this.detectAiExtensions().length) {
            const choice = await vscode.window.showWarningMessage(
              "PureFlow found AI extensions in this profile. The Focus Rep can continue, but the AI shield is not complete.",
              "Start anyway",
              "Review extensions",
            );
            if (choice === "Review extensions") {
              await vscode.commands.executeCommand("workbench.extensions.action.showInstalledExtensions");
              return;
            }
            if (choice !== "Start anyway") return;
          }
          let rep = startRep(String(message.goal ?? ""), Number(message.duration ?? 25));
          const recallNote = String(message.recallNote ?? "").trim();
          if (recallNote) {
            rep = addHypothesis(rep, `Retrieve first: ${recallNote.slice(0, 500)}`);
          }
          await this.store.set(rep);
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
            const recall = await vscode.window.showInputBox({
              prompt: "Focus Rep active: What do you remember about this before opening docs?",
              placeHolder: "I think it returns...",
              ignoreFocusOut: true,
            });
            if (!recall) return;
            await this.store.set(recordDoc(this.store.get(), source.source, source.title));
          }
          await openDocumentation(source.url, vscode.ViewColumn.Beside);
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
              rules: {
                policyVersion: 1,
                mentorBlockedDuringRep: true,
                privateCodeOffchain: true,
                selfReportedOnly: true,
              },
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
    if (this.store.get().phase === "active") {
      const recall = await vscode.window.showInputBox({
        prompt: "Focus Rep active: What do you remember about this before we search?",
        placeHolder: "I think it returns...",
        ignoreFocusOut: true,
      });
      if (!recall) {
        await this.post({ type: "knowledgeResults", query, results: [] });
        return;
      }
    }
    await this.post({ type: "knowledgeLoading" });
    const results = await searchKnowledge(query);
    await this.post({ type: "knowledgeResults", query, results });
  }

  private async refreshMonad(): Promise<void> {
    this.monadHealth = { status: "loading" };
    await this.post({ type: "monadHealth", health: this.monadHealth });
    try {
      const snapshot = await this.monadClient().networkSnapshot();
      this.monadHealth = networkHealth(snapshot);
    } catch (error) {
      this.monadHealth = {
        status: "offline",
        checkedAt: Date.now(),
        error: error instanceof Error ? error.message : "Monad Testnet RPC is unavailable.",
      };
    }
    await this.post({ type: "monadHealth", health: this.monadHealth });
  }

  private async inspectMonad(value: string): Promise<void> {
    await this.post({ type: "monadLoading" });
    const result = await inspectTarget(value, this.monadClient());
    const inspection = monadInspection(result);
    await this.post({ type: "monadInspection", inspection });
  }

  private async runMonadDoctor(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder || folder.uri.scheme !== "file") throw new Error("Open a local project before running Monad Project Doctor.");
    const scan = await scanMonadProject(folder.uri.fsPath);
    await this.post({ type: "monadProject", report: projectReport(scan) });
  }

  private monadClient(): MonadRpcClient {
    const rpcUrl = vscode.workspace.getConfiguration("pureflow").get<string>("monadRpcUrl")?.trim();
    return new MonadRpcClient(rpcUrl ? { rpcUrl } : undefined);
  }

  private attestationUrl(payload: AttestationPayload): string {
    const configured = vscode.workspace.getConfiguration("pureflow").get<string>("companionUrl")?.trim();
    const url = new URL(configured || "https://yava-code.github.io/PureFlow/");
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("PureFlow companion URL must use HTTP or HTTPS.");
    url.hash = `attest=${Buffer.from(JSON.stringify({ version: 1, chainId: 10_143, ...payload })).toString("base64url")}`;
    return url.toString();
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

  private async deliver(...messages: unknown[]): Promise<void> {
    await this.focus();
    if (!this.view || !this.ready) {
      this.pending.push(...messages);
      return;
    }
    await Promise.all(messages.map((message) => this.post(message)));
  }

  private async flushPending(): Promise<void> {
    const messages = this.pending.splice(0);
    for (const message of messages) await this.post(message);
  }

  private post(message: unknown): Thenable<boolean> | Promise<boolean> {
    if (!this.view || !this.ready) return Promise.resolve(false);
    return this.view.webview.postMessage(message);
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

function isSidebarRoute(value: unknown): value is SidebarRoute {
  return value === "workspace" || value === "mentor" || value === "focus" || value === "monad";
}

interface AttestationPayload {
  commitment: string;
  focusedSeconds: number;
  testRuns: number;
  debugLoops: number;
  ownership: number;
  rules?: {
    policyVersion: number;
    mentorBlockedDuringRep: boolean;
    privateCodeOffchain: boolean;
    selfReportedOnly: boolean;
  };
}

function mentorMode(value: unknown): MentorMode {
  if (value === "explain" || value === "why" || value === "quiz" || value === "review") return value;
  throw new Error("Unknown mentor action.");
}

function isEditorContext(value: unknown): value is EditorContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<EditorContext>;
  return typeof context.file === "string"
    && typeof context.language === "string"
    && typeof context.code === "string"
    && typeof context.startLine === "number"
    && typeof context.endLine === "number";
}

function networkHealth(snapshot: MonadNetworkSnapshot): MonadHealth {
  return {
    status: "online",
    chainId: snapshot.chainId,
    latestBlock: safeDecimalNumber(snapshot.blocks.latest.number, "latest block"),
    safeBlock: safeDecimalNumber(snapshot.blocks.safe.number, "safe block"),
    finalizedBlock: safeDecimalNumber(snapshot.blocks.finalized.number, "finalized block"),
    gasPriceGwei: formatUnits(snapshot.fees.gasPriceWei, 9, 4),
    latencyMs: snapshot.latencyMs,
    checkedAt: Date.now(),
  };
}

function monadInspection(value: AddressInspection | TransactionInspection): MonadInspection {
  if ("address" in value) {
    return {
      kind: "address",
      input: value.address,
      title: value.kind === "contract" ? "Contract address" : "Externally owned account",
      status: "live",
      explorerUrl: value.explorerUrl,
      fields: [
        { label: "Balance", value: `${formatUnits(value.balanceWei, 18, 6)} MON` },
        { label: "Nonce", value: value.nonce },
        { label: "Bytecode", value: value.codeBytes ? `${value.codeBytes.toLocaleString()} bytes` : "none" },
        { label: "Read at", value: `${value.blockTag} block` },
        { label: "Chain ID", value: String(value.chainId) },
      ],
    };
  }
  const status = value.status === "reverted" ? "failed" : value.state === "confirmed" ? "live" : "pending";
  return {
    kind: "transaction",
    input: value.hash,
    title: value.state === "not-found" ? "Transaction not found" : value.state === "pending" ? "Transaction pending" : `Transaction ${value.status}`,
    status,
    explorerUrl: value.explorerUrl,
    fields: [
      { label: "Finality", value: value.finality },
      ...(value.blockNumber ? [{ label: "Block", value: value.blockNumber }] : []),
      ...(value.confirmations ? [{ label: "Confirmations", value: value.confirmations }] : []),
      ...(value.from ? [{ label: "From", value: value.from }] : []),
      ...(value.to ? [{ label: "To", value: value.to }] : []),
      ...(value.contractAddress ? [{ label: "Created", value: value.contractAddress }] : []),
      ...(value.gasUsed ? [{ label: "Gas used", value: value.gasUsed }] : []),
      ...(value.effectiveGasPriceWei ? [{ label: "Gas price", value: `${formatUnits(value.effectiveGasPriceWei, 9, 4)} gwei` }] : []),
      ...(typeof value.logCount === "number" ? [{ label: "Logs", value: String(value.logCount) }] : []),
    ],
  };
}

function projectReport(scan: MonadProjectScan): MonadProjectReport {
  const active = Object.entries(scan.technologies).filter(([, found]) => found).map(([name]) => name);
  const kind: MonadProjectReport["kind"] = scan.technologies.hardhat && scan.technologies.foundry
    ? "mixed"
    : scan.technologies.hardhat
      ? "hardhat"
      : scan.technologies.foundry
        ? "foundry"
        : scan.technologies.solidity
          ? "solidity"
          : "not-monad";
  const checks: MonadProjectReport["checks"] = [
    {
      label: "Project stack",
      status: active.length ? "pass" : "info",
      detail: active.length ? active.join(", ") : "No Solidity or web3 tooling detected in the bounded scan.",
    },
    {
      label: "Monad Testnet configuration",
      status: scan.monadConfigFiles.length ? "pass" : active.length ? "warn" : "info",
      detail: scan.monadConfigFiles.length
        ? `Found in ${scan.monadConfigFiles.slice(0, 3).join(", ")}.`
        : "No chain ID 10143 or official Testnet RPC reference was found.",
    },
    {
      label: "Solidity sources",
      status: scan.solidityFiles.length ? "pass" : "info",
      detail: `${scan.solidityFiles.length} source file${scan.solidityFiles.length === 1 ? "" : "s"} found across ${scan.filesScanned} scanned files.`,
    },
    ...scan.issues.slice(0, 3).map((issue) => ({ label: issue.path, status: "warn" as const, detail: issue.message })),
  ];
  const actions: string[] = [];
  if (!active.length) actions.push("Create a Monad starter or add Hardhat/Foundry to this project.");
  if (active.length && !scan.monadConfigFiles.length) actions.push("Add Monad Testnet chain ID 10143 and the official RPC to project configuration.");
  if (scan.technologies.solidity) actions.push("Run the native test task before any deployment handoff.");
  if (scan.truncated) actions.push("Review scan limits before treating this report as complete.");
  return { kind, checks, actions };
}

function formatUnits(value: string, decimals: number, precision: number): string {
  const raw = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, "0").slice(0, precision).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function safeDecimalNumber(value: string, label: string): number {
  const parsed = BigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`Monad ${label} is too large to display safely.`);
  return Number(parsed);
}

function attestationPayload(value: unknown): AttestationPayload {
  if (!value || typeof value !== "object") throw new Error("Invalid prepared proof payload.");
  const payload = value as Partial<AttestationPayload>;
  if (!/^0x[\da-f]{64}$/i.test(payload.commitment ?? "")) throw new Error("Prepared proof has an invalid commitment.");
  for (const key of ["focusedSeconds", "testRuns", "debugLoops", "ownership"] as const) {
    if (!Number.isSafeInteger(payload[key]) || Number(payload[key]) < 0) throw new Error(`Prepared proof has an invalid ${key}.`);
  }
  return payload as AttestationPayload;
}

async function openHttpUrl(value: string): Promise<void> {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("PureFlow opens only HTTP or HTTPS links.");
  await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
}

/** Prefer in-IDE Simple Browser for docs; fall back to the system browser. */
async function openDocumentation(value: string, viewColumn?: vscode.ViewColumn): Promise<void> {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("PureFlow opens only HTTP or HTTPS links.");
  const href = url.toString();
  try {
    if (viewColumn !== undefined) {
      await vscode.commands.executeCommand("simpleBrowser.api.open", href, { viewColumn });
    } else {
      await vscode.commands.executeCommand("simpleBrowser.api.open", href);
    }
    return;
  } catch {
    // simpleBrowser.api.open is not registered in every host build.
  }
  try {
    if (viewColumn !== undefined) {
      await vscode.commands.executeCommand("simpleBrowser.show", href, { viewColumn });
    } else {
      await vscode.commands.executeCommand("simpleBrowser.show", href);
    }
    return;
  } catch {
    // Fall through to the system browser.
  }
  await vscode.env.openExternal(vscode.Uri.parse(href));
}
