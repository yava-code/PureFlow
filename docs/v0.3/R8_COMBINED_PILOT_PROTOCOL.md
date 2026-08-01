# R8 combined human-control pilot protocol

**Status:** Draft. Freeze before enrollment. No participant run is authorized until the complete R7 expert gate passes and the R5/R6 runtime implements the tested conditions.

**Purpose:** test whether PureFlow can preserve autonomous coding speed while producing measurable project takeover ability, accountable understanding, and real engineering agency.

This protocol is a preregistration template, not a result report. Target values are decision rules, not measured outcomes.

## 1. Why a combined pilot is necessary

The product claim is not that questions, explanations, or code reading feel useful. The claim is that a developer may delegate most implementation and still retain enough causal control to modify and recover the project when answer-generating AI is unavailable.

Recent evidence motivates the problem but does not prove this solution:

- Anthropic's randomized study of 52 mostly junior developers reported lower immediate mastery with AI assistance, with the largest gap in debugging. It used an immediate quiz and explicitly leaves long-term skill development unresolved.
- A 319-person Microsoft survey associates higher confidence in generative AI with less self-reported critical-thinking effort. It is observational self-report, not a behavioral coding outcome.
- Interviews with 20 science journalists suggest that automating execution while retaining judgment may preserve agency better than automating core decisions. That is a useful design hypothesis from another domain, not evidence for PureFlow.

Therefore R8 measures delayed executable behavior. It does not use confidence, explanation quality, time in a diff, or an LLM grade as proof of understanding.

## 2. Product requirement to evidence map

| Product requirement | Phase-A evidence | Delayed evidence | Falsifier |
| --- | --- | --- | --- |
| Full agentic coding remains first-class | agent completes the production task; production critical-path time and correctness are recorded | none | PureFlow requires a manual-code quota or breaches the speed margin |
| Generated changes remain accountable | every changed line reconciles to an Intent Ledger unit and honest attribution state | participant can locate the relevant intent, invariant, and evidence without reading the whole diff | false `supported` provenance, hidden answer, or irreducible attention cost |
| The developer exercises engineering judgment | pre-reveal Decision Future commitment can determine the integrated path | adjacent decision and recovery are scored independently | commitment is decorative, post-reveal, or does not alter integration |
| Challenges exercise control rather than recall | prediction, discriminating observation, actuation, and recovery are executable | a different fault in the same invariant/data path must be resolved | only the practiced mutation or remembered wording improves |
| The developer can take over if AI disappears | Operator Model and Takeover Envelope are frozen before transfer | regression-free adjacent task with answer-generating AI disabled | better explanation without better behavior |
| Participation remains voluntary | skip, late, abandonment, and attention-budget events are first-class and carry no penalty | voluntary return is measured | coercive gating, negative score, or misleading readiness claim |
| Almost all code may still be written by AI | no manual-code quota in Phase A; cold relay may implement a human directive | Phase B deliberately requires direct human editing because it tests AI disappearance | the product claim depends on typing volume rather than control |

“Every changed line is accountable” means deterministic reconciliation to a bounded semantic unit and an honest attribution state. It does not mean the human memorized every token.

## 3. Study boundary and entry gate

Enrollment may begin only after all of the following are true:

1. the two independent R7 ratings and adjudication clear the frozen expert gate;
2. R5/R6 implement all four conditions from one versioned runtime;
3. ADR-007, ADR-008, and ADR-009 schemas, hash domains, evidence authorities, timing rules, and invalidation rules are frozen;
4. held-out fixtures pass hidden-answer, production-isolation, line-reconciliation, and deterministic-oracle checks;
5. the protocol, analysis code, exclusions, minimum worthwhile effects, task pairs, and raw artifact hashes are frozen before condition outcomes are opened.

The pilot estimates feasibility and variance. A power analysis based on blinded pilot aggregates must freeze the confirmatory enrollment size. A small convenience sample cannot clear the product claim.

## 4. Participants and assignment

Recruit developers who already use an agentic coding tool for multi-file work. Record experience, TypeScript familiarity, agent-use frequency, and baseline task skill without treating seniority as a proxy for takeover ability.

Randomize before Phase A, stratified by:

- experience band;
- baseline AI reliance;
- baseline task-skill score.

Randomize fixture/task-pair order with a preregistered balanced schedule. Participants remain in their assigned condition for intention-to-treat analysis. Outcome reviewers receive de-identified artifacts without condition labels.

