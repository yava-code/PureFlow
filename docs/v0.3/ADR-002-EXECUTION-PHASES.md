# ADR-002: Separate Fixture Validation from Untrusted Execution

- **Status:** Accepted for the R0–R4 research slice
- **Date:** 2026-07-26
- **Decision owners:** PureFlow project

## Context

The Experience Compiler needs to execute changed code and hidden oracle tests. On Windows, process-tree termination, network isolation, host-filesystem isolation, read-only mounts, and resource limits are separate capabilities. A Node child process plus `taskkill` can manage process lifetime but cannot enforce the other boundaries. Docker Desktop, WSL2 containers, Windows Sandbox, and remote VMs each introduce different prerequisites and operational trade-offs that are not currently verified in this workspace.

Selecting one on paper would make R0–R4 depend on an unproven external installation. Letting fixtures run through a generic “sandbox” interface would be worse: agents could mistake a scrubbed process for isolation and later reuse it on real repositories.

The early mechanism still needs deterministic execution to validate schemas, snapshot isolation, protected-oracle evaluation, and result flow.

## Decision

Use two explicitly non-interchangeable execution phases.

### Phase A — TrustedFixtureRunner for R0–R4

`TrustedFixtureRunner` opens an extension-owned catalog by committed `fixtureId + manifestHash`; callers cannot supply a manifest, executable, harness, or oracle. The catalog contains only repository-owned R0 fixtures whose finite `base`, `target`, and `mutated` tree manifests, known repair, controller harness/oracle, Node version, toolchain handle, arguments, and hashes are committed and reviewed. The runner hashes the complete materialized candidate tree before every command and rejects any state/command pair absent from the manifest.

The fixture:

- has no downloaded dependencies or package-install step;
- contains no symlink, reparse point, submodule, device entry, or runtime-created executable;
- runs through an argument array with `shell: false`;
- receives a scrubbed minimal environment;
- has bounded output and time;
- keeps the controller harness and oracle outside the candidate tree;
- gives every invocation a unique execution ID and supports tested, invocation-specific cancellation plus full Windows process-tree cleanup.

This runner is a deterministic test harness, not a security boundary. Its type rejects workspace projects, corpus patches, participant or agent-authored code, user commands, and any manifest not owned by the committed R0 fixture set. R4 may apply only the controller-owned known repair and must prove that the result exactly equals the declared target tree before execution; it cannot run an arbitrary candidate diff.

### Phase B — Isolated SandboxRunner before R7

No third-party corpus or participant code executes until a follow-up ADR selects a concrete Windows-capable backend and runtime evidence proves all required capabilities:

- network disabled;
- host filesystem absent except an explicit mount allowlist;
- hidden oracle mounted read-only;
- writable paths restricted to the candidate workspace;
- CPU, memory, disk, output, and time bounded;
- entire process tree terminable;
- symlink, junction/reparse point, hard-link escape, submodule, device path, alternate data stream, and non-regular entry rejected;
- dependency source available from a hash-pinned image or offline cache without opening network access;
- availability and version checked before a run;
- cleanup proven on Windows, including locked files and cancellation.

If no backend passes, R7 is blocked. PureFlow must not fall back to `TrustedFixtureRunner`, the host shell, or a merely scrubbed process.

## Options considered

### Choose Docker Desktop now

**Rejected for this phase.** It could satisfy most boundaries with a pinned image and `--network none`, but current availability, licensing/installation state, Windows file-mount behavior, and CI parity have not been verified.

### Choose WSL2 directly

**Rejected for this phase.** It still needs a container or stronger mount policy to hide Windows host paths and has an external provisioning requirement.

### Use Windows Sandbox

**Rejected for this phase.** Availability varies by Windows edition; orchestration, snapshot transfer, and headless CI support require a dedicated spike.

### Run everything as a local child process

**Rejected for untrusted code.** Environment scrubbing and process cleanup do not prevent filesystem reads, network access, or oracle tampering.

### Split trusted-fixture and untrusted phases

**Selected.** It lets agents validate R0–R4 contracts now while making the missing security boundary explicit and impossible to bypass through polymorphic fallback.

## Trade-offs

### Benefits

- no fabricated sandbox claim;
- no external prerequisite blocks contract and mechanism work;
- R0–R4 can be deterministic and cross-platform;
- untrusted-code execution has a hard, reviewable gate;
- runner types make accidental fallback testable.

### Costs

- fixture evidence does not establish real-repository feasibility or an interactive human-judging path;
- R7 cannot start until the backend spike succeeds;
- some runner and judge integration work will be repeated against the real sandbox;
- product timelines must include dependency/image provisioning.

## Consequences

- `PROJECT_STATE.md` lists sandbox selection as an R7 blocker, not an R0–R4 blocker.
- R0 fixtures use the controller-owned, already-installed test toolchain and never run `npm install` or `npm ci` inside the twin.
- `SandboxRunner` remains a normative interface, but no implementation may claim support before the follow-up ADR and runtime checks.
- technical results from Phase A are labeled `trusted fixture only`.
- corpus and human-study metrics cannot be collected in Phase A.

## Action items

1. Implement `TrustedFixtureRunner` and negative tests that reject every non-fixture request.
2. Finish the R0–R4 mechanism against the pinned fixture.
3. Before R7, probe Docker Desktop, a WSL2 container backend, Windows Sandbox, and a disposable remote runner against the same capability suite.
4. Select one backend in ADR-003 with exact versions, images, availability checks, provisioning, and cleanup evidence.
5. Keep R7 blocked until that ADR is accepted and Windows runtime tests pass.
