import ts from "typescript";
import { assertRelPath, compareUtf8, rawSha256 } from "../rnd/canonical";
import type { ExtractionReason, SemanticUnitDraft } from "./evidence";
import type { RevisionFileChange } from "./diff";

interface UnitSpan {
  symbol: string;
  kind: SemanticUnitDraft["kind"];
  startLine: number;
  endLine: number;
}

interface ParsedSide {
  text: string;
  changed: number[];
  units: UnitSpan[];
}

export interface ChangedSymbolResult {
  units: SemanticUnitDraft[];
  reasons: ExtractionReason[];
}

export function extractChangedSymbols(change: RevisionFileChange): ChangedSymbolResult {
  const path = change.afterPath ?? change.beforePath;
  if (path === undefined) throw new Error("Changed file requires a path");
  assertRelPath(path);
  if (change.beforePath !== undefined) assertRelPath(change.beforePath);
  if (change.afterPath !== undefined) assertRelPath(change.afterPath);
  assertChangedLines(change.beforeChangedLines, "beforeChangedLines");
  assertChangedLines(change.afterChangedLines, "afterChangedLines");

  if (!isTypeScript(path)) return { units: [], reasons: ["unsupported-language"] };

  const before = parseSide(change.beforeText, change.beforeChangedLines, change.beforePath ?? path);
  const after = parseSide(change.afterText, change.afterChangedLines, change.afterPath ?? path);
  if (before === "invalid" || after === "invalid") return { units: [], reasons: ["unsupported-syntax"] };

  const selected = new Map<string, SemanticUnitDraft>();
  addSelected(selected, path, before, change.status === "renamed" && change.beforeChangedLines.length === 0);
  addSelected(selected, path, after, change.status === "renamed" && change.afterChangedLines.length === 0);

  if (selected.size === 0 && (change.beforeChangedLines.length > 0 || change.afterChangedLines.length > 0)) {
    const hashes = changedHashes(before, after, undefined);
    selected.set("module-boundary\0<module>", {
      path,
      symbol: "<module>",
      kind: "module-boundary",
      changedLineSha256: hashes,
    });
  }

  const units = [...selected.values()];
  units.sort((left, right) => compareUtf8(left.path, right.path) || compareUtf8(left.symbol, right.symbol) || compareUtf8(left.kind, right.kind));
  return { units, reasons: [] };
}

function parseSide(text: string | undefined, changed: number[], path: string): ParsedSide | undefined | "invalid" {
  if (text === undefined) return undefined;
  const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const diagnostics = (source as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ?? [];
  if (diagnostics.length > 0) return "invalid";
  return { text, changed, units: collectUnits(source) };
}

function collectUnits(source: ts.SourceFile): UnitSpan[] {
  const units: UnitSpan[] = [];

  const span = (node: ts.Node): Pick<UnitSpan, "startLine" | "endLine"> => ({
    startLine: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    endLine: source.getLineAndCharacterOfPosition(node.getEnd()).line + 1,
  });

  const visit = (node: ts.Node, className?: string): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      units.push({ symbol: node.name.text, kind: "function", ...span(node) });
      return;
    }
    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      const name = node.name.text;
      units.push({ symbol: name, kind: "class", ...span(node) });
      node.members.forEach((member) => visit(member, name));
      return;
    }
    if (className !== undefined && ts.isMethodDeclaration(node) && node.name !== undefined) {
      const name = propertyName(node.name);
      if (name !== undefined) units.push({ symbol: `${className}.${name}`, kind: "method", ...span(node) });
      return;
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      if (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) {
        units.push({ symbol: node.name.text, kind: "function", ...span(node) });
        return;
      }
    }
    ts.forEachChild(node, (child) => visit(child, className));
  };

  source.forEachChild((node) => visit(node));
  return units;
}

function addSelected(
  selected: Map<string, SemanticUnitDraft>,
  path: string,
  side: ParsedSide | undefined,
  selectAll: boolean,
): void {
  if (side === undefined) return;
  const candidates = side.units.filter((unit) => selectAll || intersects(unit, side.changed));
  const mostSpecific = candidates.filter((candidate) => !candidates.some((other) =>
    other !== candidate &&
    other.startLine >= candidate.startLine &&
    other.endLine <= candidate.endLine &&
    (other.startLine > candidate.startLine || other.endLine < candidate.endLine),
  ));

  for (const unit of mostSpecific) {
    const key = `${unit.kind}\0${unit.symbol}`;
    const hashes = side.changed
      .filter((line) => line >= unit.startLine && line <= unit.endLine)
      .map((line) => lineHash(side.text, line));
    const existing = selected.get(key);
    selected.set(key, {
      path,
      symbol: unit.symbol,
      kind: unit.kind,
      changedLineSha256: sortedUnique([...(existing?.changedLineSha256 ?? []), ...hashes]),
    });
  }
}

function changedHashes(
  before: ParsedSide | undefined,
  after: ParsedSide | undefined,
  span: UnitSpan | undefined,
): string[] {
  const hashes: string[] = [];
  for (const side of [before, after]) {
    if (side === undefined) continue;
    for (const line of side.changed) {
      if (span === undefined || (line >= span.startLine && line <= span.endLine)) hashes.push(lineHash(side.text, line));
    }
  }
  return sortedUnique(hashes);
}

function lineHash(text: string, line: number): string {
  const lines = text.split(/\r\n|\n|\r/);
  if (line < 1 || line > lines.length) throw new Error(`Changed line ${line} is outside the source file`);
  return rawSha256(Buffer.from(lines[line - 1]!, "utf8"));
}

function intersects(unit: UnitSpan, lines: readonly number[]): boolean {
  return lines.some((line) => line >= unit.startLine && line <= unit.endLine);
}

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function assertChangedLines(lines: readonly number[], label: string): void {
  let previous = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line) || line < 1 || line <= previous) throw new Error(`${label} must be sorted unique positive integers`);
    previous = line;
  }
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort(compareUtf8);
}

function isTypeScript(path: string): boolean {
  return (path.endsWith(".ts") || path.endsWith(".tsx")) && !path.endsWith(".d.ts");
}
