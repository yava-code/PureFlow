# R&D Contracts and Isolation Protocol

## Status

These contracts close the boundaries required before R0–R4 may be delegated. They are normative for the first vertical slice. An implementation may add fields only through a versioned change and an ADR; it must not silently reinterpret identifiers, evidence, commands, hidden answers, or judge authority.

## 1. Common types and limits

```ts
type SchemaVersion = 1;
type IsoTime = string;
type ProjectId = string;
type TaskId = string;
type RunId = string;
type ExecutionId = string;
type WorktreeId = string;
type ExperienceId = string;
type EvidenceId = string;
type TestId = string;
type GitOid = string;
type Sha256 = string;
type RelPath = string;

interface EvidenceRef {
  id: EvidenceId;
  kind: "diff" | "command-output" | "test-output" | "trace" | "plan" | "artifact";
  sha256: Sha256;
  storedBytes: number;
  originalBytes: number;
  truncated: boolean;
  redactions: Array<{ ruleId: string; count: number }>;
  mediaType: string;
  visibility: "controller" | "participant" | "oracle";
}

interface EvidenceInputMeta {
  kind: EvidenceRef["kind"];
  mediaType: string;
  visibility: EvidenceRef["visibility"];
  originalBytes: number;
  truncated: boolean;
  redactions: Array<{ ruleId: string; count: number }>;
}

interface FixtureBlobRef {
  id: string;
  sha256: Sha256;
  storedBytes: number;
  mediaType: string;
  visibility: "controller" | "oracle";
}
```

Invariants:

- `ProjectId` is a random local identifier stored by the extension. It is not derived from an absolute path or remote URL.
- `RelPath` is normalized with `/`, must not be absolute, and must not contain a `..` segment. R0 fixture paths use the stricter portable subset `[A-Za-z0-9._@+-]` per segment and reject Windows device names, so the same manifest materializes on Windows and Linux.
- `GitOid` is a full object ID resolved and verified in the controller repository before use.
- `ExecutionId` is a controller-issued random identifier for one command invocation. It is never reused, even when the same command runs again.
- timestamps are UTC ISO-8601 with milliseconds;
- task summaries are at most 4 KiB; each acceptance item is at most 1 KiB and there are at most 32;
- an individual stored evidence blob is at most 1 MiB in the R&D slice; larger command output records original size and explicit truncation/redaction metadata;
- Flight Recorder events contain references and hashes, not raw source files or terminal streams.

### Canonical hashing

Canonical object digests and raw byte hashes use one explicitly separated scheme:

- bytes are UTF-8 without BOM;
- JSON is serialized with [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785), with no `undefined`, non-finite number, platform path, or locale-dependent value;
- `canonicalHash(domain, value)` is lowercase hex SHA-256 over `UTF8("pureflow/v0.3/" + domain + "\n") || UTF8(JCS(value))`;
- fields named `sha256` contain lowercase hex raw `SHA-256(bytes)` for the exact stored bytes; Git OIDs retain Git's native object algorithm and are never placed in a `Sha256` field;
- a file manifest is sorted by the UTF-8 byte order of normalized `path`, rejects duplicate or case-colliding paths, and hashes `[{ path, mode, sha256 }]` with domain `tree`;
- `FixtureManifest` uses domain `fixture-manifest`, command registry snapshots use `command-registry`, task intents use `task-intent`, semantic units use `semantic-unit`, candidate seams use `candidate-seam`, participant diffs use `candidate-diff`, command results use `command-result`, judge results use `judge-result`, Control Pulse claims use `control-claim`, internal probes use `control-probe`, probe attempts use `control-probe-attempt`, probe results use `control-probe-result`, capability records use `capability-evidence`, and readiness records use `verified-readiness`; a value omits its own digest field before hashing.

`candidate-diff` never hashes Git's formatted patch output. It hashes this normalized value, with `changes` sorted by UTF-8 bytes of `path` and duplicate or case-colliding paths rejected:

```ts
interface CandidateDiff {
  schemaVersion: SchemaVersion;
  baseTreeHash: Sha256;
  resultTreeHash: Sha256;
  changes: Array<{
    path: RelPath;
    beforeSha256: Sha256 | null;
    afterSha256: Sha256 | null;
    beforeMode: "100644" | "100755" | null;
    afterMode: "100644" | "100755" | null;
  }>;
}
```

The patch bytes used to apply a change are a separate `FixtureBlobRef`. A patch blob is transport; `CandidateDiff` is the canonical statement of the before/after tree transition.

Implementations must ship cross-platform golden vectors for every domain before the corresponding store is accepted. No module may substitute `JSON.stringify`, Git tree IDs, filesystem enumeration order, or a second canonicalizer.

## 2. Agent boundary

```ts
interface AgentTask {
  schemaVersion: SchemaVersion;
  taskId: TaskId;
  intent: {
    summary: string;
    acceptance: string[];
  };
  requestedAt: IsoTime;
}

interface AgentWorkspace {
  schemaVersion: SchemaVersion;
  projectId: ProjectId;
  worktreeId: WorktreeId;
  baseRevision: GitOid;
  trusted: boolean;
  localHandle: string;
}

interface AgentRun {
  schemaVersion: SchemaVersion;
  runId: RunId;
  taskId: TaskId;
  projectId: ProjectId;
  driverId: string;
  baseRevision: GitOid;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  startedAt?: IsoTime;
  finishedAt?: IsoTime;
  targetRevision?: GitOid;
}

interface AgentDriver {
  start(task: AgentTask, workspace: AgentWorkspace): Promise<AgentRun>;
  followUp(runId: RunId, message: string): Promise<void>;
  cancel(runId: RunId): Promise<void>;
  events(runId: RunId): AsyncIterable<RunEnvelope>;
}

interface TaskStore {
  put(projectId: ProjectId, task: AgentTask): Promise<Sha256>;
  get(projectId: ProjectId, taskId: TaskId): Promise<AgentTask | undefined>;
  removeProject(projectId: ProjectId): Promise<void>;
}
```

