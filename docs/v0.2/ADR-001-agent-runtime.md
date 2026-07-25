# ADR-001: Reuse the agent runtime; own the cognitive control plane

- **Status:** Proposed, with a time-boxed acceptance spike
- **Date:** 2026-07-25
- **Deciders:** yava-code
- **Supersedes:** The v0.1 non-goal of autonomous patch generation for the v0.2 branch only

## Context

PureFlow v0.2 must let agents plan, edit, run commands, test, recover, and coordinate with minimal human interruption. Those execution capabilities are necessary, but they are not the product differentiation.

The differentiating layer is the Ownership Compiler:

- normalized agent and tool provenance;
- base/head semantic architecture delta;
- behavior-level review units;
- claim-to-evidence links;
- independent disagreement review;
- risk-weighted prediction and takeover checks;
- local, dated ownership state.

Building both layers from scratch would spend most of the initial runway recreating file editing, shell execution, approval flow, model routing, MCP, checkpoints, retries, persistence, and subagents. Deep-forking an IDE would also create permanent Electron, editor, updater, extension, and security maintenance.

The current PureFlow VSCodium distribution already supplies the correct product shell: native editor, Explorer, terminal, debugger, tests, Source Control, extension host, trust boundary, and reproducible packaging.

## Decision

Keep the current VSCodium distribution and PureFlow extension. Introduce a provider-neutral `AgentDriver` inside the extension host or a local companion process.

Use a pinned headless agent SDK as the first executor if a spike proves that it exposes the required lifecycle and provenance events. The current first candidate is `@cline/sdk`, based on its open implementation, TypeScript fit, autonomous CLI/SDK direction, hooks, checkpoints, MCP, and multi-agent support.

Add adapters in this order:

1. `ClineDriver` for the first executable vertical slice;
2. `CodexAppServerDriver` as a direct secondary implementation with a rich event stream;
3. `AcpDriver` for broader editor/agent interoperability;
4. `OpenCodeDriver` only if user demand or a runtime capability justifies it.

Fork only a small runtime layer if a required event or control point cannot be exposed upstream. Do not fork a whole IDE or copy a provider's UI.

PureFlow owns all normalized domain types. No provider event type may leak beyond its adapter.

## Required driver boundary

```ts
interface AgentDriver {
  start(input: MissionContract, workspace: WorktreeRef): Promise<RunRef>;
  events(run: RunRef, signal?: AbortSignal): AsyncIterable<AgentEvent>;
  respond(run: RunRef, input: AgentInput): Promise<void>;
  cancel(run: RunRef): Promise<void>;
  snapshot(run: RunRef): Promise<RunSnapshot>;
}
```

The implementation may refine this interface. It must preserve these capabilities:

- explicit base commit and isolated worktree;
- streamed tool start/result events;
- file and patch provenance;
- command exit status and bounded output reference;
- test identity and result when observable;
- subagent parent/child relationship;
- exceptional approval request and response;
- cancellation and honest terminal status;
- deterministic reconstruction after restart;
- model/provider metadata without secrets;
- no retention of hidden chain of thought.

## Options considered

### Option A: Build the complete agent runtime

| Dimension | Assessment |
| --- | --- |
| Initial complexity | Very high |
| Control | Maximum |
| Time to ownership experiment | Poor |
| Maintenance | Very high |
| Differentiation | Low for most of the work |

**Pros**

- Full control over every event and policy.
- No upstream SDK churn.

**Cons**

- Recreates mature commodity surfaces before testing the product thesis.
- Security and reliability burden includes shell, edits, permissions, checkpoints, MCP, and model routing.
- Delays the semantic handoff experiment by months.

### Option B: Deep-fork an AI IDE or Code OSS

| Dimension | Assessment |
| --- | --- |
| Initial complexity | High |
| Product identity | High |
| Upstream cost | Very high and continuous |
| Access to closed runtimes | Often unavailable |
| Fit with existing PureFlow | Poor |

**Pros**

- Total control of editor chrome if based on an open editor.

**Cons**

