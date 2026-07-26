import {
  assertExactKeys,
  assertPortableFixturePath,
  assertRelPath,
  assertSha256,
  canonicalHash,
  canonicalJson,
  compareUtf8,
  normalizeTreeFiles,
  treeHash,
  type FileMode,
  type TreeFile,
} from "../rnd/canonical";

export const R0_NODE_VERSION = "v22.17.0";

export interface FixtureBlobRef {
  id: string;
  sha256: string;
  storedBytes: number;
  mediaType: string;
  visibility: "controller" | "oracle";
}

export interface CandidateChange {
  path: string;
  beforeSha256: string | null;
  afterSha256: string | null;
  beforeMode: FileMode | null;
  afterMode: FileMode | null;
}

export interface CandidateDiff {
  schemaVersion: 1;
  baseTreeHash: string;
  resultTreeHash: string;
  changes: CandidateChange[];
}

export interface TrustedFixtureCommand {
  schemaVersion: 1;
  id: string;
  label: string;
  runner: "trusted-fixture";
  fixtureId: string;
  toolchainHandle: "fixture-node";
  args: string[];
  cwd: string;
  timeoutMs: number;
  envAllowlist: string[];
  maxOutputBytes: number;
  network: "not-enforced-reviewed-fixture";
}

export interface TrustedFixtureCheck {
  id: string;
  commandId: string;
}

export interface FixtureState {
  id: "base" | "target" | "mutated";
  treeHash: string;
  files: TreeFile[];
  commandIds: string[];
}

export interface FixtureManifest {
  schemaVersion: 1;
  fixtureId: string;
  stack: "node-typescript";
  defaultBranch: "main";
  baseRevision: string;
  targetRevision: string;
  changedSymbols: Array<{ path: string; symbol: string }>;
  commands: TrustedFixtureCommand[];
  checks: TrustedFixtureCheck[];
  baseChecks: string[];
  targetChecks: string[];
  mutation: {
    id: string;
    changeRef: FixtureBlobRef;
    expectedFailingChecks: string[];
    editablePaths: string[];
  };
  knownRepair: {
    changeRef: FixtureBlobRef;
    candidateDiff: CandidateDiff;
    candidateDiffHash: string;
    resultingState: "target";
  };
  states: FixtureState[];
  git: {
    autocrlf: false;
    eol: "lf";
    userName: "PureFlow Fixture";
    userEmail: "fixture@pureflow.invalid";
    authorDate: string;
    committerDate: string;
    objectFormat: "sha1";
  };
  toolchain: {
    nodeVersion: string;
    dependencies: "none";
    harness: FixtureBlobRef;
    oracle: FixtureBlobRef;
  };
}

export interface FixtureRuntime {
  handle: "fixture-node";
  version: string;
  executableSha256: string;
}

export function candidateDiffHash(diff: CandidateDiff): string {
  return canonicalHash("candidate-diff", normalizeCandidateDiff(diff));
}

export function fixtureManifestHash(manifest: FixtureManifest): string {
  validateFixtureManifest(manifest);
  return canonicalHash("fixture-manifest", manifest);
}

