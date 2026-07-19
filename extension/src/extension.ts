import * as vscode from "vscode";
import { Coach } from "./coach";
import type { MentorIntent } from "./protocol";
import { mentorEditorContext, selectionQuery } from "./selection";
import { PureFlowStatus } from "./status";
import { RepStore } from "./store";
import { PureFlowView } from "./view";
import { WorkspaceService } from "./workspace";

export function activate(context: vscode.ExtensionContext): void {
  const store = new RepStore(context);
  const coach = new Coach(context);
  const workspace = new WorkspaceService();
  const status = new PureFlowStatus(store);
  const view = new PureFlowView(context, store, coach, workspace, status);

  const sendMentorContext = async (mode: MentorIntent, allowCurrentFunction = false): Promise<void> => {
    const value = await mentorEditorContext(allowCurrentFunction);
    if (!value) {
      void vscode.window.showInformationMessage(allowCurrentFunction ? "Open a function or select code first." : "Select code in the editor first.");
      return;
    }
    await view.requestMentor(mode, value);
  };

  context.subscriptions.push(
    status,
    vscode.window.registerWebviewViewProvider(PureFlowView.viewType, view, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("pureflow.open", () => view.showWorkspace()),
    vscode.commands.registerCommand("pureflow.openProject", () => workspace.openProject()),
    vscode.commands.registerCommand("pureflow.createProject", () => workspace.createProject()),
    vscode.commands.registerCommand("pureflow.openTerminal", () => workspace.openTerminal()),
    vscode.commands.registerCommand("pureflow.explainSelection", () => sendMentorContext("explain")),
    vscode.commands.registerCommand("pureflow.explainWhy", () => sendMentorContext("why")),
    vscode.commands.registerCommand("pureflow.quizSelection", () => sendMentorContext("quiz")),
    vscode.commands.registerCommand("pureflow.quizCurrentFunction", () => sendMentorContext("quiz", true)),
    vscode.commands.registerCommand("pureflow.reviewReasoning", () => sendMentorContext("review")),
    vscode.commands.registerCommand("pureflow.inspectMonadSelection", async () => {
      const value = selectionQuery();
      if (!value) {
        void vscode.window.showInformationMessage("Select a Monad address or transaction hash first.");
        return;
      }
      await view.inspectFromCommand(value);
    }),
    vscode.commands.registerCommand("pureflow.runMonadDoctor", () => view.doctorFromCommand()),
    vscode.commands.registerCommand("pureflow.openSourceControl", () => vscode.commands.executeCommand("workbench.view.scm")),
    vscode.commands.registerCommand("pureflow.startRep", () => view.startFromCommand()),
    vscode.commands.registerCommand("pureflow.finishRep", () => view.finishFromCommand()),
    vscode.commands.registerCommand("pureflow.configureCoach", async () => {
      if (store.get().phase === "active") {
        void vscode.window.showWarningMessage("Coach configuration is unavailable during an active Focus Rep.");
        return;
      }
      if (await coach.configure()) await view.pushState();
    }),
    vscode.commands.registerCommand("pureflow.searchSelection", async () => {
      await view.prefillSearch(selectionQuery());
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("pureflow")) void view.pushState();
    }),
  );

  if (vscode.workspace.getConfiguration("pureflow").get<boolean>("openOnStartup")) {
    void view.showWorkspace();
  }

  let refreshTimer: NodeJS.Timeout | undefined;
  const scheduleRefresh = (): void => {
    status.refresh();
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void view.pushWorkspace(), 120);
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(scheduleRefresh),
    vscode.window.onDidChangeActiveTextEditor(scheduleRefresh),
    vscode.window.onDidChangeTextEditorSelection(scheduleRefresh),
    vscode.workspace.onDidSaveTextDocument(scheduleRefresh),
    { dispose: () => refreshTimer && clearTimeout(refreshTimer) },
  );
}

export function deactivate(): void {}
