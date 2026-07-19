import * as vscode from "vscode";
import type { WorkspaceSnapshot } from "./types";

export type { WorkspaceSnapshot } from "./types";

interface GitChange {
  uri?: vscode.Uri;
}

interface GitState {
  HEAD?: { name?: string };
  indexChanges?: GitChange[];
  workingTreeChanges?: GitChange[];
  mergeChanges?: GitChange[];
}

interface GitRepository {
  rootUri: vscode.Uri;
  state: GitState;
}

interface GitApi {
  repositories: GitRepository[];
}

interface GitExtension {
  getAPI(version: 1): GitApi;
}

interface GitSnapshot {
  branch: string;
  changedFiles: number;
}

export class WorkspaceService {
  async snapshot(): Promise<WorkspaceSnapshot> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;
    const selected = editor && selection && !selection.isEmpty
      ? editor.document.getText(selection)
      : "";
    const git = await this.gitSnapshot(editor?.document.uri);

    return {
      hasWorkspace: folders.length > 0,
      name: vscode.workspace.name ?? folders[0]?.name ?? "No project open",
      folders: folders.map((folder) => folder.name),
      currentFile: editor
        ? editor.document.isUntitled
          ? editor.document.fileName
          : vscode.workspace.asRelativePath(editor.document.uri, false)
        : "",
      language: editor?.document.languageId ?? "",
      gitBranch: git?.branch ?? "",
      dirty: Boolean(git?.changedFiles),
      hasSelection: Boolean(selected),
      selectionLines: selected
        ? `${selection!.end.line - selection!.start.line + 1} ${selection!.end.line === selection!.start.line ? "line" : "lines"}`
        : undefined,
      selectionChars: selected.length,
    };
  }

  async openProject(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Open project in PureFlow",
      title: "Open a project",
    });
    const folder = picked?.[0];
    if (folder) await vscode.commands.executeCommand("vscode.openFolder", folder, false);
  }

  async createProject(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Choose parent folder",
      title: "Where should PureFlow create the project?",
      defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
    });
    const parent = picked?.[0];
    if (!parent) return;

    const name = await vscode.window.showInputBox({
      title: "Create a project",
      prompt: "Project folder name",
      placeHolder: "my-project",
      ignoreFocusOut: true,
      validateInput: validateProjectName,
    });
    if (!name) return;

    const target = vscode.Uri.joinPath(parent, name.trim());
    if (await exists(target)) {
      void vscode.window.showErrorMessage(`A folder named “${name.trim()}” already exists.`);
      return;
    }

    await vscode.workspace.fs.createDirectory(target);
    await vscode.commands.executeCommand("vscode.openFolder", target, false);
  }

  openTerminal(): void {
    if (vscode.window.activeTerminal) {
      vscode.window.activeTerminal.show();
      return;
    }
    const editorFolder = vscode.window.activeTextEditor
      ? vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)
      : undefined;
    const cwd = editorFolder?.uri ?? vscode.workspace.workspaceFolders?.[0]?.uri;
    vscode.window.createTerminal({ name: "PureFlow", cwd }).show();
  }

  private async gitSnapshot(uri?: vscode.Uri): Promise<GitSnapshot | undefined> {
    try {
      const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
      if (!extension) return undefined;
      const exports = extension.isActive ? extension.exports : await extension.activate();
      const repositories = exports.getAPI(1).repositories;
      const repository = repositories.find((item) => uri && contains(item.rootUri, uri)) ?? repositories[0];
      if (!repository) return undefined;
      const state = repository.state;
      return {
        branch: state.HEAD?.name ?? "detached",
        changedFiles: new Set([
          ...(state.indexChanges ?? []),
          ...(state.workingTreeChanges ?? []),
          ...(state.mergeChanges ?? []),
        ].map((change) => change.uri?.toString()).filter(Boolean)).size,
      };
    } catch {
      return undefined;
    }
  }
}

function validateProjectName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter a project name.";
  if (name === "." || name === ".." || /[<>:"/\\|?*\u0000-\u001f]/.test(name)) {
    return "Use a folder name without path separators or reserved characters.";
  }
  return undefined;
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function contains(root: vscode.Uri, uri: vscode.Uri): boolean {
  if (root.scheme !== uri.scheme || root.authority !== uri.authority) return false;
  const rootPath = root.path.endsWith("/") ? root.path : `${root.path}/`;
  return uri.path === root.path || uri.path.startsWith(rootPath);
}
