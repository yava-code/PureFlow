import * as vscode from "vscode";
import { safeFileLabel } from "./privacy";
import type { EditorContext as MentorEditorContext } from "./types";

const maxContextLength = 12_000;

export interface EditorContext extends MentorEditorContext {
  symbol?: string;
  truncated: boolean;
}

export function editorContext(editor = vscode.window.activeTextEditor): EditorContext | undefined {
  if (!editor) return undefined;

  const { document, selection } = editor;
  const wordRange = document.getWordRangeAtPosition(selection.active);
  const range = selection.isEmpty ? wordRange ?? document.lineAt(selection.active.line).range : selection;
  const raw = document.getText(range).trim();
  if (!raw) return undefined;

  const truncated = raw.length > maxContextLength;
  return {
    file: documentLabel(document),
    language: document.languageId,
    code: truncated ? raw.slice(0, maxContextLength) : raw,
    symbol: wordRange ? document.getText(wordRange) : undefined,
    startLine: range.start.line + 1,
    endLine: range.end.line + 1,
    truncated,
  };
}

export async function mentorEditorContext(
  allowCurrentFunction: boolean,
  editor = vscode.window.activeTextEditor,
): Promise<EditorContext | undefined> {
  if (!editor) return undefined;
  if (!editor.selection.isEmpty) return editorContext(editor);
  if (!allowCurrentFunction) return undefined;

  const symbols = await vscode.commands.executeCommand<Array<vscode.DocumentSymbol | vscode.SymbolInformation>>(
    "vscode.executeDocumentSymbolProvider",
    editor.document.uri,
  );
  const symbol = deepestSymbol(symbols ?? [], editor.selection.active);
  if (!symbol) return editorContext(editor);
  const range = "selectionRange" in symbol ? symbol.range : symbol.location.range;
  return contextFromRange(editor, range, "name" in symbol ? symbol.name : undefined);
}

export function selectionQuery(editor = vscode.window.activeTextEditor): string {
  if (!editor) return "";
  const selected = editor.document.getText(editor.selection).trim();
  if (selected && !selected.includes("\n") && selected.length <= 180) return selected;
  const range = editor.document.getWordRangeAtPosition(editor.selection.active);
  return range ? editor.document.getText(range) : "";
}

function deepestSymbol(
  symbols: Array<vscode.DocumentSymbol | vscode.SymbolInformation>,
  position: vscode.Position,
): vscode.DocumentSymbol | vscode.SymbolInformation | undefined {
  let best: vscode.DocumentSymbol | vscode.SymbolInformation | undefined;
  const visit = (symbol: vscode.DocumentSymbol | vscode.SymbolInformation): void => {
    const range = "selectionRange" in symbol ? symbol.range : symbol.location.range;
    if (!range.contains(position)) return;
    if (isCodeSymbol(symbol.kind)) best = symbol;
    if ("children" in symbol) symbol.children.forEach(visit);
  };
  symbols.forEach(visit);
  return best;
}

function isCodeSymbol(kind: vscode.SymbolKind): boolean {
  return kind === vscode.SymbolKind.Function
    || kind === vscode.SymbolKind.Method
    || kind === vscode.SymbolKind.Constructor
    || kind === vscode.SymbolKind.Class;
}

function contextFromRange(editor: vscode.TextEditor, range: vscode.Range, symbol?: string): EditorContext | undefined {
  const raw = editor.document.getText(range).trim();
  if (!raw) return undefined;
  const truncated = raw.length > maxContextLength;
  return {
    file: documentLabel(editor.document),
    language: editor.document.languageId,
    code: truncated ? raw.slice(0, maxContextLength) : raw,
    symbol,
    startLine: range.start.line + 1,
    endLine: range.end.line + 1,
    truncated,
  };
}

function documentLabel(document: vscode.TextDocument): string {
  const folder = document.isUntitled ? undefined : vscode.workspace.getWorkspaceFolder(document.uri);
  const relative = folder ? vscode.workspace.asRelativePath(document.uri, false) : undefined;
  return safeFileLabel(document.fileName, relative);
}