`localHandle` is an opaque runtime lookup into an extension-owned workspace registry. It must never be serialized into the Flight Recorder, webview messages, research export, or logs. Vendor-specific events end at the adapter; downstream modules consume only normalized Flight Recorder events.

`trusted` records the state at agent start for audit. It is not an authorization token: the command runner rechecks live `vscode.workspace.isTrusted` immediately before every non-fixture execution and cancels if trust was revoked.

An adapter may record an explicit plan emitted by an agent. It must never request, store, or reconstruct hidden chain-of-thought.

`TaskStore.put` validates the limits above and returns `canonicalHash("task-intent", task)`; `task.started.intentHash` must equal that value. The full bounded intent stays controller-local and is never included in a participant manifest by default.

## 3. Flight Recorder envelope and ordering

```ts
interface RunEnvelope {
  schemaVersion: SchemaVersion;
  projectId: ProjectId;
  runId: RunId;
  seq: number;
  at: IsoTime;
  event: RunEvent;
}

type RunEvent =
  | { type: "task.started"; taskId: TaskId; baseRevision: GitOid; intentHash: Sha256 }
  | { type: "plan.recorded"; plan: EvidenceRef }
  | {
      type: "file.changed";
      path: RelPath;
      beforeSha256: Sha256;
      afterSha256: Sha256;
      diff: EvidenceRef;
    }
  | { type: "command.started"; executionId: ExecutionId; commandId: string }
  | {
      type: "command.finished";
      executionId: ExecutionId;
      commandId: string;
      exitCode: number | null;
      timedOut: boolean;
      cancelled: boolean;
      output: EvidenceRef;
    }
  | {
      type: "test.finished";
      executionId: ExecutionId;
      commandId: string;
      testId: string;
      status: "passed" | "failed" | "skipped";
      output: EvidenceRef;
    }
  | {
      type: "run.finished";
      status: "succeeded" | "failed" | "cancelled";
      targetRevision?: GitOid;
    };
```

Ordering rules:

- `seq` starts at `1` for each run and increases by exactly one;
- the store rejects duplicates, gaps, events after `run.finished`, and a second terminal event;
- `task.started` must be first;
- each `executionId` appears in exactly one `command.started`; later command/test events for that invocation must carry the same `commandId`, and exactly one `command.finished` closes it;
- events for different execution IDs may interleave; ordering within an invocation still follows the enclosing `seq`;
- a succeeded run must include a controller-verified `targetRevision`;
- a cancelled or failed run may omit it;
- wall-clock timestamps are descriptive; `seq` is authoritative for order.

```ts
interface RunRecorder {
  append(event: RunEnvelope): Promise<void>;
  read(runId: RunId, afterSeq?: number): AsyncIterable<RunEnvelope>;
  lastSeq(runId: RunId): Promise<number>;
}

interface EvidenceStore {
  put(
    projectId: ProjectId,
    input: NodeJS.ReadableStream,
    meta: EvidenceInputMeta
  ): Promise<EvidenceRef>;
  open(projectId: ProjectId, ref: EvidenceRef): Promise<NodeJS.ReadableStream>;
  removeProject(projectId: ProjectId): Promise<void>;
}
```

`EvidenceStore.put` verifies that the redacted input length equals the resulting `storedBytes` and that `storedBytes <= originalBytes`. `EvidenceStore.open` verifies project ownership, stored size, and SHA-256 before returning content. A reference from another project is rejected. Redaction occurs before `put`; redaction summaries contain rule IDs and counts, never matched values.

## 4. Approved command registry

No task, event, experience manifest, webview message, or LLM response may introduce a free-form shell string.

```ts
interface CommandBase {
  schemaVersion: SchemaVersion;
  id: string;
  label: string;
  toolchainHandle: string;
  args: string[];
  cwd: RelPath;
  timeoutMs: number;
  envAllowlist: string[];
  maxOutputBytes: number;
}

type TrustedFixtureCommand = CommandBase & {
  runner: "trusted-fixture";
  fixtureId: string;
  toolchainHandle: "fixture-node";
  network: "not-enforced-reviewed-fixture";
};

interface TrustedFixtureCheck {
  id: TestId;
  commandId: string;
}

type IsolatedCommand = CommandBase & {
  runner: "sandbox";
  network: "none";
};

type ApprovedCommand = TrustedFixtureCommand | IsolatedCommand;

interface CommandRegistrySnapshot {
  schemaVersion: SchemaVersion;
  projectId: ProjectId;
  commands: ApprovedCommand[];
  sha256: Sha256;
}

interface CommandRegistry {
  freeze(projectId: ProjectId, commandIds: string[]): Promise<CommandRegistrySnapshot>;
  open(projectId: ProjectId, sha256: Sha256): Promise<CommandRegistrySnapshot | undefined>;
}

interface SandboxCapabilities {
  networkNone: boolean;
  hostFilesystemIsolated: boolean;
  readOnlyOracleMount: boolean;
  processTreeKill: boolean;
  resourceLimits: boolean;
}

interface SandboxRequest {
  executionId: ExecutionId;
  projectId: ProjectId;
  twinHandle: string;
  command: IsolatedCommand;
  writablePaths: RelPath[];
  readOnlyMounts: Array<{ localHandle: string; mountAt: RelPath; sha256: Sha256 }>;
  hostMountAllowlist: string[];
}

interface CommandResult {
  executionId: ExecutionId;
  commandId: string;
  exitCode: number | null;
  timedOut: boolean;
  cancelled: boolean;
  stdout: EvidenceRef;
  stderr: EvidenceRef;
}

interface SandboxRunner {
  capabilities(): Promise<SandboxCapabilities>;
  run(request: SandboxRequest): Promise<CommandResult>;
  cancel(executionId: ExecutionId): Promise<void>;
}
```