## 5. Four conditions

All conditions use the same agent model and version, task prompt, repository state, tests, documentation access, total production window, and token budget.

### A. Autonomous / Cursor-like

Full agent execution with normal progress, result, and diff access. No forced review and no PureFlow control episode. This arm measures natural autonomy throughput and exploratory delayed takeover.

### B. Active comparator

The same autonomous agent plus a fixed ten-minute post-hoc protocol: the same diff, a standardized explanation, and three preregistered questions. This represents the strongest ordinary “AI writes, human reviews” alternative without a control surface.

### C. Shadow control

The same autonomous agent plus:

- Intent Ledger navigation;
- an Executable Operator Model snapshot;
- one matched prediction, discriminating-observation, diagnosis, and recovery episode in a disposable twin.

The participant's choice cannot alter the production branch. This isolates executable control practice from live authority.

### D. Full PureFlow / Decision Futures

Everything in Shadow control plus one genuine Decision Future. Before any outcome or autonomous preference is revealed, the system freezes comparable alternatives, an autonomous default, evidence catalog, deadline, and integration rule. An on-time participant commitment can determine the integrated production path.

Late, skipped, defaulted, or counterfactual choices are recorded honestly and never upgraded to live-influence evidence.

Conditions B–D receive the same maximum ten minutes of active attention. The system may continue unrelated agent work while C or D is active. Speculative compute and any merge delay are reported separately from human attention.

## 6. Procedure

### Phase 0 — Baseline

Run a short unfamiliar-module pretest with no target answer. Record causal localization, task skill, AI reliance, and self-confidence. Do not teach the target invariant.

### Phase A — Agentic production

The participant directs the agent to implement a realistic multi-file feature. The technical oracle must accept the base, reject registered faults, and score the final patch without condition-dependent tests.

Record:

- regression-free completion and production critical-path time;
- total wall time, agent time, human active time, and interruption recovery;
- changed-line reconciliation and attribution states;
- Decision Future offer, commitment, deadline, default, and actual merge effect;
- speculative compute, discarded alternatives, and branch confusion;
- skip, late, hint, abandonment, and assistance behavior.

### Phase B — Delayed AI-off takeover

After 48 hours, within a preregistered ±4-hour window:

- hide the generation transcript and Phase-A explanations;
- disable answer-generating and code-generating AI;
- allow documentation, syntax reference, tests, debugger, and ordinary IDE navigation;
- give 45 minutes for a regression-free adjacent task;
- require direct human diagnosis and editing because this phase models AI disappearance.

The transfer task shares an invariant, dependency seam, or data path with Phase A but uses a different failure family and cannot be solved by replaying the practiced mutation.

### Phase C — Longer-delay subset

Repeat an equivalent adjacent task after 7–14 days for a preregistered subset. The 48-hour result is delayed transfer, not long-term retention. A four- to eight-week field pilot remains necessary for a sustained skill-preservation claim.

## 7. Outcomes and estimands

### Primary outcome

The primary estimand is the intention-to-treat risk difference between Full PureFlow and Active comparator in regression-free Phase-B completion within 45 minutes.

The confirmatory product gate requires:

- at least a 20 percentage-point improvement;
- a 95% confidence interval excluding zero;
- median Phase-A production critical-path slowdown no greater than 5%;
- p90 slowdown no greater than 10%;
- median active attention no greater than 10 minutes.

### Ordered mechanism tests

Run tests in the frozen order; do not promote a post-hoc winning contrast:

1. Full PureFlow versus Active comparator: does the combined product improve takeover?
2. Full PureFlow versus Shadow control: does real live authority add value beyond identical shadow practice?
3. Takeover Envelope versus self-confidence, diff exposure, and episode count: does the readiness model predict Phase-B behavior better?

The pilot must freeze the minimum worthwhile Full-versus-Shadow effect and the predictive calibration margin before confirmatory enrollment.

### Secondary outcomes

- time to first valid causal hypothesis;
- fault-localization accuracy;
- discriminating-evidence selection;
- recovery after an incorrect first move;
- blinded architecture explanation, reported separately from behavior;
- Intent Ledger navigation accuracy and time;
- `humanSelectionAffectedIntegration` rate;
- false-fork, late/default, skip, and abandonment rates;
- control-dividend reuse and stale-model detection;
- Brier score, calibration error, and discrimination for the Takeover Envelope;
- workload, preference, and voluntary next-episode budget.

