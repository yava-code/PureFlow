import * as vscode from "vscode";
import { formatDuration } from "./domain";
import type { RepStore } from "./store";

export class PureFlowStatus implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 25);
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly store: RepStore) {
    this.item.name = "PureFlow";
    this.timer = setInterval(() => this.refresh(), 30_000);
    this.refresh();
    this.item.show();
  }

  refresh(): void {
    const rep = this.store.get();
    if (rep.phase === "active" && rep.startedAt) {
      const seconds = Math.max(0, Math.round((Date.now() - rep.startedAt) / 1000));
      this.item.text = `$(record) Pure ${formatDuration(seconds)}`;
      this.item.tooltip = `Pure Mode · ${rep.goal}`;
      this.item.command = "pureflow.finishRep";
      this.item.accessibilityInformation = { label: `Pure Mode active for ${formatDuration(seconds)}` };
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor && !editor.selection.isEmpty) {
      this.item.text = "$(comment-discussion) Explain";
      this.item.tooltip = "Explain the selected code in the PureFlow sidebar";
      this.item.command = "pureflow.explainSelection";
      this.item.accessibilityInformation = { label: "Explain selected code with PureFlow" };
      return;
    }

    if (vscode.workspace.workspaceFolders?.length) {
      this.item.text = "$(code) PureFlow";
      this.item.tooltip = vscode.workspace.name
        ? `Open the PureFlow workbench for ${vscode.workspace.name}`
        : "Open the PureFlow workbench";
      this.item.command = "pureflow.open";
      this.item.accessibilityInformation = { label: "Open PureFlow workbench" };
      return;
    }

    this.item.text = "$(folder-opened) Open project";
    this.item.tooltip = "Open a project in PureFlow";
    this.item.command = "pureflow.openProject";
    this.item.accessibilityInformation = { label: "Open a project in PureFlow" };
  }

  dispose(): void {
    clearInterval(this.timer);
    this.item.dispose();
  }
}