`CommandResult` has exact keys. Its `stdout` and `stderr` refs must reopen in the same project with exact stored hashes and sizes; each redaction list is sorted by UTF-8 `ruleId` and rejects duplicates. `commandResultHash` means `canonicalHash("command-result", commandResult)` over this exact bounded object. Every runner implementation ships the same fixed golden vector before its results may enter a judge or Control Pulse evidence chain.

Rules:

- the registry is created from a fixture manifest or an explicit user-approved project configuration;
- `CommandRegistrySnapshot.sha256` is `canonicalHash("command-registry", { schemaVersion, projectId, commands })`; commands are ordered by ID and duplicate IDs are rejected; a command change creates a new snapshot rather than mutating an existing one;
- `toolchainHandle` is resolved only through a runner-owned catalog and is never interpreted as a filesystem path or executable supplied by a task, manifest payload, webview, or LLM. `fixture-node` resolves to a PureFlow-owned standalone Node runtime whose exact version matches the manifest and whose platform artifact hash is verified by the catalog. It never aliases the VSCodium/Electron executable or an ambient `node` on `PATH`; sandbox handles resolve inside the hash-pinned backend image selected by ADR-003;
- execution uses an argument array with `shell: false` and a hidden window;
- `cwd` resolves inside the twin root after canonicalization;
- `timeoutMs` is between 1 second and 10 minutes for R&D;
- environment starts empty and receives only an implementation-owned minimal platform set plus allowlisted non-secret variables;
- common credential variables, extension secrets, Git credentials, cloud credentials, and parent process tokens are never inherited;
- `TrustedFixtureRunner` makes no network-isolation claim and accepts only the committed, dependency-free fixture set; every `SandboxRunner` command requires `network: none`, and non-fixture execution is unsupported until the selected backend proves that capability;
- all five sandbox capabilities above must be true for corpus or participant execution;
- the sandbox receives only canonicalized mounts in `hostMountAllowlist`; the production checkout, extension storage, home directory, credential stores, device paths, and parent directories are absent;
- before materialization or diff application, reject symlinks, junctions/reparse points, Git submodules/gitlinks, device paths, alternate data streams, hard links escaping the snapshot, and any non-regular file entry not explicitly supported;
- stdout and stderr are bounded separately and stored only after redaction;
- each invocation is registered atomically as `executionId -> exact process-tree handle` before user code can run; duplicate or previously completed IDs are rejected, and terminal results tombstone the ID;
- cancellation accepts only `ExecutionId` and terminates only that invocation's process tree. On Windows, the runner must use a tested Job Object helper or validate the mapped PID before invoking `taskkill.exe /PID <pid> /T /F`;
- no non-fixture command runs when `workspace.isTrusted` is false or before an explicit per-project execution consent.

Initial fixtures use the separate `TrustedFixtureRunner` below. Corpus and participant runs require the complete sandbox boundary above.

```ts
interface TrustedFixtureRequest {
  executionId: ExecutionId;
  projectId: ProjectId;
  fixtureId: string;
  manifestHash: Sha256;
  stateId: FixtureState["id"];
  commandId: string;
  twinHandle: string;
}

interface TrustedFixtureRecord {
  manifestHash: Sha256;
  manifest: FixtureManifest;
  node: { handle: "fixture-node"; version: string; executableSha256: Sha256 };
  blobs: {
    harness: { localHandle: string; ref: FixtureBlobRef };
    oracle: { localHandle: string; ref: FixtureBlobRef };
    mutation: { localHandle: string; ref: FixtureBlobRef };
    repair: { localHandle: string; ref: FixtureBlobRef };
  };
}

interface TrustedFixtureCatalog {
  open(fixtureId: string, manifestHash: Sha256): Promise<TrustedFixtureRecord | undefined>;
}

interface TrustedFixtureRunner {
  run(request: TrustedFixtureRequest): Promise<CommandResult>;
  cancel(executionId: ExecutionId): Promise<void>;
}
```

`TrustedFixtureCatalog` is constructed by the extension from an implementation-owned allowlist of committed fixture IDs and manifest hashes; neither callers nor workspace files can register or replace a record. `open` recomputes `canonicalHash("fixture-manifest", manifest)`, verifies every catalog-owned blob and the selected runtime artifact, and fails closed on any mismatch. The returned blob refs must exactly equal the manifest's harness, oracle, mutation, and repair refs. `TrustedFixtureRunner` opens that catalog by `fixtureId + manifestHash` and never accepts a caller-provided manifest, executable, harness, oracle, patch, or local handle. Catalog records and local handles remain controller-only.

The runner is not a security sandbox and must never accept a workspace project, downloaded corpus patch, user-authored command, participant or agent-authored code, symlink/reparse point, submodule, or runtime-created executable. `twinHandle` is an opaque key resolved through the extension-owned Twin Manager, never a caller-interpreted path. Before each command the runner hashes the complete materialized candidate tree and requires an exact match with the named `FixtureState`; it also requires that command ID to appear in that state's `commandIds`. Any other tree or command pair is rejected without execution. It uses `shell: false`, the catalog-resolved Node/harness/oracle, a scrubbed environment, bounded output/time, and process-tree termination. Its existence lets R0–R4 validate contracts and the protected-judge data flow against a finite reviewed state set without pretending to evaluate arbitrary human work.

