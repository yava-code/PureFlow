# Falsifiable R&D Program

## Purpose

The architecture is valuable only if it preserves takeover ability without erasing the speed advantage of autonomous agents. This document turns that statement into experiments and kill criteria.

Targets below are pre-product gates, not measured results.

## Claims under test

### H1 — Active control beats passive review

A project-derived prediction, diagnosis, intervention, and recovery episode will improve delayed AI-off performance more than diff review, explanations, and post-hoc questions alone.

### H2 — Parallel practice preserves production speed

Running the episode in a disposable twin while agents continue will keep production critical-path time close to normal autonomous-agent use.

### H3 — Readiness evidence predicts takeover

Scoped evidence from previous episodes will predict later adjacent-task success better than self-rated confidence, diff time, or quiz accuracy.

### H4 — Automatic compilation is practical

A narrow compiler can generate coherent, deterministic episodes from normal test-backed TypeScript changes without a human authoring each scenario.

### H5 — Semantic checkpoints beat random comprehension prompts

An event-triggered Explain-to-Break pulse selected from a causally important seam will produce better delayed adjacent-task performance per minute of attention than asking the developer to explain a randomly selected function.

### H6 — Live decision authority adds value beyond shadow control

A pre-reveal Decision Future that can determine a real integrated path will improve delayed takeover and calibrated engineering agency beyond an otherwise identical shadow-control episode, without breaching the production-speed or attention margins.

### H7 — The Takeover Envelope predicts blackout performance

Project-scoped, time-stamped control evidence will predict delayed AI-off takeover better than self-confidence, diff exposure, episode count, or immediate explanation quality.

### H8 — Evidence-carrying generation makes large changes accountable

The Intent Ledger will let developers locate the relevant intent, invariant, and evidence in generated changes faster than raw diffs or AI summaries, without false `supported` provenance. Navigation success is an accountability outcome, not proof of skill retention.

### H9 — Operator Projection improves causal orientation

Rendering the same evidence through an Operator Projection and Operator Delta will reduce time to the first valid causal hypothesis on an adjacent fault compared with the existing Intent Ledger plus Operator Model views, without increasing false confidence or active attention.

## What does not count as success

- more questions answered correctly immediately after generation;
- users reporting that they “feel more confident”;
- more time spent looking at code;
- a higher number of manually typed lines;
- an LLM saying the developer's explanation is good;
- an injected bug whose answer is copied from the visible production diff;
- better performance only on the exact mutation seen during practice.

## Experiment 0 — Problem and workflow discovery

### Question

Do agent-native developers experience takeover failure as a real recurring problem, and will they spend a bounded voluntary attention budget on it?

### Method

Recruit 8–12 developers who use Cursor, Claude Code, Codex, Windsurf, or similar tools for real multi-file work. Include junior, mid-level, and senior participants.

Use artifact-based interviews rather than opinion-only questions:

1. ask each participant to bring a recent agent-generated change;
2. hide the generation transcript;
3. ask them to predict a behavioral change and trace one path;
4. present an adjacent failure or modification;
5. observe evidence selection and takeover behavior;
6. show three experience concepts and ask what they would voluntarily complete during an agent run.

### Evidence

- concrete episodes where the participant could or could not take over;
- time spent reconstructing the system;
- existing coping workflows;
- acceptable attention budget;
- reactions to local readiness evidence and privacy boundaries.

### Gate

Continue only if at least half of participants demonstrate or describe a recurring project-specific takeover gap and at least half prefer a bounded live-project control episode over a generic tutorial or mandatory diff gate.

This threshold is a discovery rule, not a market-size estimate.

## Experiment 1 — Technical scenario compiler spike

### Question

Can the proposed mechanism create safe, executable experiences automatically?

### Corpus

Preregister eligibility and sampling before inspecting compiler outcomes. Use a development corpus and a frozen held-out corpus totaling at least 30 TypeScript/Node patches across at least three open-source or consented repositories. A patch is eligible only when it has:

- a passing base revision;
- a passing target revision;
- one or more behavior-relevant changed symbols;
- a deterministic test command;
- no external production credentials.

The 30-patch run is a technical pilot with wide uncertainty, not a general performance estimate. “Supported” may be narrowed only before the held-out set is revealed and must remain fixed for that evaluation.

### Prototype pipeline

```text
patch + test evidence
→ changed symbol extraction
→ candidate invariant/test relationship
→ standalone sanitized repository
→ known mutation or adjacent counterfactual
→ reproducible failing evidence
→ hidden-answer repair
→ deterministic judge
→ bounded semantic probe + executable falsifier
```