export function validateFixtureManifest(manifest: FixtureManifest, runtime?: FixtureRuntime): void {
  assertExactKeys(
    manifest,
    [
      "schemaVersion",
      "fixtureId",
      "stack",
      "defaultBranch",
      "baseRevision",
      "targetRevision",
      "changedSymbols",
      "commands",
      "checks",
      "baseChecks",
      "targetChecks",
      "mutation",
      "knownRepair",
      "states",
      "git",
      "toolchain",
    ],
    "fixture manifest",
  );
  if (manifest.schemaVersion !== 1 || manifest.stack !== "node-typescript" || manifest.defaultBranch !== "main") {
    throw new Error("Unsupported fixture manifest identity");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.fixtureId)) {
    throw new Error("Fixture id must use lowercase letters, digits, and hyphens");
  }

  assertGitOid(manifest.baseRevision, "baseRevision");
  assertGitOid(manifest.targetRevision, "targetRevision");
  assertUnique(manifest.changedSymbols.map(({ path, symbol }) => `${path}\0${symbol}`), "changed symbol");
  for (const changed of manifest.changedSymbols) {
    assertExactKeys(changed, ["path", "symbol"], "changed symbol");
    assertPortableFixturePath(changed.path);
    if (!changed.symbol.trim()) {
      throw new Error("Changed symbol cannot be empty");
    }
  }
  assertSorted(
    manifest.changedSymbols.map(({ path, symbol }) => `${path}\0${symbol}`),
    "changed symbols",
  );

  const commandIds = new Set(manifest.commands.map((command) => command.id));
  if (!manifest.commands.length || commandIds.size !== manifest.commands.length) {
    throw new Error("Fixture commands must be non-empty and unique");
  }
  for (const command of manifest.commands) {
    validateCommand(command, manifest.fixtureId);
  }
  assertSorted(manifest.commands.map((command) => command.id), "commands");

  const checkIds = new Set(manifest.checks.map((check) => check.id));
  if (!manifest.checks.length || checkIds.size !== manifest.checks.length) {
    throw new Error("Fixture checks must be non-empty and unique");
  }
  for (const check of manifest.checks) {
    assertExactKeys(check, ["id", "commandId"], "fixture check");
    if (!check.id.trim() || !commandIds.has(check.commandId)) {
      throw new Error(`Unknown command for check: ${check.id}`);
    }
  }
  assertSorted(manifest.checks.map((check) => check.id), "checks");
  assertKnown(manifest.baseChecks, checkIds, "base check");
  assertKnown(manifest.targetChecks, checkIds, "target check");
  assertKnown(manifest.mutation.expectedFailingChecks, checkIds, "expected failing check");
  for (const [label, ids] of [
    ["base checks", manifest.baseChecks],
    ["target checks", manifest.targetChecks],
    ["expected failing checks", manifest.mutation.expectedFailingChecks],
  ] as const) {
    assertUnique(ids, label);
    assertSorted(ids, label);
  }
  const targetChecks = new Set(manifest.targetChecks);
  if (manifest.mutation.expectedFailingChecks.some((id) => !targetChecks.has(id))) {
    throw new Error("Mutation failing checks must be target checks");
  }

  const states = new Map(manifest.states.map((state) => [state.id, state]));
  if (states.size !== 3 || !states.has("base") || !states.has("target") || !states.has("mutated")) {
    throw new Error("Fixture manifest requires exactly base, target, and mutated states");
  }
  if (manifest.states.length !== states.size) {
    throw new Error("Fixture state ids must be unique");
  }
  if (manifest.states.map(({ id }) => id).join(",") !== "base,target,mutated") {
    throw new Error("Fixture states must be ordered base, target, mutated");
  }
  for (const state of manifest.states) {
    validateState(state, commandIds);
  }

  const base = states.get("base")!;
  const mutated = states.get("mutated")!;
  const target = states.get("target")!;
  const checksById = new Map(manifest.checks.map((check) => [check.id, check]));
  assertChecksAllowed(manifest.baseChecks, base, checksById, "base");
  assertChecksAllowed(manifest.targetChecks, target, checksById, "target");
  assertChecksAllowed(manifest.mutation.expectedFailingChecks, mutated, checksById, "mutated");

  assertExactKeys(manifest.mutation, ["id", "changeRef", "expectedFailingChecks", "editablePaths"], "mutation");
  if (!manifest.mutation.id.trim()) {
    throw new Error("Mutation id cannot be empty");
  }
  for (const path of manifest.mutation.editablePaths) {
    assertPortableFixturePath(path);
    if (!mutated.files.some((file) => file.path === path)) {
      throw new Error(`Editable path is absent from mutated state: ${path}`);
    }
  }
  assertUnique(manifest.mutation.editablePaths, "editable path");
  assertSorted(manifest.mutation.editablePaths, "editable paths");

  assertExactKeys(
    manifest.knownRepair,
    ["changeRef", "candidateDiff", "candidateDiffHash", "resultingState"],
    "known repair",
  );
  if (manifest.knownRepair.resultingState !== "target") {
    throw new Error("Known repair resulting state must be target");
  }
  validateBlob(manifest.mutation.changeRef, "controller");
  validateBlob(manifest.knownRepair.changeRef, "controller");
  validateBlob(manifest.toolchain.harness, "controller");
  validateBlob(manifest.toolchain.oracle, "oracle");
  assertUnique(
    [
      manifest.mutation.changeRef.id,
      manifest.knownRepair.changeRef.id,
      manifest.toolchain.harness.id,
      manifest.toolchain.oracle.id,
    ],
    "fixture blob",
  );

  const repair = normalizeCandidateDiff(manifest.knownRepair.candidateDiff);
  for (const change of repair.changes) {
    assertPortableFixturePath(change.path);
  }
  if (canonicalJson(repair) !== canonicalJson(manifest.knownRepair.candidateDiff)) {
    throw new Error("Candidate diff changes must be sorted by UTF-8 path bytes");
  }
  if (repair.baseTreeHash !== mutated.treeHash || repair.resultTreeHash !== target.treeHash) {
    throw new Error("Known repair must describe the mutated to target transition");
  }
  if (candidateDiffHash(repair) !== manifest.knownRepair.candidateDiffHash) {
    throw new Error("Known repair candidate diff hash does not match");
  }
  const editable = new Set(manifest.mutation.editablePaths);
  if (repair.changes.some((change) => !editable.has(change.path))) {
    throw new Error("Known repair changes a path outside mutation.editablePaths");
  }
  validateTransition(repair, mutated, target);

  assertExactKeys(
    manifest.git,
    ["autocrlf", "eol", "userName", "userEmail", "authorDate", "committerDate", "objectFormat"],
    "fixture Git profile",
  );
  if (
    manifest.git.autocrlf !== false ||
    manifest.git.eol !== "lf" ||
    manifest.git.userName !== "PureFlow Fixture" ||
    manifest.git.userEmail !== "fixture@pureflow.invalid" ||
    manifest.git.objectFormat !== "sha1"
  ) {
    throw new Error("Fixture Git settings do not match the deterministic profile");
  }
  assertIsoTime(manifest.git.authorDate);
  assertIsoTime(manifest.git.committerDate);

  assertExactKeys(manifest.toolchain, ["nodeVersion", "dependencies", "harness", "oracle"], "fixture toolchain");
  if (manifest.toolchain.nodeVersion !== R0_NODE_VERSION || manifest.toolchain.dependencies !== "none") {
    throw new Error(`Fixture requires the pinned ${R0_NODE_VERSION} dependency-free toolchain`);
  }
  if (runtime) {
    assertExactKeys(runtime, ["handle", "version", "executableSha256"], "fixture runtime");
    assertSha256(runtime.executableSha256, "runtime executableSha256");
    if (runtime.handle !== "fixture-node" || runtime.version !== manifest.toolchain.nodeVersion) {
      throw new Error("Fixture runtime identity does not match the manifest");
    }
  }
}