## 5. Fixture manifest

```ts
interface FixtureState {
  id: "base" | "target" | "mutated";
  treeHash: Sha256;
  files: Array<{
    path: RelPath;
    sha256: Sha256;
    mode: "100644" | "100755";
  }>;
  commandIds: string[];
}

interface FixtureManifest {
  schemaVersion: SchemaVersion;
  fixtureId: string;
  stack: "node-typescript";
  defaultBranch: "main";
  baseRevision: GitOid;
  targetRevision: GitOid;
  changedSymbols: Array<{ path: RelPath; symbol: string }>;
  commands: TrustedFixtureCommand[];
  checks: TrustedFixtureCheck[];
  baseChecks: TestId[];
  targetChecks: TestId[];
  mutation: {
    id: string;
    changeRef: FixtureBlobRef;
    expectedFailingChecks: TestId[];
    editablePaths: RelPath[];
  };
  knownRepair: {
    changeRef: FixtureBlobRef;
    candidateDiff: CandidateDiff;
    candidateDiffHash: Sha256;
    resultingState: "target";
  };
  states: FixtureState[];
  git: {
    autocrlf: false;
    eol: "lf";
    userName: "PureFlow Fixture";
    userEmail: "fixture@pureflow.invalid";
    authorDate: IsoTime;
    committerDate: IsoTime;
    objectFormat: "sha1";
  };
  toolchain: {
    nodeVersion: string;
    dependencies: "none";
    harness: FixtureBlobRef;
    oracle: FixtureBlobRef;
  };
}
```

R0 owns this schema. The manifest contains exactly one `base`, one `target`, and one `mutated` state. `baseChecks`, `targetChecks`, and `expectedFailingChecks` contain `TrustedFixtureCheck.id` values; commands remain independently addressed by `FixtureState.commandIds`. Every check references one declared command, and unknown check or command IDs fail validation.

`target` is the completed agent checkpoint, `mutated` is the exercise start, and applying the controller-owned `knownRepair.changeRef` to `mutated` must reproduce the declared `target.treeHash` byte-for-byte. `knownRepair.candidateDiff` must describe that same `mutated → target` transition and its canonical `candidate-diff` hash must equal `candidateDiffHash`. `mutation.changeRef` describes `target → mutated`; both patch refs are resolved only from the catalog record.

Fixtures use LF in source, fixed Git identity and timestamps, `main` as the initial branch, `git init --object-format=sha1 --initial-branch=main`, `core.autocrlf=false`, an empty Git template directory, the standalone Node `v22.17.0` runtime behind `fixture-node`, no package installation or network dependency, and controller-owned hash-pinned harness/oracle blobs. CI pins Node `22.17.0` on Windows and Linux. The future portable distribution must provision and verify that runtime before `TrustedFixtureRunner` can claim support. The fixture may contain TypeScript source, but the harness and its already-installed compiler belong to the reviewed controller toolchain rather than the participant repository. `.gitattributes` must pin fixture text endings before Windows CI is considered deterministic.

For manifest hashing, `commands` and `checks` are sorted by UTF-8 bytes of ID, `changedSymbols` by path then symbol, state file lists by path, check-ID lists and every set-like ID/path list by UTF-8 bytes, and `states` are ordered `base`, `target`, `mutated`. A validator rejects a semantically equivalent but differently ordered manifest instead of silently rewriting it. Every schema object rejects unknown or missing fields; adding a field requires a versioned schema change.

## 6. Change-evidence boundary

```ts
interface SemanticUnit {
  id: string;
  path: RelPath;
  symbol: string;
  kind: "function" | "method" | "class" | "module-boundary";
  changedLineSha256: Sha256[];
  attribution:
    | { status: "attributed"; intentHash: Sha256; evidence: EvidenceRef[] }
    | { status: "unattributed"; gaps: string[] };
}

interface CandidateSeam {
  schemaVersion: SchemaVersion;
  id: string;
  projectId: ProjectId;
  sourceRunId: RunId;
  baseRevision: GitOid;
  targetRevision: GitOid;
  unit: SemanticUnit;
  linkedChecks: string[];
  evidence: EvidenceRef[];
  gaps: string[];
  factors: {
    blastRadius: number | null;
    novelty: number | null;
    evidenceGap: number | null;
    capabilityAgeMs: number | null;
    estimatedAttentionMinutes: number;
  };
}

type ExtractionReason =
  | "unsupported-language"
  | "unsupported-syntax"
  | "ambiguous-symbol"
  | "no-changed-unit"
  | "missing-test-link"
  | "partial-parse";

interface ExtractionContext {
  schemaVersion: SchemaVersion;
  projectId: ProjectId;
  sourceRunId: RunId;
  baseRevision: GitOid;
  targetRevision: GitOid;
}

type ExtractionResult = ExtractionContext &
  (
    | { status: "supported"; seams: CandidateSeam[] }
    | {
        status: "partial";
        seams: CandidateSeam[];
        reasons: ExtractionReason[];
      }
    | {
        status: "unsupported";
        seams: [];
        reasons: ExtractionReason[];
      }
  );
```

R2 owns this boundary. It may mark a unit unattributed or a factor unknown; it must not use an LLM narrative as observed intent, invariant, coverage, or runtime evidence. R4 consumes candidates only from a `supported` result without reopening vendor-specific agent events. `supported` contains at least one seam and every seam has at least one linked check; `partial` is stored for diagnostics and experiment accounting but cannot automatically compile an episode; `unsupported` always has an empty seam list.

Known factor values are normalized to `[0, 1]`; `null` means unavailable, not zero. `estimatedAttentionMinutes` is an integer from 1 to 30 in R&D. Selection records the factor values and deterministic tie-breaker (`CandidateSeam.id` ascending) used for the choice.