### Measures

- percentage of patches yielding a coherent episode without manual scenario authoring;
- setup reproducibility over three clean runs;
- false-pass and false-fail rate;
- cleanup failures or production-worktree contamination;
- median setup time and disk cost;
- expert rating of causal relevance, not just syntactic validity.
- percentage of patches yielding a bounded, causally relevant Explain-to-Break probe with no model-authored executable material;
- capsule redaction/rejection and unauthorized-execution attempts;
- false-pass and false-fail rates against a protected oracle;
- 95% confidence intervals for every rate;
- agreement between two independent expert raters, with adjudication reported;
- Windows/Linux parity for fixture hashes, setup, cancellation, locked files, concurrent twins, and cleanup.

### Pass targets

- valid episode for at least 80% of every eligible held-out patch inside the preregistered support envelope;
- valid executable semantic probe for at least 70% of every eligible held-out patch inside that same envelope;
- reproducible setup and judge result for at least 95% of generated episodes;
- at least 90% agreement with an expert-labeled outcome;
- zero observed false passes in the pilot, with the confidence interval reported rather than interpreted as proof that the true rate is zero;
- zero writes to the production worktree;
- zero accepted controller/oracle leaks or model/developer-authored executable inputs in the adversarial capsule/probe suite;
- median local setup under two minutes after dependencies are present.

### Kill or narrow criteria

- fewer than 60% valid episodes after two compiler iterations;
- fewer than 50% valid semantic probes after two compiler iterations;
- reliance on hand-authored tasks for most patches;
- frequent tests that validate the same incorrect assumption as the generated code;
- irreducible need to clone a full production environment for ordinary supported cases.

If the broad compiler fails, narrow to explicit invariant manifests, existing mutation-test operators, or test-backed API boundaries before abandoning the whole thesis.

## Experiment 2 — Interaction pilot

### Question

Can a developer complete the control episode without feeling that the IDE became a course?

### Participants

6–10 agent-native developers. This is a usability pilot, not an efficacy claim.

### Tasks

Each participant completes three short project-derived episodes:

1. predict a behavior before reveal;
2. diagnose and repair a change-derived fault;
3. direct an intervention through a cold agent that receives only requested evidence.

Across the set, include one Intent Ledger evidence-navigation task and one genuine Decision Future whose on-time pre-reveal commitment can alter the integrated path. These additions test interaction integrity only; this small pilot cannot establish H6–H8.

The production agent runs a separate real task concurrently to test interruption and attention switching.

### Measures

- time to enter and understand the episode;
- active minutes;
- hint use and abandonment;
- whether the user returns voluntarily for the next episode;
- perceived interruption at specific moments;
- observed confusion about twin versus production state;
- preference among `0`, `5`, and `15` minute budgets.

### Pass targets

- median active episode at or below 10 minutes;
- at least 60% complete a second episode voluntarily;
- no participant accidentally edits or mistakes the production worktree;
- at least 70% can correctly describe what capability the episode exercised.

If users call it homework, remove frequency before adding rewards or coercive gamification.

### Concurrency check

A recovery episode can exist only after its source checkpoint passes. Therefore H2 is tested with a two-checkpoint pipeline, not by pretending to train on an unfinished target:

1. agent completes checkpoint N;
2. compiler prepares episode N;
3. agent starts checkpoint N+1 or an unrelated queued task;
4. human starts and completes episode N;
5. telemetry must contain an agent event from N+1 between `experience.started(N)` and `judge.completed(N)`.

Compare total pipeline makespan and human active time against the same two checkpoints with normal agent use.

### Control Pulse comparison

Randomize eligible checkpoints within participant across three prompt policies:

1. random function explanation;
2. semantic-seam explanation scored by a small model;
3. semantic-seam Explain-to-Break with an executable falsifier.

Keep prompt count and active-time budget matched. Measure valid-falsifier rate, prediction accuracy, evidence selection, opt-out, interruption cost, and delayed adjacent transfer. An LLM score is recorded only as a provisional annotation and never as the outcome oracle.

This pilot is a feasibility and variance-estimation gate, not a confirmatory test of H5. Policy 3 may advance only if it produces valid executable falsifiers at acceptable interruption/abandonment cost and shows no preregistered harm signal on delayed transfer. Evidence-selection quality is secondary and can never compensate for flat or worse delayed transfer.

H5 requires a separately powered confirmatory comparison of policy 1 versus policy 3 using regression-free delayed adjacent-task completion as the primary outcome and attention time as a non-inferiority constraint. Before enrollment, preregister the minimum worthwhile transfer difference from pilot variance and the attention margin. H5 passes only if the transfer estimate exceeds that margin with the planned confidence bound and attention stays within its margin. If policy 2 performs as well as executable probing, narrow the mechanism claim; if the confirmatory policies perform alike, remove mid-run prompts from the core.