Intent Ledger navigation and explanation quality are not skill outcomes. Confidence is a comparator, not evidence.

## 8. Analysis integrity

- Freeze task pairs, oracles, assignments, analysis code, exclusions, and artifact hashes before unblinding.
- Count missing primary outcomes as unsuccessful in the conservative primary analysis and publish a frozen sensitivity analysis.
- Report all conditions, tested outcomes, effect sizes, confidence intervals, assistance use, and deviations.
- Keep correctness and behavioral evidence separate from prose ratings.
- Use independent blinded reviewers for qualitative artifacts and publish agreement plus adjudication.
- Treat executable oracles as outcome authority; an LLM may annotate prose but cannot certify success.
- Report exact mutation/fault-family transfer separately from adjacent-family transfer.

## 9. Kill and narrowing rules

| Result | Required decision |
| --- | --- |
| Full PureFlow misses the primary transfer or speed gate | reject the current revolutionary-IDE claim; do not compensate with confidence or explanation scores |
| Full and Shadow are equivalent within the frozen worthwhile-effect margin | remove Decision Futures from the product core or retain them only as an optional agency feature |
| Shadow does not beat Active on behavior | narrow or remove the Operator Model/control-episode mechanism |
| Takeover Envelope does not predict better than confidence/exposure baselines | remove readiness and routing claims; expose only raw evidence |
| Any held-out line is falsely labeled `supported` by invented or circular provenance | stop enrollment and repair Intent Ledger evidence authority |
| Benefits occur only for the practiced mutation or fault family | reject transfer and narrow to rehearsal tooling |
| Branch confusion, false forks, or live-choice integrity failures exceed the frozen tolerance | disable live integration authority until corrected |
| Voluntary use collapses after novelty | remove gamification/frequency pressure and reassess the mechanism before field expansion |
| Only immediate recall or explanation improves | classify the feature as a tutor, not a skill-preserving agentic IDE |

Pilot observations set variance and tolerance values; tolerances cannot be chosen after confirmatory condition labels are opened.

## 10. Instrumentation contract

Export de-identified event envelopes, not raw repository content, by default:

```text
intent_ledger.opened
intent_ledger.unit_selected
intent_ledger.evidence_opened
operator_model.snapshot
takeover_envelope.snapshot
decision_future.offered
decision_future.committed
decision_future.integrated
decision_future.auto_defaulted
decision_future.skipped
decision_future.late
experience.started
prediction.recorded
evidence.requested
intervention.applied
judge.completed
experience.abandoned
transfer.started
transfer.completed
```

Each event carries a local participant pseudonym, condition, timestamp, scoped capability, revision and schema digests, and bounded outcome fields. Raw code, prompts, prose, paths, and transcripts stay local unless the participant explicitly consents to a separately enumerated research export.

## 11. Consent and non-coercion

- Explain the AI-off phase, live-decision authority, data categories, withdrawal, and deletion before consent.
- Never attach the Takeover Envelope, streaks, or episode history to employer evaluation or a public leaderboard.
- Skipping an episode does not block agent execution, lower a public score, or imply incompetence.
- Keep project-scoped evidence time-stamped, deletable, and exportable by the participant.
- Report adverse events, accidental production edits, and integrity failures even when the final task passes.

## 12. Claim boundary

Passing this study would support a bounded claim that the tested PureFlow mechanism improved 48-hour adjacent-project takeover under the tested tasks and population while staying inside the specified production cost. It would not prove general intelligence, permanent skill retention, security correctness, or transfer across languages and domains.

Only a later four- to eight-week field study on participants' own repositories can test whether the effect survives novelty and predicts real project takeover.

## Research anchors

- Anthropic, “How AI assistance impacts the formation of coding skills,” 2026: <https://www.anthropic.com/research/AI-assistance-coding-skills>
- Lee et al., “The Impact of Generative AI on Critical Thinking,” CHI 2025: <https://www.microsoft.com/en-us/research/publication/the-impact-of-generative-ai-on-critical-thinking-self-reported-reductions-in-cognitive-effort-and-confidence-effects-from-a-survey-of-knowledge-workers/>
- Nishal et al., “Helping Me Versus Doing It for Me,” CHI 2026: <https://www.microsoft.com/en-us/research/publication/helping-me-versus-doing-it-for-me-designing-for-agency-in-llm-infused-writing-tools-for-science-journalism/>
