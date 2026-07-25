# PureFlow v0.2 goal and vision

## Goal

Build an agentic IDE where agents may write nearly all implementation code while the developer remains able to understand, predict, review, debug, and direct the evolving system.

## Product equation

```text
maximum useful agent autonomy
+ minimum high-information human attention
+ evidence-backed system model
= operational ownership without manual-code theater
```

## North star

Twenty-four hours after an autonomous change, the developer can:

1. predict a relevant failure or behavior;
2. locate the responsible system boundary;
3. cite structural or executable evidence;
4. direct a fresh agent through an adjacent change;
5. do this without reading the full generated diff.

## Vision

PureFlow becomes the cognitive control plane above coding agents. The execution layer is replaceable; the durable product is the local record of intent, decisions, semantic change, evidence, uncertainty, and human ownership.

The IDE should feel faster than a normal agent workflow, not more educational. Understanding appears as a high-quality handoff from the system, not as a course, interruption stream, or requirement to retype code.

## Promise

**Agents write the code. You keep the system.**

## Non-negotiables

- Do not disable or shame autonomous coding.
- Do not require manual implementation.
- Do not call raw-diff exposure “human review.”
- Do not use answer length, keystrokes, time, or self-rating as proof of understanding.
- Do not turn personal cognition into employer surveillance or a public score.
- Do not let LLM prose outrank tests, traces, compiler facts, or deterministic graph edges.
- Do not block ordinary development or merges for voluntary ownership checks.
- Do not maintain a deep VSCodium fork.

## 2026 outcome

Prove or reject the core mechanism on a TypeScript vertical slice:

- an autonomous runtime completes a real task in a worktree;
- PureFlow captures normalized events and evidence;
- the Ownership Compiler emits three to seven anchored change claims;
- an independent challenger catches planted unsupported claims;
- a user can reconstruct the change without the raw diff;
- one delayed takeover measure outperforms a passive AI summary without more than 10% median delivery overhead.

The thresholds are product targets, not current results.

## Strategy

1. Publish the portable `ai-will-challenge-you` skill to validate the interaction cheaply.
2. Build the event-ledger and semantic-delta spike in the existing PureFlow extension shell.
3. Test predict-before-reveal, takeover simulation, and cold-agent handoff.
4. Expand runtimes and languages only after the mechanism shows measurable value.

## Source documents

- [Canonical PRD](../../prd.md)
- [Agent runtime ADR](ADR-001-agent-runtime.md)
- [R&D plan](RND_PLAN.md)
- [Prioritized brainstorm](BRAINSTORM.md)