## Experiment 2.5 — Operator Projection representation pilot

### Question

Does the Operator Projection make existing control evidence more operational, or merely produce a more persuasive project summary?

### Entry gate

Run only after the complete R7 expert gate. Freeze one offline representation prototype, tasks, evidence, scoring, and active-time budget before participants see it. This pilot may gate the R6 projection but cannot establish skill preservation.

### Conditions

Use matched unfamiliar TypeScript modules and identical underlying evidence:

1. Intent Ledger navigation plus an Executable Operator Model snapshot;
2. the same ledger/model data rendered as Operator Source nodes through a revision-bound Operator Projection and Operator Delta.

Do not add extra tests, hints, explanations, or control episodes to condition 2. The representation is the only factor.

### Outcomes

- **Primary:** time to first valid causal hypothesis on an unseen adjacent fault;
- regression-free adjacent completion;
- time to locate controlling intent, evidence, and recovery route;
- incorrect causal claims and confidence calibration;
- stale-node detection and missed invalidation;
- active attention and maintenance cost;
- rubber-stamp acceptance of agent-proposed nodes.

### Decision rule

Freeze the minimum worthwhile time improvement and non-inferiority margins from a usability pilot before the confirmatory comparison. H9 fails if the projection does not improve causal localization per active minute, increases false confidence, hides unknown areas, or requires manual specification work. On failure, retain the Intent Ledger and Operator Model directly and remove Dual Source from the product category claim.

## Experiment 3 — Controlled delayed-transfer study

The complete preregistration template is [`R8_COMBINED_PILOT_PROTOCOL.md`](R8_COMBINED_PILOT_PROTOCOL.md). Freeze it before enrollment; this section is the decision summary.

### Research design

Run a randomized controlled study on unfamiliar but realistic modules. Use a power analysis after the pilot to choose sample size; do not present a small convenience sample as definitive.

### Conditions

1. **Autonomous:** full agent execution plus normal result view.
2. **Active comparator:** autonomous agent plus a fixed 10-minute protocol containing the same diff, a standardized explanation, and three preregistered post-hoc questions. Do not substitute a manual seam after seeing results.
3. **Shadow control:** autonomous agent plus Intent Ledger navigation, an Operator Model snapshot, and a compiled prediction–diagnosis–recovery episode that cannot affect production.
4. **Full PureFlow:** the same shadow-control mechanisms plus one genuine Decision Future whose on-time pre-reveal commitment can determine the integrated production path.

All groups get the same agent model, task, time and token budgets, repository state, documentation access, and production tests. Active comparator, Shadow control, and Full PureFlow receive the same maximum active-attention budget.

### Phase A — Production task

Participants direct the agent to implement a feature. Measure:

- wall-clock production completion;
- critical-path time;
- human active attention;
- patch correctness and regressions;
- assistance behavior.

### Phase B — Delayed takeover

After 48 hours, with a preregistered ±4-hour scheduling window, hide the generation transcript and disable answer-generating AI for a 45-minute adjacent task. Documentation, syntax reference, tests, and debugger remain available.

The task must share the underlying invariant or data path but not the exact practiced mutation.

### Primary outcomes

- **Primary estimand:** intention-to-treat risk difference between Full PureFlow and Active comparator in the proportion completing a regression-free adjacent change within 45 minutes;
- successful regression-free adjacent change in the Autonomous condition is exploratory;
- time to first valid causal hypothesis;
- fault localization;
- evidence-selection quality;
- recovery after an incorrect intervention.

### Secondary outcomes

- confidence calibration;
- architecture explanation scored blind by experts;
- Intent Ledger navigation accuracy and false-provenance rate;
- live-influence, false-fork, skip, late, default, and speculative-compute rates;
- Takeover Envelope calibration against confidence and exposure baselines;
- retention after an additional delay;
- subjective workload and product preference.

### Analysis rules

- define exclusions before data collection;
- blind outcome reviewers to condition;
- publish all tested outcomes and confidence intervals;
- separate task correctness from explanation quality;
- report hint and tool usage;
- distinguish immediate performance from delayed transfer.
- randomize before the production task and analyze participants in their assigned condition;
- count missing primary outcomes as unsuccessful in the conservative primary analysis and report a preregistered missing-data sensitivity analysis;
- cap Active comparator, Shadow control, and Full PureFlow at 10 active minutes during Phase A so attention, not just elapsed time, is comparable;
- standardize the delay and task timeout above rather than selecting them post hoc.

