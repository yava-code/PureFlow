# Spec: Digest-pinned Phase-B SandboxRunner

**Author:** PureFlow R&D  
**Date:** 2026-08-01  
**Status:** Approved  
**Reviewers:** repository owner through the approved v0.3 ADR/contract plan  
**Related:** `CONTRACTS.md` §4 and §8.5, `ADR-002-EXECUTION-PHASES.md`, `ADR-003-DOCKER-DESKTOP-SANDBOX.md`, `AGENT_EXECUTION.md` R7

## Context

R0–R4.5 prove recovery and precommitted prediction only against a finite repository-owned fixture. R7 must evaluate ordinary open-source TypeScript patches, but executing repository or participant code on the host would invalidate the safety boundary and the experiment. ADR-003 selected digest-pinned Linux containers through Docker Desktop/WSL2 after a local Windows primitive audit; the actual `SandboxRunner` is still absent.

This feature supplies the exact Phase-B execution boundary required before corpus collection can run. It is infrastructure for behavioral evidence, not a user-facing training feature. Production agents remain off the control-episode critical path, and an unavailable sandbox produces explicit abstention rather than host fallback.

## Functional requirements

- FR-1: The runner MUST validate the exact `IsolatedCommand`, `SandboxRequest`, `SandboxCapabilities`, and `CommandResult` contracts before use.
- FR-2: The runner MUST accept only a command that exactly reopens through an immutable project-scoped command authority.
- FR-3: The runner MUST resolve `twinHandle`, toolchain handle, and oracle handles only through controller-owned authorities; it MUST NOT interpret any of them as caller paths.
- FR-4: The runner MUST require a trusted workspace and current explicit per-project execution consent before starting Docker.
- FR-5: The runner MUST verify all five sandbox capabilities and the digest-pinned image before every execution or through a fresh capability receipt bound to the same backend/image identity.
- FR-6: Docker execution MUST use `network=none`, a read-only root, an unprivileged user, all capabilities dropped, `no-new-privileges`, fixed memory/CPU/PID limits, and no published ports or Docker socket.
- FR-7: The sanitized twin MUST be the only workspace mount and MUST be read-only; declared writable paths MUST be separate bounded tmpfs mounts.
- FR-8: Read-only mounts MUST equal the sorted opaque `hostMountAllowlist`, reopen by project, match the declared hash before execution, mount only below `/workspace`, and remain unchanged afterward.
- FR-9: The runner MUST invoke the catalog entrypoint and frozen argument array without a shell and MUST NOT inherit the host environment or credentials.
- FR-10: The runner MUST bound and redact stdout and stderr separately before storing project-scoped evidence with the original byte counts.
- FR-11: The runner MUST atomically reserve each execution ID before Docker starts, reject active or tombstoned IDs, and tombstone every terminal attempt.
- FR-12: Cancellation MUST target only the container recorded for that execution ID, terminate its descendant tree, wait for terminal state, and verify exact removal.
- FR-13: Normal exit, nonzero exit, timeout, cancellation, setup error, and output overflow MUST clean the exact container and MUST NOT delete or modify the production checkout.
- FR-14: If Docker, the exact image, consent, workspace trust, a capability, authority, mount, hash, or cleanup proof is unavailable, the runner MUST fail closed and MUST NOT run the command on the host.
- FR-15: Capability probing MUST actively test outbound network denial and read-only writes, not trust Docker metadata alone.

## Non-functional requirements

- NFR-1: Security — No request-controlled value may become an executable, image, shell string, host path, Docker option, environment name/value, mount target outside `/workspace`, or container name.
- NFR-2: Isolation — A successful capability receipt MUST show all five normative capabilities as `true`; partial capability sets never authorize execution.
- NFR-3: Determinism — Equivalent validated requests and fixed command output MUST produce identical command-result hashes apart from controller-issued execution/evidence identities covered by golden vectors.
- NFR-4: Reliability — Cleanup MUST be attempted exactly once in `finally` and cleanup failure MUST surface as an error rather than a successful `CommandResult`.
- NFR-5: Bounds — Command timeout MUST be 1–600 seconds; each output limit MUST be 1–1,048,576 bytes; args MUST contain at most 128 entries of at most 4 KiB each; mounts and writable paths MUST contain at most 32 entries.
- NFR-6: Portability — Request/authority/unit tests MUST pass on protected Windows and Linux. A real Docker integration suite MUST pass locally on the selected Windows backend and on Linux before corpus execution.
- NFR-7: Performance — With the image present, median capability-free command setup SHOULD remain below 10 seconds over ten local runs; R7 reports rather than hides a miss.
- NFR-8: Privacy — Evidence and errors MUST NOT contain host absolute paths, credential values, Docker socket paths, home-directory contents, or environment dumps.