The first R2 implementation is deliberately narrow and deterministic:

- Git changes are read by full verified base/target OID with `--name-status -z`, rename detection, and zero-context patches; paths are normalized workspace-relative values, source files are capped at 1 MiB, and a revision pair is capped at 256 changed files.
- Only `.ts` and `.tsx` implementation files are parsed with the TypeScript compiler API. Declaration files and syntactically invalid sources are unsupported; unrecognized changed code returns an explicit reason rather than an inferred symbol.
- Fixture check linkage is explicit from the committed fixture manifest. R2 never guesses a test from a filename, import, or LLM narrative.
- `changedLineSha256` is the sorted unique list of raw SHA-256 hashes of the exact UTF-8 logical line bytes, excluding the line terminator, for removed base lines and added target lines that intersect the unit. An unchanged file rename may therefore have an empty list.
- `SemanticUnit.id` is `unit_` plus `canonicalHash("semantic-unit", { schemaVersion, path, symbol, kind, changedLineSha256 })`.
- `CandidateSeam.id` is `seam_` plus `canonicalHash("candidate-seam", { schemaVersion, projectId, sourceRunId, baseRevision, targetRevision, unitId, linkedChecks })`; `linkedChecks` is sorted and unique.
- R2 verifies a matching Flight Recorder file event against the exact before/after file bytes. Attribution exists only when that event and `task.started.intentHash` exist; otherwise the unit is explicitly unattributed.
- Until R5 exists, `blastRadius`, `novelty`, and `capabilityAgeMs` are `null`. `evidenceGap` is the fraction of missing observable slots across one file-change reference plus every linked test result. The fixture slice uses a fixed five-minute attention estimate rather than pretending to have a calibrated model.

Cross-platform golden tests pin the first fixture's semantic-unit and candidate-seam IDs. Any change to these rules requires a schema-version decision rather than silently changing existing identities.

## 7. Sanitized snapshot boundary

```ts
interface SnapshotFile {
  path: RelPath;
  sha256: Sha256;
  mode: "100644" | "100755";
}

interface SanitizedSnapshot {
  schemaVersion: SchemaVersion;
  id: string;
  projectId: ProjectId;
  state: "mutated";
  treeHash: Sha256;
  participantCommit: GitOid;
  files: SnapshotFile[];
  mutationId: string;
  mutationSha256: Sha256;
  createdAt: IsoTime;
}

interface CreateSnapshotInput {
  projectId: ProjectId;
  sourceRevision: GitOid;
  mutationId: string;
  mutation: EvidenceRef;
  allowedFiles: RelPath[];
}

interface SnapshotStore {
  create(input: CreateSnapshotInput): Promise<SanitizedSnapshot>;
  get(projectId: ProjectId, snapshotId: string): Promise<SanitizedSnapshot | undefined>;
  materialize(projectId: ProjectId, snapshotId: string, destinationHandle: string): Promise<void>;
  remove(projectId: ProjectId, snapshotId: string): Promise<void>;
  removeProject(projectId: ProjectId): Promise<void>;
}
```

R3 owns `SnapshotStore`. `create` runs inside the controller boundary: it exports only regular allowed files from the verified source revision, rejects unsafe entries, applies the mutation, initializes the standalone one-commit repository, computes the sorted file manifest and tree hash, and stores it under the owning project. `materialize` verifies project ownership, every file hash, `participantCommit`, absence of remotes/reflogs/alternates, and an empty destination before returning. IDs are random opaque values; identity comes from `treeHash`, not the ID string.

R4 may reference only a successfully reopened `SanitizedSnapshot` whose `state` is `mutated`. It must not reconstruct or mutate a snapshot behind R3's boundary.

## 8. Experience manifests

The controller and participant receive different objects.

```ts
interface InternalExperience {
  schemaVersion: SchemaVersion;
  id: ExperienceId;
  sourceRunId: RunId;
  projectId: ProjectId;
  sourceBaseRevision: GitOid;
  sourceTargetRevision: GitOid;
  snapshotId: SanitizedSnapshot["id"];
  snapshotTreeHash: Sha256;
  commandRegistryHash: Sha256;
  scope: { symbols: string[]; tests: string[]; concepts: string[] };
  kind: "recover";
  task: string;
  setup: ExperienceStep[];
  judge: JudgeSpec;
  hiddenAnswer: EvidenceRef;
  budgetMinutes: number;
}

interface ParticipantExperience {
  schemaVersion: SchemaVersion;
  id: ExperienceId;
  snapshotId: string;
  snapshotTreeHash: Sha256;
  scope: { symbols: string[]; concepts: string[] };
  kind: "recover";
  task: string;
  visibleChecks: string[];
  budgetMinutes: number;
}

type ExperienceStep =
  | { kind: "materialize-snapshot"; snapshotId: string }
  | { kind: "apply-change"; changeRef: EvidenceRef }
  | { kind: "run-approved-command"; commandId: string };

interface JudgeSpec {
  timeoutMs: number;
  commandRegistryHash: Sha256;
  editablePaths: RelPath[];
  protectedFiles: Array<{ path: RelPath; sha256: Sha256 }>;
  checks: Array<
    | { id: string; kind: "approved-command"; commandId: string; expectedExitCode: number }
    | { id: string; kind: "file-hash"; path: RelPath; expectedHash: Sha256 }
    | { id: string; kind: "trace"; traceId: string; expectedRef: EvidenceRef }
  >;
}
```

Only `ParticipantExperience` crosses into the cockpit or participant agent context. `sourceRunId`, source revisions, judge internals, setup changes, oracle references, and hidden answers remain in the controller process.