### Ordered mechanism tests

Run comparisons in this frozen order:

1. Full PureFlow versus Active comparator tests the combined product claim;
2. Full PureFlow versus Shadow control tests whether real live authority adds value beyond matched executable practice;
3. the Takeover Envelope is compared with self-confidence, diff exposure, and episode-count baselines.

The pilot estimates variance. Freeze the confirmatory sample size, minimum worthwhile Full-versus-Shadow effect, and predictive-calibration margin before enrollment. Do not select the best arm post hoc.

### Mechanism ablation

Before scale-up, run a separately powered or explicitly exploratory ablation across equivalent tasks:

1. recovery-only executable episode;
2. prediction plus diagnosis plus recovery;
3. matched diff/explanation protocol.

This tests whether prediction and evidence selection add transfer beyond executing a repair. Do not use the best-performing ablation retrospectively as the original primary condition.

### Product gate

Proceed to a longitudinal field pilot only if Full PureFlow:

- improves delayed adjacent-task success over the fixed Active comparator by at least 20 percentage points and the 95% confidence interval for the primary risk difference excludes zero;
- does not increase median production critical-path time by more than 5% and p90 by more than 10%;
- stays within a median 10-minute human attention budget;
- outperforms the active comparator on behavior, not just confidence.

If Full PureFlow and Shadow control are equivalent within the frozen worthwhile-effect margin, remove Decision Futures from the product core or retain them only as an optional agency feature. If the Takeover Envelope does not outperform simple confidence/exposure baselines, remove readiness and routing claims. If only immediate recall improves, reclassify the feature as a tutor and reject the revolutionary-IDE claim.

## Experiment 4 — Longitudinal field pilot

### Question

Does the mechanism remain useful after novelty fades, and does readiness evidence track real project takeover?

### Method

Run a four- to eight-week opt-in pilot with developers using PureFlow on their own repositories.

- randomly vary eligible episode timing or type within participant where safe;
- schedule delayed adjacent episodes across days;
- periodically run a bounded cold takeover with code generation unavailable;
- compare readiness evidence to observed outcomes;
- collect production throughput and opt-out behavior;
- interview participants who reduce their budget to zero.

### Primary field outcomes

- episode completion over time;
- AI-off adjacent-task success;
- readiness-evidence calibration;
- production cycle time;
- user-controlled budget changes;
- real incidents where prior experience helped or failed to help.

### Kill criteria

- completion collapses after the novelty period;
- readiness evidence fails to predict takeover better than self-confidence;
- high performers receive low-value exercises they cannot tune away;
- developers game the system instead of using it;
- the mechanism causes meaningful production slowdown or unsafe branch confusion;
- benefits disappear on unseen fault families.

## Scenario validity rubric

Every generated episode must pass these checks before presentation:

| Check | Requirement |
| --- | --- |
| Project local | Uses real symbols, dependencies, behavior, and tests from the current change |
| Causal | Requires a prediction or intervention that can alter an observed outcome |
| Hidden answer | The final patch or fix is not visible before the attempt |
| Executable | At least one deterministic check distinguishes relevant outcomes |
| Safe | Runs outside the production worktree and without production credentials |
| Bounded | Has an estimated attention budget and stop condition |
| Transferable | Names the adjacent capability to test later |
| Honest | States evidence gaps and never calls an LLM score proof |

## Instrumentation events

The pilot should capture event types, not raw private content by default:

```text
intent_ledger.opened
intent_ledger.unit_selected
intent_ledger.evidence_opened
operator_model.snapshot
operator_source.snapshot
operator_delta.compiled
operator_source.node_committed
operator_source.node_invalidated
takeover_envelope.snapshot
decision_future.offered
decision_future.committed
decision_future.integrated
decision_future.auto_defaulted
decision_future.skipped
decision_future.late
experience.offered
experience.started
prediction.recorded
evidence.requested
intervention.applied
judge.completed
hint.requested
experience.revealed
experience.abandoned
transfer.offered
transfer.completed
```

Each event carries local IDs, timestamps, scoped capability labels, and revision hashes. Research export requires explicit consent and de-identification.

## Decision cadence

After each experiment, update the ADR with one of four outcomes:

- **continue** — the mechanism cleared its gate;
- **narrow** — the thesis remains plausible but supported scope shrinks;
- **pivot** — another mechanism explains the benefit better;
- **kill** — delayed takeover did not improve enough to justify the product.

Shipping more UI is not a valid response to a failed mechanism test.