## Acceptance criteria

### AC-1: Exact request acceptance (FR-1, FR-2, NFR-5)
Given a canonical project command reopened from immutable authority and a valid bounded request
When the runner validates it
Then the request is accepted without changing any field
And an unknown field, duplicate path, unsorted array, oversized value, or command drift is rejected before Docker is called.

### AC-2: Consent and trust (FR-4, FR-14)
Given missing consent or an untrusted workspace
When `run` is called
Then Docker receives zero calls
And no execution evidence is created.

### AC-3: Pinned execution profile (FR-3, FR-5, FR-6, FR-7, FR-9, NFR-1)
Given a valid request and fresh all-true capability receipt
When Docker starts the command
Then the emitted argument vector contains only the catalog image/entrypoint, fixed isolation options, controller-resolved mounts, and frozen args
And contains no shell, host environment, production path, socket, port, or caller executable.

### AC-4: Oracle integrity (FR-8, FR-14)
Given a declared oracle handle and hash
When the oracle is missing, cross-project, writable, hash-mismatched, or changed after execution
Then execution fails integrity and cannot return a successful `CommandResult`.

### AC-5: Evidence bounds (FR-10, NFR-5, NFR-8)
Given stdout/stderr containing credential fixtures and more bytes than allowed
When execution finishes
Then each stored stream is independently redacted and truncated to its bound
And its evidence ref records the raw original byte count without storing the removed value.

### AC-6: Single-use lifecycle (FR-11, FR-13, NFR-4)
Given an active or completed execution ID
When the same ID is submitted again
Then it is rejected before Docker starts
And every first terminal path verifies exact cleanup and tombstones the ID.

### AC-7: Cancellation and timeout (FR-12, FR-13)
Given a container with a descendant process
When cancellation or timeout occurs
Then only its recorded container is killed and removed
And the result has `exitCode: null` with exactly one of `cancelled` or `timedOut` true.

### AC-8: Capability failure (FR-5, FR-14, FR-15, NFR-2)
Given any false capability, unreachable daemon, wrong image, successful outbound request, or writable read-only probe
When capability or execution authorization is evaluated
Then arbitrary execution is disabled and no host fallback occurs.

### AC-9: Concurrent isolation (FR-11, FR-12)
Given two different execution IDs in the same project
When they run and one is cancelled
Then the other remains active and can complete normally
And their container names, evidence, and cleanup are independent.

### AC-10: Real backend parity (FR-6, FR-12, FR-15, NFR-6)
Given the pinned image on Windows Docker Desktop/WSL2 and Linux Docker Engine
When the integration suite runs
Then network denial, read-only root/oracle, zero undeclared mounts, limits, descendant kill, paths with spaces, locked files, and removal pass with the same contract vectors.

## Edge cases and error scenarios

- EC-1: Docker CLI absent, daemon stopped, or server OS not Linux → all capabilities false; no provisioning or host fallback.
- EC-2: Pinned image absent or tag resolves to another digest → capability failure; never pull during `run`.
- EC-3: Workspace/oracle resolver returns a missing path, non-regular file, symlink, junction, device, alternate stream, or path outside its controller root → reject before Docker.
- EC-4: Duplicate/unsorted writable path, mount target, allowlist handle, or environment name → exact validation failure.
- EC-5: Oracle changes between preflight and container start or between exit and cleanup → integrity failure; no positive evidence.
- EC-6: Docker process fails before container creation → tombstone ID, attempt exact-name cleanup, return error.
- EC-7: Docker exits 125/126/127 from engine/setup failure → return error, not a participant test failure.
- EC-8: Command exits nonzero → valid `CommandResult` with that exit code if integrity and cleanup pass.
- EC-9: Output exceeds bound → terminate the exact container, store bounded redacted evidence only if terminal integrity is known, and never report a normal exit.
- EC-10: `cancel` races with natural exit → one terminal result, one cleanup, one tombstone; second cancellation is rejected.
- EC-11: Cleanup reports container still present → surface cleanup failure and retain no successful result.
- EC-12: Path contains spaces or Unicode → pass as one Docker argument; no shell quoting layer.
- EC-13: `writablePaths` overlaps an oracle mount or contains a parent/child collision → reject before Docker.
- EC-14: Caller supplies credential environment names or any non-catalog allowlist entry → reject before Docker.