function normalizeCandidateDiff(diff: CandidateDiff): CandidateDiff {
  assertExactKeys(diff, ["schemaVersion", "baseTreeHash", "resultTreeHash", "changes"], "candidate diff");
  if (diff.schemaVersion !== 1) {
    throw new Error("Unsupported candidate diff schema");
  }
  assertSha256(diff.baseTreeHash, "candidate baseTreeHash");
  assertSha256(diff.resultTreeHash, "candidate resultTreeHash");

  const changes = diff.changes
    .map((change) => {
      assertExactKeys(
        change,
        ["path", "beforeSha256", "afterSha256", "beforeMode", "afterMode"],
        "candidate change",
      );
      return {
        path: change.path,
        beforeSha256: change.beforeSha256,
        afterSha256: change.afterSha256,
        beforeMode: change.beforeMode,
        afterMode: change.afterMode,
      };
    })
    .sort((a, b) => compareUtf8(a.path, b.path));
  if (!changes.length) {
    throw new Error("Candidate diff must contain at least one change");
  }
  const paths = new Set<string>();
  const folded = new Set<string>();
  for (const change of changes) {
    assertRelPath(change.path);
    const key = change.path.toLowerCase();
    if (paths.has(change.path) || folded.has(key)) {
      throw new Error(`Duplicate or case-colliding candidate path: ${change.path}`);
    }
    paths.add(change.path);
    folded.add(key);
    validateSide(change.beforeSha256, change.beforeMode, "before", change.path);
    validateSide(change.afterSha256, change.afterMode, "after", change.path);
    if (change.beforeSha256 === null && change.afterSha256 === null) {
      throw new Error(`Candidate change has no before or after state: ${change.path}`);
    }
  }

  return { ...diff, changes };
}

function validateSide(sha: string | null, mode: FileMode | null, side: string, path: string): void {
  if ((sha === null) !== (mode === null)) {
    throw new Error(`Candidate ${side} hash and mode must both be present or absent: ${path}`);
  }
  if (sha !== null) {
    assertSha256(sha, `${path} ${side}Sha256`);
  }
  if (mode !== null && mode !== "100644" && mode !== "100755") {
    throw new Error(`Unsupported candidate ${side} mode: ${path}`);
  }
}

function validateCommand(command: TrustedFixtureCommand, fixtureId: string): void {
  assertExactKeys(
    command,
    [
      "schemaVersion",
      "id",
      "label",
      "runner",
      "fixtureId",
      "toolchainHandle",
      "args",
      "cwd",
      "timeoutMs",
      "envAllowlist",
      "maxOutputBytes",
      "network",
    ],
    "trusted fixture command",
  );
  if (
    command.schemaVersion !== 1 ||
    command.runner !== "trusted-fixture" ||
    command.fixtureId !== fixtureId ||
    command.toolchainHandle !== "fixture-node" ||
    command.network !== "not-enforced-reviewed-fixture"
  ) {
    throw new Error(`Invalid trusted fixture command: ${command.id}`);
  }
  if (!command.id.trim() || !command.label.trim() || command.args.some((arg) => typeof arg !== "string" || arg.includes("\0"))) {
    throw new Error(`Invalid command fields: ${command.id}`);
  }
  assertPortableFixturePath(command.cwd, true);
  if (!Number.isInteger(command.timeoutMs) || command.timeoutMs < 1_000 || command.timeoutMs > 600_000) {
    throw new Error(`Invalid command timeout: ${command.id}`);
  }
  if (!Number.isInteger(command.maxOutputBytes) || command.maxOutputBytes < 1 || command.maxOutputBytes > 1_048_576) {
    throw new Error(`Invalid command output limit: ${command.id}`);
  }
  assertUnique(command.envAllowlist, `environment variable in ${command.id}`);
  assertSorted(command.envAllowlist, `environment allowlist in ${command.id}`);
  if (command.envAllowlist.some((name) => !/^[A-Z_][A-Z0-9_]*$/.test(name))) {
    throw new Error(`Invalid environment allowlist: ${command.id}`);
  }
}

