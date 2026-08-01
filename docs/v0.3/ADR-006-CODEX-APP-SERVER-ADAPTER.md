# ADR-006: Use Codex App Server for the First Live Agent Adapter

- **Status:** Accepted for a narrow live spike
- **Date:** 2026-07-31
- **Decision owners:** PureFlow project

## Context

R1 first proves the vendor-neutral `AgentDriver` and Flight Recorder with a checked replay transcript. The next decision is which existing agent runtime should supply the first live event stream. PureFlow must not rebuild file editing, command execution, approval handling, conversation state, or cancellation from scratch.

The comparison used current official interfaces rather than CLI screen scraping:

| Candidate | Useful documented surface | Main limitation for the first spike |
| --- | --- | --- |
| [Codex App Server](https://learn.chatgpt.com/docs/app-server) | JSONL-over-stdio rich-client protocol, version-matched generated schemas, thread/turn lifecycle, authoritative item completion, file changes, commands, tests through command evidence, steering, interruption, and approvals | The app-server command and parts of the protocol remain experimental and must be pinned and isolated behind an adapter |
| [Agent Client Protocol](https://agentclientprotocol.com/updates) | Stable multi-agent client/agent interoperability direction with session lifecycle, tool calls, plans, permissions, and usage updates | A protocol, not an autonomous runtime; an ACP agent still has to be selected and observed |
| [Cline SDK](https://docs.cline.bot/sdk/overview) | Embeddable open-source agent harness with [runtime and tool events](https://docs.cline.bot/sdk/events) | A larger runtime dependency and product surface than required to validate one adapter |
| [OpenCode server and SDK](https://opencode.ai/docs/server/) | Headless HTTP server, OpenAPI document, typed SDK, and server-sent events | The embedded v2 SDK is not the stable public boundary; HTTP lifecycle adds integration surface for a local VSCodium spike |
| [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/events-and-streaming) | Persisted session event stream, steering, interruption, tool-use events, and multi-agent threads | Hosted beta infrastructure rather than the local IDE runtime boundary PureFlow needs first |

## Decision

Use **Codex App Server over local stdio** for the first live `AgentDriver` spike.

This is a selection for integration learning, not an exclusive product dependency. It wins the first slot because the documented boundary already powers rich clients such as the Codex VS Code extension and exposes the exact observable units R1 needs: `turn/started`, `item/started`, authoritative `item/completed`, `commandExecution`, `fileChange`, `turn/diff/updated`, approvals, and `turn/completed` or interruption.

The adapter will:

1. launch a user-installed, exact Codex version with `codex app-server` over stdio;
2. generate or verify TypeScript/JSON schemas for that exact version during adapter development;
3. map only allowlisted lifecycle, command, file-change, test, and terminal facts into schema-v1 `RunEnvelope` events;
4. issue PureFlow execution IDs and command-registry IDs rather than persisting vendor IDs as domain authority;
5. convert bounded, redacted output and diffs into project-owned `EvidenceRef` values before appending events;
6. treat `item/completed` and `turn/completed` as authoritative, including declined, interrupted, and failed states;
7. keep raw reasoning, absolute `cwd` values, environment values, authentication state, and unbounded output outside the Flight Recorder;
8. fail closed when the installed protocol does not match the adapter's tested schema.

The first spike stays local and explicit. It does not expose a WebSocket listener, migrate the user's agent configuration, or silently start Codex when the user selected another provider.

## Portability path

ACP is the preferred second adapter boundary after the Codex spike proves the normalization contract. It can broaden runtime choice without making ACP events the PureFlow domain model. Cline and OpenCode remain concrete fallback runtimes if the App Server does not expose sufficient stable evidence for a real near-miss. Claude Managed Agents remains a later hosted-adapter experiment.

## Gate

The live adapter is accepted only if a fixture task can produce the same normalized facts as the checked replay transcript without leaking a vendor event, absolute path, credential, or raw reasoning block. A protocol mismatch, missing terminal evidence, or ambiguous file state is an `unsupported` or failed run, never a fabricated success.

## Consequences

### Benefits

- PureFlow reuses a real agent runtime instead of building a generic agent loop;
- the stdio process boundary is narrow and local;
- generated schemas make protocol drift testable;
- the same Flight Recorder contract remains available to later providers.

### Costs and risks

- an experimental upstream surface can change, so the adapter needs compatibility fixtures and a hard version gate;
- Codex native events contain more information than PureFlow may retain, so normalization and redaction are mandatory before storage;
- this decision validates one integration path, not cross-provider portability.