At compile time R4 freezes every referenced command into one `CommandRegistrySnapshot`. `InternalExperience.commandRegistryHash` and `JudgeSpec.commandRegistryHash` must match that snapshot. The judge reopens the snapshot by project ID and hash immediately before execution; a missing, changed, or differently ordered registry is `failed-integrity`.

## 8.5. Post-R4 Control Pulse contract

R4.5 is a separate fixture-only mechanism gate. It does not add another `InternalExperience.kind`, accept arbitrary code, or weaken the Phase A runner. These exact schemas must exist before any Control Pulse or Side Coach prototype is called implemented.

```ts
interface ChangeClaim {
  schemaVersion: SchemaVersion;
  checkpointId: string;
  intent: string;
  changedBehavior: string;
  boundary: { path: RelPath; symbol: string };
  invariant: string;
  evidenceRefs: Array<{ id: EvidenceId; sha256: Sha256; visibility: "participant" }>;
  unresolvedAssumption?: string;
}

interface SideCoachCapsule {
  schemaVersion: SchemaVersion;
  claimHash: Sha256;
  claim: {
    intent: string;
    changedBehavior: string;
    boundary: { path: RelPath; symbol: string };
    invariant: string;
    unresolvedAssumption?: string;
  };
  evidence: Array<{
    kind: EvidenceRef["kind"];
    sha256: Sha256;
    mediaType: string;
    excerpt: string;
  }>;
  probe: ParticipantProbeSurface;
  developerAnswer: string;
}

interface SideCoachProposal {
  schemaVersion: SchemaVersion;
  hypothesis: string;
  probeInputId?: string;
  clarification?: string;
}

interface CatalogControlProbe {
  schemaVersion: SchemaVersion;
  id: string;
  fixtureId: string;
  fixtureManifestHash: Sha256;
  state: "target" | "mutated";
  checkId: TestId;
  prompt: string;
  expectedObservation: "passes" | "fails";
}

interface ParticipantProbeSurface {
  prompt: string;
  inputs: Array<{ id: string; label: string }>;
}

interface FixtureControlProbe {
  schemaVersion: SchemaVersion;
  mode: "fixture";
  id: string;
  projectId: ProjectId;
  claimHash: Sha256;
  sourceTreeHash: Sha256;
  fixtureId: string;
  fixtureManifestHash: Sha256;
  participant: ParticipantProbeSurface;
}

type SandboxProbeInput =
  | {
      schemaVersion: SchemaVersion;
      id: string;
      kind: "approved-command";
      commandId: string;
      expectedObservation: "passes" | "fails";
    }
  | {
      schemaVersion: SchemaVersion;
      id: string;
      kind: "deterministic-oracle";
      commandId: string;
      expectedObservation: "passes" | "fails";
      generator: { id: string; version: string; inputHash: Sha256 };
      oracle: EvidenceRef & { visibility: "oracle" };
      mountAt: RelPath;
    };

interface SandboxControlProbe {
  schemaVersion: SchemaVersion;
  mode: "sandbox";
  id: string;
  projectId: ProjectId;
  claimHash: Sha256;
  sourceTreeHash: Sha256;
  snapshotId: SanitizedSnapshot["id"];
  snapshotTreeHash: Sha256;
  commandRegistryHash: Sha256;
  inputs: SandboxProbeInput[];
  writablePaths: RelPath[];
  participant: ParticipantProbeSurface;
}

type InternalControlProbe = FixtureControlProbe | SandboxControlProbe;

interface ParticipantControlProbe {
  schemaVersion: SchemaVersion;
  id: string;
  internalProbeHash: Sha256;
  claim: ChangeClaim;
  participant: ParticipantProbeSurface;
}

interface ControlProbeAttempt {
  schemaVersion: SchemaVersion;
  id: string;
  projectId: ProjectId;
  probeId: string;
  internalProbeHash: Sha256;
  claimHash: Sha256;
  sourceTreeHash: Sha256;
  selectedProbeInputId: string;
  prediction: "passes" | "fails";
  selectedEvidenceIds: EvidenceId[];
  explanation: string;
  committedAt: IsoTime;
}

interface ControlProbeResult {
  schemaVersion: SchemaVersion;
  projectId: ProjectId;
  probeId: string;
  internalProbeHash: Sha256;
  claimHash: Sha256;
  sourceTreeHash: Sha256;
  attemptHash: Sha256;
  probeInputId: string;
  checkId: TestId | null;
  commandId: string;
  observation: "passes" | "fails" | "execution-error" | "failed-integrity";
  commandStatus: { exitCode: number | null; timedOut: boolean; cancelled: boolean };
  predictionResult: "confirmed" | "falsified" | "invalid";
  commandResultHash: Sha256 | null;
  resultHash: Sha256;
}
```

Validation and privacy rules:

