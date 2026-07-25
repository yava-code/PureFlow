# PureFlow v0.2 R&D plan

## Purpose

Turn the PRD into falsifiable product and technical experiments. This plan must prevent two easy failure modes:

1. shipping a polished prompt that cannot prove its explanations;
2. claiming “developers understand” from an immediate quiz or self-report.

All thresholds below are starting targets. None are current PureFlow results.

## Hypotheses

### H1 — Semantic compression

A behavior- and architecture-level handoff can reduce the time needed to reconstruct an agent-built change without reducing defect detection compared with raw-diff access.

**Success signal:** at least 30% lower median comprehension time while seeded-defect detection is no worse by more than five percentage points.

### H2 — Prediction beats passive explanation

One evidence-backed predict-before-reveal interaction creates a more usable mental model than reading an AI summary of the same change.

**Success signal:** at least a 20 percentage-point improvement on a delayed, task-specific counterfactual in the exploratory study.

### H3 — Cold-agent handoff measures operational ownership

A developer who has a usable system model can direct a fresh agent through an adjacent change more successfully than a developer who only received the builder's summary.

**Success signal:** at least a 20 percentage-point lift in correct adjacent-task plans or completed outcomes.

### H4 — Evidence separation reduces review slop

A blind challenger using deterministic graph/test/runtime evidence catches unsupported claims more reliably than a reviewer that inherits the implementer's rationale.

**Success signal:** at least 80% recall on planted unsupported claims with fewer than one false high-severity finding per ten runs.

### H5 — The cognition budget is tolerable

Agent-native developers will voluntarily spend a small amount of attention when questions are specific to a real change, delayed until after execution, and directly useful for future direction or failure recovery.

**Success signal:** at least 35% of qualified users voluntarily complete a handoff after four weeks, with median active time at or below 90 seconds.

## Workstreams

### Workstream A — Public protocol skill

**Deliverable:** `yava-code/ai-will-challenge-you`.

The skill is an instruction-only preview, not proof of the full product. It should validate:

- autonomy-first positioning;
- compact Change Model output;
- facts versus inferences;
- one skippable, risk-weighted challenge;
- predict before reveal;
- no manual-code requirement.

#### Skill eval set

Create at least:

- eight `should_trigger` prompts involving multi-file features, meaningful bug fixes, API/schema changes, architecture, or generated PR review;
- eight `should_not_trigger` prompts involving facts, prose, translation, tiny mechanical edits, or explicit requests for only a direct answer;
- three behavioral tasks in fresh sessions with the skill;
- the same three tasks without the skill.

Measure task completion, added interaction, token/time overhead, evidence anchors, question specificity, and whether the agent still implements the full task.

#### Exit gate

- structure validates under the Agent Skills specification;
- Claude Code marketplace metadata parses;
- Codex metadata validates;
- no script, hook, network dependency, or elevated tool permission in v0.1;
- independent forward tests do not ask the user to type code;
- no claim of measured skill improvement appears in public copy.

### Workstream B — Runtime flight recorder

**Deliverable:** one `AgentDriver` implementation and sanitized golden event streams.

#### Experiments

1. Add a multi-file TypeScript feature.
2. Fix a state/cache bug after a failed test.
3. Change a public interface and update callers/tests.

For each run, verify:

- base/head identity;
- file mutation coverage;
- command and test exit status;
- parent/child agent relationship where available;
- cancellation behavior;
- restart reconstruction;
- secret/path redaction;
- partial-run honesty.

#### Exit gate

Pass every criterion in [ADR-001](ADR-001-agent-runtime.md). Pivot runtimes if provenance requires a large provider fork.

### Workstream C — Deterministic TypeScript delta

**Deliverable:** a tested base/head graph and delta engine.

#### Initial facts

- source files and modules;
- exported declarations;
- import/export edges;
- symbol references where the TypeScript program resolves them;
- public type/signature changes;
- test file relationships inferred by imports and configured conventions;
- package dependency changes;
- configuration/schema files changed.

