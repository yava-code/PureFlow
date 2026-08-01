# ADR-007 — Executable Operator Model and shadow control

- **Status:** Proposed; implementation gated by the complete R7 expert audit
- **Date:** 2026-08-01
- **Deciders:** repository owner after R7 adjudication
- **Supersedes:** no earlier ADR; extends ADR-001 and ADR-004

## Context

PureFlow's current Dual-Control thesis correctly rejects passive diff review, explanations, quizzes, and manual-code quotas as evidence of takeover readiness. The remaining weakness is architectural: a Takeover Twin is still described primarily as an experience produced beside the real system. The product has no durable representation of what the operator can actually predict, observe, change, and recover.

That gap matters because the requested end state is not “the developer completed exercises.” It is:

> autonomous agents may write essentially all implementation code, while the developer retains an accurate, current, project-specific model and can direct or perform a takeover when automation disappears.

Research does not support the analogy that passive autopilot use preserves manual ability. Automation can improve routine performance while leaving operators with worse situation awareness and recovery performance. Simple explanations do not reliably prevent overreliance. Cognitive forcing can reduce overreliance, but its benefit costs attention and acceptability. The 2026 Anthropic coding study found lower immediate mastery under AI assistance on average, with the largest reported gap in debugging; interaction modes that used AI to build comprehension did not show the same qualitative pattern.

The design implication is not to remove autonomy. It is to make operator readiness a maintained system artifact with executable evidence, drift, and invalidation semantics.

## Decision

PureFlow will treat each meaningful autonomous checkpoint as capable of producing three outputs:

1. a tested software checkpoint;
2. an immutable control surface describing how to `observe → actuate → recover` one critical seam;
3. an **Executable Operator Model** containing only claims the developer has behaviorally demonstrated or explicitly left unverified.

The Operator Model is not an AI summary of the repository. It is a local, project-scoped graph of bounded causal claims connected to executable observations and prior human actions.

```text
                         ┌────────────────────────────┐
developer intent ───────►│ autonomous build plane     │────► software checkpoint N+1
                         └─────────────┬──────────────┘
                                       │ observable evidence
                                       ▼
                         ┌────────────────────────────┐
                         │ controllability compiler   │
                         │ observe / actuate / recover│
                         └─────────────┬──────────────┘
                                       │ model delta
                                       ▼
                         ┌────────────────────────────┐
                         │ operator-model compiler    │
                         │ fresh / stale / contradicted│
                         └─────────────┬──────────────┘
                                       │ highest information gap
                                       ▼
                         ┌────────────────────────────┐
                         │ shadow control protocol    │
                         │ predict / evidence / direct│
                         └─────────────┬──────────────┘
                                       │ executable result
                                       ▼
                           test / probe / rollback / handle
```

### Shadow control

At a stable checkpoint, the production agent continues its next task. PureFlow may open one bounded shadow-control opportunity for checkpoint N:

1. commit a concrete prediction before the relevant result or finished implementation is revealed;
2. select the observation that would distinguish plausible causes;
3. optionally give a hypothesis and conditional directive to a context-starved agent;
4. let that agent write every line of the intervention;
5. execute the intervention in a disposable twin;
6. recover after a wrong first move;
7. convert the verified result into a durable control artifact.

The human owns the causal model and control policy. The agent may still own implementation, syntax, command execution, and repair mechanics.

### Model divergence, not question frequency

PureFlow schedules attention from divergence between the current checkpoint and the operator model. A changed function is not prompt-worthy merely because it exists. A seam becomes eligible when one or more of these are true:

- a previously demonstrated claim became stale after a meaningful change;
- a new critical route has no human-controlled observation or recovery evidence;
- the agent changed an assumption, plan, or invariant after new evidence;
- two candidate implementations predict different failure envelopes;
- a prior human prediction was contradicted;
- delayed transfer evidence is absent or decayed.

Random function questions, line counts, and periodic timer prompts cannot update the Operator Model.

### Every interaction pays a control dividend

An interaction that produces only a score or explanation is incomplete. A passed shadow-control episode should create or verify at least one reusable project artifact:

- regression probe;
- deterministic observation recipe;
- rollback recipe;
- bounded incident packet;
- control-surface handle;
- clarified invariant attached to executable evidence.

This makes the developer's attention part of software production rather than homework beside it.

## Proposed contracts

These contracts are intentionally non-normative until the ADR is accepted. They must receive domain-separated RFC 8785 hashing, strict projections, and controller-owned authority before implementation.