## API contracts

HTTP endpoint: none. `GET /__not-an-endpoint__` is a validator marker only; this is a local TypeScript interface and no network listener or route exists.

```ts
interface SandboxCapabilities {
  networkNone: boolean;
  hostFilesystemIsolated: boolean;
  readOnlyOracleMount: boolean;
  processTreeKill: boolean;
  resourceLimits: boolean;
}

interface IsolatedCommand {
  schemaVersion: 1;
  id: string;
  label: string;
  toolchainHandle: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  envAllowlist: string[];
  maxOutputBytes: number;
  runner: "sandbox";
  network: "none";
}

interface SandboxRequest {
  executionId: string;
  projectId: string;
  twinHandle: string;
  command: IsolatedCommand;
  writablePaths: string[];
  readOnlyMounts: Array<{ localHandle: string; mountAt: string; sha256: string }>;
  hostMountAllowlist: string[];
}

interface CommandResult {
  executionId: string;
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
  cancel(executionId: string): Promise<void>;
}
```

Errors are thrown with bounded controller-owned codes/messages. The API never returns Docker stdout as an error message, never embeds absolute paths, and never converts infrastructure failure into `exitCode !== 0`.

## Data models

### Execution reservation

| Field | Type | Constraints |
| --- | --- | --- |
| executionId | opaque token | Project-independent single-use identity |
| projectId | opaque token | Must match every authority resolution |
| containerName | derived string | Controller-derived from execution ID; not caller supplied |
| phase | enum | `reserved`, `starting`, `running`, `terminating`, `terminal` |
| cancelled | boolean | Initially false; terminal after accepted cancellation |
| started | boolean | True only after Docker reports container start |

### Capability receipt

| Field | Type | Constraints |
| --- | --- | --- |
| backendId | string | Exact Docker server/platform identity |
| imageDigest | SHA-256 digest | Must equal catalog digest |
| measuredAt | UTC timestamp | Controller clock; bounded freshness |
| capabilities | SandboxCapabilities | All true to authorize execution |
| receiptHash | SHA-256 | Domain-separated canonical hash excluding itself |

### Resolved mount

| Field | Type | Constraints |
| --- | --- | --- |
| localHandle | opaque token | Must reopen in the same project |
| sourcePath | controller path | Never serialized outside Docker backend call |
| mountAt | normalized relative path | Mounted read-only below `/workspace` |
| sha256 | SHA-256 | Verified before and after execution |

No database is introduced. Reservations and tombstones are process-local for R7; persistent consent remains behind an injected authority. Capability evidence is project-independent and deletable with extension storage.

## Out of scope

- OS-1: Installing, starting, upgrading, licensing, or reconfiguring Docker/WSL/Hyper-V — explicit owner provisioning only.
- OS-2: Kubernetes, remote Docker daemons, cloud sandboxes, Windows containers, privileged containers, devices, GPUs, or Docker socket mounts — unnecessary for the R7 Node corpus and broader authority.
- OS-3: Arbitrary package installation during execution — dependencies are provisioned separately and execution remains network-none.
- OS-4: Participant-controlled images, entrypoints, commands, environment, mounts, or resource limits — contradicts evidence integrity.
- OS-5: Readiness scoring, cockpit UI, streaks, achievements, and human learning claims — remain behind R7/R8.
- OS-6: Treating container success as total correctness or strong security proof — judge scope and ADR limitations remain explicit.