- `ChangeClaim` has exact keys. `checkpointId` is at most 128 UTF-8 bytes; `boundary.path` is a normalized workspace-relative `RelPath` of at most 1 KiB; `boundary.symbol` is at most 256 bytes; each prose field is at most 1 KiB; `evidenceRefs` contains at most eight unique refs sorted by UTF-8 ID; and the complete canonical claim is at most 8 KiB.
- The controller reopens every claim ref by project and ID, requires exact hash equality and `visibility: "participant"`, and rejects controller/oracle refs, unknown IDs, cross-project refs, or a claim emitted before its checkpoint has a stable passing revision. `claimHash` is `canonicalHash("control-claim", claim)`.
- `ParticipantControlProbe` contains no fixture path, command ID, source revision, oracle ref, hidden answer, controller handle, or local absolute path. A participant-visible evidence ID cannot be resolved through a controller API exposed to the webview or model.
- `ParticipantProbeSurface.prompt` is at most 2 KiB; it contains at most eight inputs sorted by UTF-8 ID, with unique IDs of at most 128 bytes and labels of at most 512 bytes. Both internal probe variants include this exact surface before hashing. `ParticipantControlProbe` is an exact deterministic projection of the reopened claim and internal probe; changing its prompt, labels, IDs, order, or claim is an integrity failure.
- The capsule builder accepts only a validated `ParticipantControlProbe` plus a developer answer of at most 4 KiB. It resolves at most four participant-visible refs, emits at most 2 KiB of allowlisted/redacted text per ref, strips local evidence IDs, copies the exact committed probe surface, rejects unresolved absolute paths or known secret fixtures, and caps canonical `SideCoachCapsule` bytes at 16 KiB. Only this capsule may cross the configured model boundary.
- `SideCoachProposal` is exact, at most 4 KiB canonical, and untrusted. Its text never becomes code, a path, patch, command, argument, environment value, or test. `probeInputId`, when present, must exactly match an ID in the committed capsule surface; otherwise the proposal is discarded.
- Every `InternalControlProbe` is immutable after publication. `internalProbeHash` is `canonicalHash("control-probe", internalProbe)`. The participant object exposes that hash and only the committed claim/surface, never the fixture binding, snapshot, registry, commands, oracle, generator, or writable paths.
- For `mode: "fixture"`, every participant-surface input ID resolves to an extension-owned immutable `CatalogControlProbe` allowlisted by `fixtureId + fixtureManifestHash`. Its state and `checkId` must exist in that manifest, and the check's command must appear in the selected state's `commandIds`. Phase A executes only that declared state/check pair through `TrustedFixtureRunner`; it accepts no new arguments, source, candidate diff, or model-generated test.
- For `mode: "sandbox"`, the controller reopens the exact sanitized snapshot/tree and immutable command registry named by the probe. `inputs` and `writablePaths` are sorted and duplicate-free, and the participant-surface ID set must exactly equal the internal input ID set. Every input command must resolve to an `IsolatedCommand` in that registry. An `approved-command` adds no executable material. A `deterministic-oracle` is produced only by a versioned controller-owned generator allowlist, is regenerated to the exact oracle hash before use, and is mounted read-only at its fixed `mountAt`; its generator, mount, command, and expected observation are frozen before the participant attempt. Neither input kind may originate from model text.
- Phase B builds `SandboxRequest` only from the reopened snapshot, registry command, frozen writable paths, and controller-resolved oracle handle. `hostMountAllowlist` contains only those exact oracle handles, all five sandbox capabilities and per-project execution consent must be current, and the production checkout remains absent. Any input, hash, registry, generator, mount, capability, or consent mismatch fails before execution.
- Before accepting an attempt, the controller reopens `InternalControlProbe` by `projectId + probeId + internalProbeHash`, recreates the exact participant projection, and requires exact project, claim, source-tree, prompt, labels, and input IDs. `selectedProbeInputId` must be in the committed participant surface and resolve to the reopened fixture catalog or sandbox input set. `selectedEvidenceIds` must be a sorted unique subset of the validated claim refs. Attempt IDs are controller-issued, single-use, and tombstoned after any terminal result; a replay or cross-project/hash mismatch is rejected before execution.
- The controller stores `canonicalHash("control-probe-attempt", attempt)` before revealing or running the selected input. `ControlProbeResult` repeats the bound project/probe/claim/source-tree/internal-probe identity and must match the reopened attempt and resolved input. `commandId` must be the command reached through that input; `checkId` is the fixture check for Phase A and null for a Phase-B command. `passes` means a clean exit code of zero and `fails` means a clean nonzero exit. Either is assigned only when the command started, `timedOut === false`, `cancelled === false`, `exitCode !== null`, and no setup, runner, catalog, registry, sandbox, or integrity error occurred. Timeout, cancellation, launch/setup failure, missing output, or runner error is `execution-error`; it can never confirm a `fails` prediction. `commandResultHash` equals the normative `command-result` hash when a result exists and is null only when no `CommandResult` was produced. `ControlProbeResult.resultHash` is `canonicalHash("control-probe-result", result without resultHash)`.
- A skipped, late, replayed, execution-error, invalid, integrity-failed, or revealed attempt produces no passed prediction evidence.
- A confirmed, precommitted prediction may later map to raw `CapabilityEvidence` with `capability: "predicted"` and `judgeResultHash = ControlProbeResult.resultHash`; assistance records whether the Side Coach clarified the answer. It can never create `intervened`, `recovered`, or `VerifiedReadiness` evidence by itself.

R4.5 is not implemented by these declarations. It becomes executable only after its validator, capsule builder, immutable catalog, serialization isolation, and Windows/Linux golden-vector tests pass.

## 9. Hidden-answer isolation

Omitting a Git ref from JSON is not isolation. The first recovery episode uses this protocol:

1. The controller resolves the source target revision in the production repository.
2. It exports the target tree to a staging directory without `.git`, remotes, reflogs, alternates, or links to the production object database.
3. It applies the selected mutation before initializing participant history.
4. It initializes a new standalone Git repository containing a single mutated snapshot commit with fixed fixture identity and date.
5. It creates the participant twin from that sanitized repository. The production path and source Git OIDs are absent from the participant manifest and process environment.
6. The hidden repair, source diff, and oracle remain in controller-owned storage outside the twin.

Product mode is voluntary, not anti-cheat. The user can skip or explicitly reveal the answer; either action records `abandoned` or `revealed` and cannot produce unassisted readiness evidence. PureFlow does not surveil other applications or pretend it can detect a user manually opening the production checkout.