Call graphs and state transitions may be incomplete. The UI must say so.

#### Golden corpus

Build 10–20 small, reviewed changes with known:

- added/removed nodes;
- added/removed edges;
- changed public contracts;
- behavior units;
- seeded misleading or unsupported claims.

#### Exit gate

- at least 95% precision for added/removed import edges;
- at least 90% of changed public symbols assigned to a semantic review unit;
- no LLM-created graph edge shown as deterministic;
- incremental invalidation works after a follow-up edit.

### Workstream D — Claim and evidence compiler

**Deliverable:** three to seven material claims per qualified run.

#### Claim states

- `supported` — adequate structural or executable evidence exists;
- `partially-supported` — evidence covers only part of the statement;
- `contradicted` — an anchor conflicts with the statement;
- `unverified` — no adequate anchor exists;
- `stale` — the repository changed after evidence was collected.

#### Rules

- No `supported` claim without a machine-readable anchor.
- Passing the whole test suite is not automatically evidence for every claim.
- Generated tests are labeled; they do not become independent proof by being generated.
- An LLM explanation remains inference even when fluent.
- Follow-up code changes invalidate dependent evidence.

#### Exit gate

- at least 95% of material claims have an anchor or explicit `unverified` state;
- fewer than 5% of `supported` claims are materially misleading in a blinded expert audit;
- planted unsupported claims are not silently promoted.

### Workstream E — Independent challenger

**Deliverable:** disagreement-focused review using separated context.

#### Conditions to compare

1. reviewer sees implementer summary and rationale;
2. reviewer sees task contract, base/head, graph delta, and evidence only;
3. reviewer uses a different model/provider where practical, still with separated evidence.

Model diversity is recorded, not advertised as proof of independence.

#### Findings to target

- unsupported behavior claim;
- missing changed behavior;
- untested branch or failure mode;
- public contract drift;
- architecture pin violation;
- unnecessary dependency or duplicate implementation;
- mismatch between task contract and head state.

#### Exit gate

Blind review must materially improve planted-fault or unsupported-claim detection without exceeding the false-positive budget. Otherwise collapse it into a deterministic evidence checker.

### Workstream F — Human handoff

**Deliverable:** Change Map, claims, risks, and an optional 90-second handoff in the sidebar.

#### Challenge types

1. **Predict:** what happens under a concrete condition?
2. **Locate:** which boundary owns the behavior?
3. **Diagnose:** which invariant was violated by a controlled failure?
4. **Decide:** which of two real trade-offs fits the Mission Contract?
5. **Direct:** brief a fresh agent through an adjacent task.

Do not ask for syntax recall or manual code.

#### Interruption policy

- zero educational interruption while an ordinary run is executing;
- interrupt mid-run only for costly, ambiguous, hard-to-reverse decisions;
- no more than three ownership questions after a normal run;
- always offer `Skip` and remember that choice for the current run;
- Autopilot shows the Change Map without questions.

#### Exit gate

- median active handoff time <= 90 seconds;
- no more than one click to skip;
- raw diff remains available;
- users can navigate every evidence anchor in the native IDE;
- qualitative pilot feedback does not describe the feature as homework or surveillance.

## First executable fixture

Use a TypeScript cache/service task with at least three modules, one public interface, concurrent or time-sensitive behavior, and deterministic tests. A candidate evolution of `demo/cache-lab` is:

> Add stale-while-revalidate behavior while preserving expiry, timeout, and concurrent-request invariants.

Seed variants:

- inverted freshness comparison;
- duplicate refreshes under concurrency;
- failed refresh removes usable stale data;
- public result type changes without one caller;
- test passes without asserting the stale response;
- unsupported claim that errors are retried.

The fixture must publish its golden graph and expected claim states, not its challenge answers to forward-test agents.

## Human research protocol

### Stage 1 — Problem interviews

Recruit 8–12 developers who already use coding agents for substantial work. Ask for a recent concrete run, repository change, review, or incident. Avoid asking whether they “like the idea.”

