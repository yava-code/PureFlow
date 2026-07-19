import * as vscode from "vscode";
import { Coach } from "./coach";
import { recordExternalChange } from "./domain";
import { RepStore } from "./store";
import { PureFlowView } from "./view";

export function activate(context: vscode.ExtensionContext): void {
  const store = new RepStore(context);
  const coach = new Coach(context);
  const view = new PureFlowView(context, store, coach);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PureFlowView.viewType, view, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("pureflow.open", () => view.focus()),
    vscode.commands.registerCommand("pureflow.startRep", () => view.startFromCommand()),
    vscode.commands.registerCommand("pureflow.finishRep", () => view.finishFromCommand()),
    vscode.commands.registerCommand("pureflow.configureCoach", async () => {
      if (store.get().phase === "active") {
        void vscode.window.showWarningMessage("Coach configuration is unavailable during Pure Mode.");
        return;
      }
      if (await coach.configure()) await view.pushState();
    }),
    vscode.commands.registerCommand("pureflow.searchSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      const value = editor?.document.getText(editor.selection).trim();
      const word = editor?.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active));
      await view.prefillSearch(value || word || "");
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("pureflow")) void view.pushState();
    }),
  );

  const recentSaves = new Map<string, number>();
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      recentSaves.set(document.uri.toString(), Date.now());
      setTimeout(() => recentSaves.delete(document.uri.toString()), 1500);
    }),
  );

  const watcher = vscode.workspace.createFileSystemWatcher("**/*", false, false, false);
  watcher.onDidChange(async (uri) => {
    if (store.get().phase !== "active") return;
    const savedAt = recentSaves.get(uri.toString()) ?? 0;
    if (Date.now() - savedAt < 1500) return;
    await store.set(recordExternalChange(store.get()));
    await view.pushState();
  });
  context.subscriptions.push(watcher);
}

export function deactivate(): void {}