- Cursor, Windsurf, and Kiro product layers are not an open runtime substrate.
- A Code OSS/VSCodium fork still does not supply the desired agent engine.
- Editor maintenance does not advance the Ownership Compiler.

### Option C: Fork a complete open agent extension

| Dimension | Assessment |
| --- | --- |
| Initial complexity | Medium |
| Event access | Good |
| UI coupling | High |
| Upstream updates | Costly |
| Product focus | Mixed |

**Pros**

- Fast access to a working agent and event paths.

**Cons**

- Couples PureFlow UX to another product's extension architecture.
- Encourages maintaining duplicated UI and provider assumptions.

### Option D: Pinned SDK behind `AgentDriver`

| Dimension | Assessment |
| --- | --- |
| Initial complexity | Medium |
| Time to experiment | Best |
| Provider lock-in | Contained by adapter |
| Event access | Must be proven |
| Maintenance | Moderate |

**Pros**

- Reuses mature execution while PureFlow owns its differentiating model.
- Allows upstream upgrades behind contract tests.
- Preserves the existing IDE-first shell.

**Cons**

- A young SDK may change quickly.
- Some provenance events may be missing or too provider-specific.
- Requires a compatibility test suite and version pinning.

### Option E: ACP only

| Dimension | Assessment |
| --- | --- |
| Interoperability | Excellent goal |
| Lowest-common-denominator risk | High |
| First-slice control | Uncertain |
| Long-term lock-in | Low |

**Pros**

- Open boundary between editors and multiple agents.
- Reduces provider-specific product coupling.

**Cons**

- A standard session/tool stream may not expose all causal provenance needed by the first experiment.
- Remote transports and adapter behavior may vary.

ACP is therefore a compatibility adapter, not the only first implementation.

## Spike acceptance gate

Time-box the initial runtime spike to five engineering days. Test three non-trivial TypeScript tasks in disposable worktrees.

Adopt the candidate only if all of the following are demonstrated:

1. every file mutation can be associated with a run and base/head state;
2. tool start/result and command exit status stream reliably;
3. cancellation leaves an honest, recoverable partial run;
4. a subagent or delegated task can be related to its parent;
5. no API key or secret appears in the persisted normalized event fixture;
6. the extension can reconstruct a run after restart;
7. task completion and evidence capture add less than 10% median wall-clock overhead before reviewer inference;
8. the adapter can be contract-tested without launching the full provider UI.

If one event is missing, first request or contribute an upstream hook. If that fails, implement a thin local wrapper. Reject the candidate if the missing surface would require maintaining a provider UI fork or patching a large fraction of the runtime.

## Consequences

### What becomes easier

- Test the ownership hypothesis before building another agent product.
- Replace or add runtimes without rewriting semantic analysis and UX.
- Keep native IDE behavior and the current distribution builder.
- Separate execution failures from Ownership Compiler failures.
- Run independent adapter conformance tests.

### What becomes harder

- Normalize semantically different provider events.
- Pin and upgrade young SDKs deliberately.
- Explain partial provenance when an external agent omits events.
- Keep provider credentials and policy isolated from PureFlow data.

### What must remain explicit

- SDK availability, license, APIs, and version are time-sensitive and must be reverified at implementation time.
- Different models or providers are not proof of statistical independence.
- Imported external runs may have weaker evidence and must be labeled accordingly.

## Action items

1. [ ] Define `AgentDriver` conformance fixtures before importing an SDK.
2. [ ] Pin and spike the current Cline SDK version.
3. [ ] Capture three sanitized golden event streams.
4. [ ] Implement worktree isolation and cancellation tests.
5. [ ] Decide whether the local ledger lives in the extension host or a companion process.
6. [ ] Compare the same fixture through Codex app-server.
7. [ ] Implement ACP only after the required normalized event set is stable.

## Sources to reverify during implementation

- [Cline repository](https://github.com/cline/cline)
- [Cline SDK documentation](https://docs.cline.bot/sdk/overview)
- [Agent Client Protocol](https://agentclientprotocol.com/get-started/architecture)
- [Codex repository and app-server](https://github.com/openai/codex)
- [OpenCode repository](https://github.com/anomalyco/opencode)