Collect:

- agent hours and approximate change size;
- how they decided the change was done;
- what they could explain 24 hours later;
- where they became stuck during a follow-up or incident;
- whether they read the diff and what portion;
- what evidence they trusted;
- which interruption would have been worth it.

Exit only if at least five can identify a costly ownership failure that the proposed handoff could address.

### Stage 2 — Mechanism smoke test

Recruit 8–12 users. Use think-aloud sessions to remove confusing UI and impossible tasks. Do not report effect sizes.

### Stage 3 — Exploratory crossover

Recruit 30–50 users. Each user experiences all three handoff conditions in counterbalanced order:

- baseline agent completion;
- passive AI summary;
- PureFlow evidence and prediction.

Use unfamiliar but bounded repositories and tasks. Separate delivery from evaluation. Include an immediate assessment and a 24-hour adjacent task.

### Stage 4 — Confirmatory study

Preregister conditions, primary outcome, exclusions, and sample size using the variance observed in Stage 3. Do not choose a sample size from the target effect alone.

## Measurement definitions

| Metric | Operational definition |
| --- | --- |
| Delivery success | Acceptance commands pass and task-specific reviewer confirms requested behavior |
| Active human time | Time spent reading handoff, navigating evidence, answering, or directing; excludes agent runtime |
| Prediction accuracy | Correct behavior plus correct causal boundary on a withheld scenario |
| Boundary localization | Identifies responsible module/interface and evidence within five minutes |
| Defect detection | Finds a seeded material defect without being told its class |
| Direction quality | Fresh agent produces a correct plan or outcome from human brief plus repository |
| Calibration | Difference between stated confidence and observed correctness |
| Evidence coverage | Material claims with an adequate anchor or explicit unverified status |
| Annoyance | Opt-out plus a short workload/utility item and qualitative reason |

Do not combine these into a developer score.

## Instrumentation boundary

Default product telemetry is off. Research instrumentation requires explicit consent and a separate export. The local product may record:

- run and repository-state identifiers;
- which handoff surface was opened;
- which evidence anchors were visited;
- skip/completion state;
- local answer and adjudication;
- timing required for the user's own history.

Do not record unrelated editor activity, clipboard, global shell history, other agents, or background files.

## Roadmap

| Phase | Estimate | Outcome | Exit decision |
| --- | --- | --- | --- |
| 0. Skill and interviews | 1 week | Public wedge plus problem evidence | Continue only with repeated concrete pain |
| 1. Runtime spike | 1 week | Driver, worktrees, event fixtures | Adopt, change runtime, or thin-fork |
| 2. Semantic delta | 2 weeks | Deterministic TS graph and golden corpus | Continue only if precision/coverage gates pass |
| 3. Claims and review | 2 weeks | Evidence ledger and blind challenger | Keep challenger only if it improves detection |
| 4. Sidebar handoff | 2 weeks | End-to-end vertical slice | Continue only if overhead and usability gates pass |
| 5. Exploratory study | 2–4 weeks | Effect sizes and failure analysis | Confirm, pivot to observability, or stop |
| 6. Multi-runtime | after evidence | Codex/ACP adapters and PR export | Expand only with measured demand |

## Decision outcomes

### Continue as ownership-preserving development

Delayed prediction, diagnosis, or direction improves over passive summary while delivery overhead remains acceptable.

### Pivot to agent observability

Claim/evidence review catches defects or drift, but human takeover measures do not improve. Position the product as a trustworthy agent run and semantic review control plane.

### Stop the approach

The semantic model is materially misleading, evidence coverage cannot be made honest, or the human loop adds friction without improving any delayed operational outcome.

## Required experiment log

Every completed experiment should record:

- date and commit;
- exact runtime/model/version;
- task and fixture revision;
- condition;
- raw result and failure mode;
- whether the threshold was set before the run;
- decision: continue, change, or stop;
- links to sanitized evidence.

Never replace a failed experiment by silently changing the metric in the PRD.
