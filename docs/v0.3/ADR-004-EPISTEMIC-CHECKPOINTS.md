# ADR-004: Compile Agent Checkpoints into Human Control Pulses

- **Status:** Accepted as a post-R4 product hypothesis
- **Date:** 2026-07-26
- **Decision owners:** PureFlow project

## Context

A normal coding agent periodically reports files changed, commands run, and tests passed. Those reports improve visibility, but they do not show that the developer can predict or control the resulting system. Asking “what does this random function do?” has the same weakness: it rewards paraphrase, may target irrelevant code, and can be answered from the visible implementation.

PureFlow must keep autonomous execution fast while returning a small amount of high-value engineering judgment to the developer. It also cannot depend on hidden chain-of-thought. Model reasoning is not a stable product API; observable claims, decisions, commands, diffs, and evidence are.

## Decision

Add an event-driven **Control Pulse** protocol after the R0–R4 mechanism works. A production agent continues executing. At a stable semantic checkpoint it emits a bounded `ChangeClaim`, and PureFlow may offer one non-blocking probe from an eligible high-value seam.

```ts
interface ChangeClaim {
  schemaVersion: 1;
  checkpointId: string;
  intent: string;
  changedBehavior: string;
  boundary: { path: RelPath; symbol: string };
  invariant: string;
  evidenceRefs: Array<{ id: EvidenceId; sha256: Sha256; visibility: "participant" }>;
  unresolvedAssumption?: string;
}
```

`CONTRACTS.md` §8.5 is normative: the schema is exact, every string and array is bounded, evidence refs must resolve to participant-visible stored evidence, ordering is canonical, and the claim is rejected if its path is absolute or its evidence identity does not match the store. An agent-emitted object is untrusted input, not a privacy decision.

The checkpoint scheduler is event-driven, not timer-driven. Eligible triggers include:

- an implementation plan changed materially;
- a test, trace, or benchmark contradicted the current claim;
- a public API, schema, authorization, persistence, concurrency, or dependency boundary changed;
- a completed checkpoint exposed a high-blast-radius seam with stale or absent takeover evidence.

Routine formatting, generated code, imports, repeated call-site edits, and already-mastered low-risk seams do not trigger a pulse.

## Recall Probe selection

PureFlow may use randomness only inside a compiler-produced eligible set. Candidate ranking uses blast radius, novelty, causal centrality, evidence quality, readiness age, and expected future takeover value. Randomization then reduces memorization and repetitive selection without sampling arbitrary functions.

The first probe family is **Explain-to-Break**:

```text
validated ChangeClaim + hidden completed implementation
→ developer predicts behavior, invariant, or failure
→ Side Coach extracts a falsifiable claim
→ Experience Compiler maps it to a catalog-owned counterexample
→ Takeover Twin executes it
→ Evidence Judge reports the observed consequence
```

The developer does not need to type the implementation. Their irreducible work is to form a hypothesis, choose useful evidence, predict an observation, and direct the next intervention.

## Side Coach boundary

An optional small OpenAI-compatible model, including a Groq-hosted model, may act as a `SideCoachAdapter`. It receives only the validated `SideCoachCapsule` from `CONTRACTS.md`, never the original claim or evidence records. The controller resolves participant-visible refs, extracts allowlisted bounded excerpts, redacts them, removes local evidence IDs, and enforces a 16 KiB total capsule limit before any network call. Absolute paths, repository-wide source, terminal history, secrets, hidden repair, controller evidence, and oracle inputs remain unavailable.

The Side Coach may:

- parse a natural-language answer into a candidate hypothesis;
- identify a missing causal boundary;
- ask one compact clarification;
- propose a candidate input, trace, assertion, or test;
- explain a mismatch after executable evidence is revealed.

It may not:

- inspect hidden answers or oracle material;
- label a developer ready;
- mutate the readiness ledger;
- turn eloquence or agreement with another model into capability evidence;
- block production execution when the user skips a pulse.

Model output is bounded untrusted data. It may select one predeclared participant-visible probe input ID or ask a clarification; it can never become source code, a filename, command, argument, environment value, test, patch, mount, or executable input. R4.5 resolves the ID against the immutable fixture catalog; R7 resolves it against a frozen `SandboxControlProbe` whose commands and deterministic oracle inputs were compiled without the model. Every other value is rejected.

If no model is configured, the protocol still works with deterministic fixture probes and rule-based answer structure. No fake local-model verdict is generated.

## Interaction contract

Control Pulses appear in a compact side surface similar to an agent progress update. They are asynchronous by default:

1. the agent publishes a checkpoint capsule and continues unrelated or next-checkpoint work;
2. the developer may answer now, later, or skip;
3. a skipped pulse creates no capability evidence and does not block a normal merge;
4. a response becomes evidence only after a real probe, trace, test, intervention, or delayed adjacent task checks it.

`Forge` remains a separate opt-in mode for users who want to implement one seam manually. Manual typing is never required for Control Pulse credit.

## Motivation layer

PureFlow may later add a local **Flight Log**, but it must not equate activity with readiness.

- A continuity streak means at least one verified control episode in a rolling week, with a grace window. Missing a week does not reduce a capability score; evidence simply ages normally.
- XP for manual lines, commits, question count, or time in editor is forbidden.
- Achievements may describe concrete evidence: catching a false agent claim, recovering after a wrong first hypothesis, directing a cold agent, proving rollback, or transferring after a delay.
- A global leaderboard of developer “understanding” is rejected because it invites easy-task farming and surveillance.
- Optional public rankings may cover community contributions such as validated scenario templates, never individual readiness.

## Consequences

### Benefits

- autonomous coding remains the production engine;
- checkpoints recover prediction and causal control instead of line-by-line review;
- cheap models can reduce interaction cost without becoming judges;
- randomization improves variety without producing trivia;
- the protocol can be shared by the IDE and the `ai-will-challenge-you` skill.

### Costs and risks

- useful trigger precision requires a Chronicle and stable evidence model;
- model-generated falsifiers can be invalid and must be rejected before execution;
- even good pulses can become annoying, so attention budget and opt-out rate are release metrics;
- achievements can distort behavior and remain out of the technical MVP.

## Implementation gate

Do not add Control Pulse UI, streaks, achievements, leaderboard, or network model calls during R0–R4. R4.5 is a required technical gate before R7: it implements the versioned claim/capsule/probe contracts, controller-versus-participant split, catalog-only executable inputs, and deterministic fixture tests. Only after that gate may an explicitly configured Side Coach adapter be tested. R7 must establish that useful recovery episodes and probes compile beyond one fixture before R5/R6 may persist or display capability state. Gamification waits for the human pilot and is removed if it increases easy-episode farming or lowers delayed transfer.

## Alternatives

### Random function quiz

**Rejected as the core.** Cheap to build, but syntactic recall and explanation are weak proxies for project takeover.

### Periodic timer interruption

**Rejected.** It interrupts at arbitrary moments and optimizes frequency rather than information value.

### LLM-only scoring

**Rejected.** A second model can reproduce the same misconception and reward polished language.

### Manual-code percentage

**Rejected.** It punishes automation and rewards typing volume rather than engineering judgment.

### Event-triggered, executable Control Pulse

**Selected.** It places human attention on surprising or consequential causal seams while the build plane remains autonomous.