```ts
type OperatorClaimState =
  | "unverified"
  | "fresh"
  | "stale"
  | "contradicted";

interface OperatorClaim {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sourceTreeHash: string;
  seamId: string;
  controlSurfaceHash: string;
  behaviorClaim: string;
  observationIds: string[];
  recoveryId: string;
  supportingCapabilityEvidenceHashes: string[];
  state: OperatorClaimState;
  checkedAt?: string;
  claimHash: string;
}

interface OperatorModelSnapshot {
  schemaVersion: 1;
  projectId: string;
  sourceTreeHash: string;
  claims: OperatorClaim[];
  uncoveredSeamIds: string[];
  snapshotHash: string;
}

interface ModelDelta {
  schemaVersion: 1;
  projectId: string;
  beforeSnapshotHash: string;
  sourceTreeHash: string;
  freshClaimIds: string[];
  staleClaimIds: string[];
  contradictedClaimIds: string[];
  uncoveredSeamIds: string[];
  reasonCodes: string[];
  deltaHash: string;
}

interface ShadowControlSession {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sourceTreeHash: string;
  modelDeltaHash: string;
  controlSurfaceHash: string;
  participantExperienceHash: string;
  availableEvidenceIds: string[];
  coldExecutorProfileId?: string;
  attentionBudgetSeconds: number;
  judgeSpecHash: string;
  sessionHash: string;
}

type ShadowControlEvent =
  | { type: "shadow.started"; sessionId: string; at: string }
  | { type: "shadow.prediction.committed"; sessionId: string; attemptHash: string; at: string }
  | { type: "shadow.evidence.selected"; sessionId: string; evidenceIds: string[]; at: string }
  | { type: "shadow.directive.committed"; sessionId: string; directiveRef: string; at: string }
  | { type: "shadow.patch.proposed"; sessionId: string; candidateDiffHash: string; at: string }
  | { type: "shadow.judged"; sessionId: string; judgeResultHash: string; outcome: "passed" | "partial" | "failed" | "failed-integrity"; at: string }
  | { type: "shadow.dividend.created"; sessionId: string; artifactHash: string; at: string };
```

Free-form developer or model output must never become a command, path, environment value, mount, test, or judge. A small model may parse prose into an existing bounded choice or coach after the commitment. Only executable controller-owned evidence changes claim state.

## Autonomy routing

The router chooses among four policies for each eligible checkpoint:

| Policy | When selected | Production behavior |
| --- | --- | --- |
| Silent autonomy | model coverage is fresh and risk is low | agents continue; no prompt |
| Shadow prediction | one high-information observation can test the model | agents continue; result is revealed after commitment |
| Cold relay | diagnosis and intervention ownership matter | fresh agent writes code from human-selected evidence and directive |
| Blackout replay | recovery readiness is weak or contradicted | human inherits a real pre-repair checkpoint in the twin |

The router optimizes expected takeover information per active minute, not engagement. A `0` minute budget remains valid and produces no readiness claim.

## User experience

The native editor remains primary. The cockpit shows no course or generic score. Its central object is a live map of control coverage:

```text
Agent checkpoint 42 passed

Auth route:        fresh control evidence
Tenant cache:      model contradicted by new invalidation path
Billing webhook:   no recovery handle

Best 3-minute control opportunity:
Which observation separates stale-cache propagation from key collision?

[Run shadow control] [Let agents decide] [Budget: 5 min]
```

Inside shadow control, the side chat behaves like an adversarial senior engineer. It asks for a prediction, an observation, or a conditional next move. It does not ask for prose about arbitrary code and does not require the user to manually type the patch.

## Options considered

### A. Diff and explanation review

Low implementation cost, high familiarity, but poor scaling and no behavioral evidence of prediction, intervention, or recovery.

### B. Random questions, streaks, and manual-code quotas

Easy to demonstrate and gamify, but optimize completion proxies. They can be engagement surfaces only.

### C. Takeover Twin without an Operator Model

Preserves active episodes, but episodes remain isolated events. The product cannot compute what changed in the human-system relationship or why one intervention is worth the attention.

### D. Executable Operator Model plus shadow control — selected

Higher contract and experiment complexity, but it turns human readiness into a versioned, falsifiable product output while preserving full code-generation autonomy.

## Consequences

### Easier

- explain why a developer is being interrupted;
- avoid beginner prompts on already-controlled seams;
- detect knowledge drift after code changes;
- connect attention to reusable tests and recovery infrastructure;
- compare human-selected control with an automatic policy;
- make the product valuable even when the agent's code is correct.

### Harder

- causal claims and control surfaces must be compiled without inventing facts;
- the product needs invalidation and provenance rules, not a mutable score;
- UI cannot hide uncertainty behind “understanding percentages”;
- effect must be tested on delayed adjacent tasks with real people;
- support will initially be narrow and test-backed.

## Falsifiers

Reject or narrow the decision if any preregistered study shows:

- model-driven selection does not beat simple seam selection per active minute;
- the same cold executor succeeds equally with automatic evidence and directives;
- Operator Model state does not predict delayed takeover better than confidence or diff time;
- control dividends are not reused or create material maintenance cost;
- users set the budget to zero after novelty fades;
- production slowdown exceeds the existing non-inferiority margin;
- benefits occur only on the exact practiced mutation.

## Entry and implementation gates

This ADR does not authorize R5/R6 implementation. Before acceptance:

1. complete and adjudicate the two-rater R7 expert audit;
2. freeze the exact Operator Model projection and hash domains in `CONTRACTS.md`;
3. add one model-delta fixture without a UI;
4. compare model-delta selection with random and weighted seam baselines;
5. compare human-directed cold relay with an automatic evidence policy;
6. only then expose model state in the cockpit.

## Research anchors

- Shen and Tamkin, [How AI Impacts Skill Formation](https://arxiv.org/abs/2601.20245), 2026.
- Buçinca, Malaya, and Gajos, [To Trust or to Think](https://doi.org/10.1145/3449287), 2021.
- NASA, [Developing a General Framework for Human-Autonomy Teaming](https://ntrs.nasa.gov/api/citations/20170003682/downloads/20170003682.pdf), 2017.
- Endsley and Kiris, [The Out-of-the-Loop Performance Problem and Level of Control in Automation](https://doi.org/10.1518/001872095779064555), 1995.

These sources motivate the mechanism. They do not prove that an Executable Operator Model preserves programming skill.