function validateState(state: FixtureState, commandIds: Set<string>): void {
  assertExactKeys(state, ["id", "treeHash", "files", "commandIds"], "fixture state");
  const normalized = normalizeTreeFiles(state.files);
  for (const file of normalized) {
    assertPortableFixturePath(file.path);
  }
  if (normalized.map(({ path }) => path).join("\0") !== state.files.map(({ path }) => path).join("\0")) {
    throw new Error(`Fixture state files must be sorted: ${state.id}`);
  }
  if (treeHash(normalized) !== state.treeHash) {
    throw new Error(`Fixture state tree hash does not match: ${state.id}`);
  }
  assertKnown(state.commandIds, commandIds, `${state.id} command`);
  assertUnique(state.commandIds, `${state.id} command`);
  assertSorted(state.commandIds, `${state.id} commands`);
}

function validateBlob(ref: FixtureBlobRef, visibility: FixtureBlobRef["visibility"]): void {
  assertExactKeys(ref, ["id", "sha256", "storedBytes", "mediaType", "visibility"], "fixture blob ref");
  if (!ref.id.trim() || !ref.mediaType.trim() || ref.visibility !== visibility) {
    throw new Error(`Invalid fixture blob ref: ${ref.id}`);
  }
  assertSha256(ref.sha256, `${ref.id} sha256`);
  if (!Number.isInteger(ref.storedBytes) || ref.storedBytes < 0 || ref.storedBytes > 1_048_576) {
    throw new Error(`Invalid fixture blob size: ${ref.id}`);
  }
}

function assertKnown(values: readonly string[], known: Set<string>, label: string): void {
  for (const value of values) {
    if (!known.has(value)) {
      throw new Error(`Unknown ${label}: ${value}`);
    }
  }
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Duplicate ${label}`);
  }
}

function assertSorted(values: readonly string[], label: string): void {
  const sorted = [...values].sort(compareUtf8);
  if (values.some((value, index) => value !== sorted[index])) {
    throw new Error(`Fixture ${label} must be sorted by UTF-8 bytes`);
  }
}

function validateTransition(diff: CandidateDiff, before: FixtureState, after: FixtureState): void {
  const beforeFiles = new Map(before.files.map((file) => [file.path, file]));
  const afterFiles = new Map(after.files.map((file) => [file.path, file]));
  const paths = [...new Set([...beforeFiles.keys(), ...afterFiles.keys()])].sort(compareUtf8);
  const actual = paths.filter((path) => {
    const left = beforeFiles.get(path);
    const right = afterFiles.get(path);
    return left?.sha256 !== right?.sha256 || left?.mode !== right?.mode;
  });

  if (actual.join("\0") !== diff.changes.map(({ path }) => path).join("\0")) {
    throw new Error("Candidate diff paths do not match the declared tree transition");
  }
  for (const change of diff.changes) {
    const left = beforeFiles.get(change.path);
    const right = afterFiles.get(change.path);
    if (
      change.beforeSha256 !== (left?.sha256 ?? null) ||
      change.beforeMode !== (left?.mode ?? null) ||
      change.afterSha256 !== (right?.sha256 ?? null) ||
      change.afterMode !== (right?.mode ?? null)
    ) {
      throw new Error(`Candidate diff metadata does not match tree files: ${change.path}`);
    }
  }
}

function assertGitOid(value: string, label: string): void {
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`${label} must be a full SHA-1 Git OID`);
  }
}

function assertIsoTime(value: string): void {
  const parsed = new Date(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString() !== value
  ) {
    throw new Error(`Invalid UTC millisecond timestamp: ${value}`);
  }
}

function assertChecksAllowed(
  checkIds: readonly string[],
  state: FixtureState,
  checks: Map<string, TrustedFixtureCheck>,
  label: string,
): void {
  const allowed = new Set(state.commandIds);
  for (const id of checkIds) {
    const check = checks.get(id)!;
    if (!allowed.has(check.commandId)) {
      throw new Error(`Check ${id} is not runnable in ${label} state`);
    }
  }
}
