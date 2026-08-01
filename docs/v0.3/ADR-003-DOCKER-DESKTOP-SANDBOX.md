# ADR-003 — Phase-B sandbox backend

**Status:** selected for R7 implementation; local Windows capability probe passed, corpus execution not started  
**Date:** 2026-07-31

## Decision

Use Linux containers in Docker Desktop on Windows through its WSL2 backend as the first `SandboxRunner`. Linux CI uses the same Docker Engine contract. PureFlow addresses the image by digest and invokes the Docker CLI as an argument array; it does not build a container runtime, accept a socket from participant code, or fall back to host execution.

The first toolchain is:

```text
node@sha256:b04ce4ae4e95b522112c2e5c52f781471a5cbc3b594527bcddedee9bc48c03a0
Node 22.17.0 / Debian bookworm-slim
```

The digest is an implementation-owned catalog value. A tag is allowed only during explicit provisioning; every execution reopens the local image by digest and verifies its image identity. An offline R&D machine may import a controller-provided `docker save` archive only after its resulting digest matches the catalog.

Docker Desktop is an R&D prerequisite, not a bundled PureFlow dependency. If the daemon, Linux engine, exact image, or any capability probe is unavailable, `SandboxRunner.capabilities()` returns a false capability and arbitrary code remains disabled.

## Why this backend

- It supplies the same Linux process and filesystem model on the current Windows workstation and Linux CI.
- `--network none`, a read-only root filesystem, read-only bind mounts, tmpfs, dropped capabilities, `no-new-privileges`, memory/CPU/PID limits, and container-scoped kill/remove map directly to the five normative capabilities.
- The current machine already has Docker Desktop and WSL2. No hidden VM installer or privileged helper must be added by PureFlow.
- It is replaceable behind `SandboxRunner`; the Experience Compiler, judge, and evidence contracts do not gain Docker-specific fields.

Docker containers are not treated as a proof against a compromised Docker daemon, host administrator, kernel exploit, or a participant with Docker API access. PureFlow never mounts the Docker socket, home directory, production checkout, extension storage, credential stores, device paths, or parent directories.

## Prerequisite detection

The runner must fail closed unless all checks pass:

1. `docker desktop status` reports running on Windows; Linux requires a reachable Docker Engine.
2. `docker version` reports a Linux server and a supported API version.
3. `docker image inspect <digest>` resolves exactly the catalog digest.
4. A disposable capability probe verifies network-none, root read-only, zero undeclared mounts, read-only oracle behavior, resource limits, kill, and removal.
5. Per-project execution consent is current and the VS Code workspace is trusted.

Provisioning is an explicit owner action: start Docker Desktop and pull or import the pinned image. PureFlow must never silently install Docker, enable WSL/Hyper-V, switch container engines, accept a license, or pull a different tag during an episode.

## Execution profile

Every run starts a uniquely named container with:

- `--network none` and no published ports;
- `--read-only`, `--tmpfs /tmp:rw,noexec,nosuid`, and no Docker socket;
- a sanitized snapshot mounted read-only at `/workspace`;
- only declared writable paths backed by bounded tmpfs mounts;
- only allowlisted oracle handles mounted read-only at canonical paths;
- `--cap-drop ALL`, `--security-opt no-new-privileges`, and an unprivileged numeric user;
- fixed memory, memory-swap, CPU, PID, and output/time limits;
- an empty environment plus controller-owned non-secret constants;
- the catalog toolchain entrypoint and registry-frozen argument array, never a shell string.

The production checkout is never mounted. Input trees reject symlinks, junctions/reparse points, gitlinks, devices, alternate data streams, and unsupported file types before Docker sees them.

## Cancellation and cleanup

The controller records `executionId → exact container name/id` before user code starts. IDs are single-use. Cancellation calls `docker kill` only for that recorded container, waits for the terminal state, then removes it. Normal, failed, timed-out, and cancelled runs all verify removal. A missing or mismatched ID is rejected; cleanup never enumerates and removes containers by a broad name pattern.

On Windows the container VM owns the process namespace, so killing the recorded container terminates its descendant tree. The capability suite also launches a real child process and verifies the container exits and is removed. Locked bind-mount cleanup remains an R7 Windows test.

## Local Windows evidence

On 2026-07-31 this workstation reported Docker Desktop `4.61.0`, Engine/CLI `29.2.1`, Linux kernel `6.6.87.2-microsoft-standard-WSL2`, and the pinned image digest above. A disposable probe observed:

```json
{"network":"network-none","oracleWrite":"EROFS","oracleUnchanged":true,"networkMode":"none","readonlyRoot":true,"mountCount":0,"memory":134217728,"nanoCpus":500000000,"pidsLimit":64,"capDrop":"ALL","noNewPrivileges":"no-new-privileges","afterKill":"exited","removed":true}
```

This selects the backend and proves the five primitives on one Windows machine. It does not yet prove the `SandboxRunner` implementation, Linux parity, locked-file behavior, or safe execution of the 30-patch corpus.

## Required implementation gate

Before R7 may execute corpus or participant code:

- implement exact `SandboxCapabilities`, `SandboxRequest`, `IsolatedCommand`, and `CommandResult` validators;
- prove no-network with an active outbound attempt, not container metadata alone;
- prove the mount allowlist and oracle hash before and after execution;
- test output truncation/redaction, timeout, concurrent runs, duplicate IDs, cancellation, descendant kill, locked files, and exact cleanup;
- run the same image and golden command-result vectors on protected Linux and Windows checks;
- record image provisioning separately from execution so tests never substitute an unpinned tag.

If any required capability fails, the runner reports it false and R7 remains blocked. `TrustedFixtureRunner` remains the only executable path.

## Primary references

- [Docker Desktop WSL2 backend](https://docs.docker.com/desktop/features/wsl/)
- [Docker run reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker bind mounts and read-only mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker Desktop CLI](https://docs.docker.com/desktop/features/desktop-cli/)