Controlled research mode must make the production checkout and answer-generating agents unavailable during the measured episode. If isolation is broken, the trial is excluded under a preregistered rule and still reported in the flow diagram.

## 10. Judge integrity

The participant twin is untrusted input to the judge. A green command inside that tree is not sufficient evidence.

The judge must:

1. reopen and verify the sanitized snapshot and immutable command-registry hashes;
2. compute the participant diff against the sanitized snapshot;
3. reject unsafe file types and changes outside `editablePaths`;
4. verify all `protectedFiles`, including manifests, test configuration, command wrappers, and visible tests;
5. create a clean evaluation directory from the immutable sanitized snapshot;
6. apply only the allowed participant diff;
7. resolve and verify controller-owned hidden oracle tests without changing the candidate tree hash: Phase A keeps the catalog-owned harness and oracle outside the twin and passes only trusted opaque handles to the runner; Phase B exposes the oracle only as a separate read-only sandbox mount. Copying oracle files into the candidate tree is forbidden;
8. execute approved commands through the runner allowed for the current phase; Phase A accepts only a controller-applied `knownRepair` whose result matches the declared `target` state, while arbitrary candidate diffs require Phase B;
9. persist each check, bounded output, timeout, and integrity failure separately;
10. remove the evaluation directory after storing evidence.

Protected or hidden oracle files are never writable from the participant process. A result is `failed-integrity` if protected inputs changed, even when a command exits zero.

```ts
interface JudgeResult {
  schemaVersion: SchemaVersion;
  experienceId: ExperienceId;
  outcome: "passed" | "partial" | "failed" | "failed-integrity" | "abandoned" | "revealed";
  checks: Array<{
    id: string;
    status: "passed" | "failed";
    evidence: EvidenceRef;
  }>;
  hintsUsed: number;
  elapsedMs: number;
  candidateDiffHash?: Sha256;
  resultHash: Sha256;
}
```

The judge establishes only the declared behavior under the declared oracle. It is not proof of total correctness or human mastery.

## 11. Readiness evidence versus verified readiness

Immediate episodes produce **capability evidence**, not verified readiness.

```ts
interface CapabilityEvidence {
  schemaVersion: SchemaVersion;
  projectId: ProjectId;
  scope: { symbols: string[]; concepts: string[] };
  capability: "oriented" | "predicted" | "intervened" | "recovered";
  result: "passed" | "partial" | "failed";
  assistance: { hints: number; codegen: boolean; revealed: boolean };
  observedAt: IsoTime;
  sourceTreeHash: Sha256;
  judgeResultHash: Sha256;
}

interface VerifiedReadiness {
  schemaVersion: SchemaVersion;
  projectId: ProjectId;
  scope: { symbols: string[]; concepts: string[] };
  level: "transferred";
  priorCapabilityEvidenceHashes: Sha256[];
  delayedJudgeResultHash: Sha256;
  delayMs: number;
  verifiedAt: IsoTime;
  staleAfterRevision?: GitOid;
}
```

Only a delayed adjacent task can create `VerifiedReadiness`. Immediate `predicted`, `intervened`, or `recovered` records remain visible as raw evidence and may schedule future episodes, but the UI must not label them “ready.”

## 12. Component ownership

| Component | May read | May emit | Must not access |
| --- | --- | --- | --- |
| Agent adapter | vendor events, local workspace handle | normalized Flight Recorder stream | readiness state, hidden oracle |
| Flight Recorder | envelopes, evidence refs | append-only run history | hidden answer, participant UI |
| Change extractor | controller Git revisions, Flight Recorder refs | candidate seams | readiness mutation |
| Experience Compiler | candidate seams, capability evidence | `InternalExperience` | participant process |
| Snapshot Store / Twin Manager | controller source revision during create; sanitized snapshot afterward | verified snapshot and isolated twin handle | hidden answer, oracle, unrelated host files |
| Cockpit | `ParticipantExperience`, visible evidence | participant actions | internal revisions, judge spec, hidden answer |
| Judge | immutable snapshot, allowed diff, hidden oracle | `JudgeResult` | agent vendor context, readiness mutation |
| Readiness ledger | verified judge results | capability/readiness evidence | raw terminal or source content |
| TrustedFixtureRunner | reviewed R0 fixture and controller harness only | bounded command result | workspace/corpus/participant code, user commands |
| SandboxRunner | explicit allowlisted mounts and frozen commands | bounded isolated command result | all other host paths, parent environment, network |

The extension host controller enforces the boundary. A webview message is always treated as untrusted input.

## 13. Production-worktree invariants

Twin tests must capture before and after values for:

- production working-tree file hashes;
- production index hash;
- symbolic `HEAD` target;
- `HEAD` commit;
- every pre-existing local ref;
- configured remotes;
- existing worktree list.

The participant twin is a standalone sanitized repository, not a linked worktree, so twin creation must not change the production repository's `.git/worktrees` metadata. Build-plane agent worktrees may already exist; the captured pre-existing worktree list must be identical after the twin test. Claims of an unchanged production repository refer to the explicit invariants above rather than raw filesystem timestamps inside `.git`.

## 14. Concurrency semantics

A recovery experience requires a completed, passing checkpoint. It cannot run concurrently with the unfinished change from which it is derived.

The valid schedule is:

```text
agent completes checkpoint N
→ compiler creates experience N
→ agent starts checkpoint N+1 or unrelated task
→ human completes experience N in parallel
```

Live steering has a different schedule: agents explore alternatives for the same unresolved design fork while the human evaluates evidence; only bounded final integration may await the choice.

H2 therefore measures pipeline throughput across at least two queued agent tasks, not a misleading single-task timer. The integration test must show an agent event for checkpoint N+1 occurring between `experience.started(N)` and `judge.completed(N)`.
