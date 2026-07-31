# Architecture Brainstorm and Selection

## Selection question

What product mechanism can preserve agent-level throughput while creating project-specific engineering skill that survives an AI-off takeover?

The concepts below are deliberately different mechanisms, not feature variants. Scores are product judgments used to make the decision explicit; they are not research results.

## Criteria

| Criterion | Weight | Meaning |
| --- | ---: | --- |
| Throughput preservation | 20% | Production agents keep most of their speed advantage |
| Causal practice | 25% | Human performs prediction, diagnosis, intervention, and recovery |
| Transfer potential | 15% | Mechanism plausibly helps on an adjacent real task later |
| Measurability | 15% | Outcome can be judged with behavior and executable evidence |
| Differentiation | 10% | Combination is not already a standard AI IDE feature |
| Feasibility | 10% | A narrow useful version can be built and tested |
| Low burden | 5% | Interaction can remain voluntary and non-annoying |

Each criterion is scored from 1 to 5. The weighted total is a comparison aid, not a precision measurement.

Transfer and differentiation scores are explicit hypotheses pending the controlled study and a reproducible prior-art review; they are not evidence of efficacy or legal novelty.

## A. Comprehension gate

The agent stops after a patch and asks the developer to explain selected code or answer questions before continuing.

**Strengths**

- simple to build;
- retrieval can improve memory;
- catches obvious false confidence.

**Failure mode**

It blocks the production path, exercises mostly recall, and is easy to optimize for the prompt. Claude Learning and Comprende already occupy this territory.

## B. Strategic manual seams

The AI implements most of a task but assigns selected functions or architectural decisions to the developer.

**Strengths**

- creates real generation practice;
- straightforward within an agent workflow;
- gives the developer code-level contact.

**Failure mode**

The human becomes a slow dependency. The assigned seam may be trivial, and typing a function does not necessarily exercise debugging or recovery. Claude Learning already implements the basic `TODO(human)` primitive.

## C. Proof-carrying generation

Every generated semantic unit links to intent, assumptions, invariants, tests, traces, and affected dependencies. The developer navigates claims instead of a 2,000-line diff.

**Strengths**

- preserves full automation;
- makes generated work inspectable and supplies a durable system map;
- can expose untested or unexplained areas.

**Failure mode**

Traceability is not mastery. A person can ignore a beautiful graph as easily as a diff. This is necessary infrastructure but insufficient as the learning mechanism.

## D. Project incident gym

PureFlow periodically injects realistic faults into a branch of the developer's project. The developer diagnoses and fixes them without code generation.

**Strengths**

- exercises a complete operational loop;
- executable evidence makes outcomes measurable;
- closely targets takeover ability.

**Failure mode**

As a separate scheduled game it competes with real work, can feel punitive, and can become a catalog of mutation tricks. Buggr and reliability GameDays already prove the primitive exists.

## E. Readiness-based autonomy dial

The agent router delegates more or less work based on scoped evidence that the developer can handle the affected module or concept.

**Strengths**

- connects human capability to actual orchestration;
- can allocate attention to weak, important seams;
- creates a natural progression from guidance to ownership.

**Failure mode**

Without a strong way to produce evidence, the router becomes a score-driven manual-work quota. It can also feel coercive if it blocks autonomous execution.

## F. Dual-output Experience Compiler

The production swarm builds normally. In parallel, the IDE compiles a high-value part of the same live change into an executable Takeover Twin. The developer acts in the twin; deterministic evidence updates a readiness map; the router uses that map on later work.

This combines four supporting mechanisms:

- evidence-carrying generation supplies attribution and seam candidates;
- an attention scheduler chooses the smallest valuable human episode;
- executable fault/counterfactual practice produces behavioral evidence;
- a readiness-based router closes the loop with future delegation.

**Strengths**

- keeps training off the production critical path;
- exercises actual control rather than passive review;
- draws directly from the current project and change;
- produces measurable, scoped evidence;
- can adapt to junior and senior users.

**Failure mode**

It is the hardest concept to implement. Automatic scenario synthesis may be brittle, test evidence may be wrong, and the twin can still feel like homework if the selector is poor.

## Scorecard

| Concept | Throughput | Causal practice | Transfer | Measure | Diff. | Feasible | Low burden | Weighted / 5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A. Comprehension gate | 4 | 1 | 1 | 1 | 1 | 5 | 3 | 2.10 |
| B. Strategic manual seams | 2 | 4 | 3 | 3 | 1 | 5 | 2 | 3.00 |
| C. Proof-carrying generation | 5 | 2 | 2 | 3 | 4 | 3 | 5 | 3.20 |
| D. Project incident gym | 4 | 5 | 4 | 5 | 3 | 3 | 2 | 4.10 |
| E. Readiness-based autonomy dial | 4 | 4 | 4 | 3 | 4 | 2 | 3 | 3.60 |
| F. Dual-output Experience Compiler | 5 | 5 | 4 | 5 | 4 | 2 | 4 | **4.40** |

## Decision

Select **F. Dual-output Experience Compiler** as the product thesis.

Use C, D, and E as subsystems, not separate products:

```text
evidence-carrying change graph
          ↓
attention scheduler selects one seam
          ↓
Takeover Twin creates a real control episode
          ↓
executable judge produces scoped evidence
          ↓
readiness router changes future delegation
```

Do not make A or B the default product loop. Questions, explanations, or a small manual seam may appear inside a compiled experience when they serve a complete causal loop.

## Why this is not “Buggr plus Cursor”

Bug injection is only one possible experience backend. The architecture differs in five linked ways:

1. the scenario is derived from the agent's current semantic change, not selected as a separate game;
2. production agents continue working in parallel;
3. the selector chooses the seam from readiness and future takeover value;
4. the episode may be prediction, counterfactual steering, diagnosis, intervention, or recovery—not only a seeded bug;
5. delayed evidence influences later task delegation.

Removing any two of those links risks collapsing the product into an existing category.

## Alternative interaction ideas worth testing

These are candidate experience formats, not commitments:

- **Hidden-answer replay:** replay the agent run up to a meaningful fork and ask the developer to choose evidence or an intervention before revealing the agent's path.
- **Counterfactual branch:** execute two architectural choices against the same constraints and ask the developer to predict where they diverge.
- **Speculative live steering:** agents implement viable alternatives concurrently; the developer's evidence-backed choice selects the branch that actually enters production while other swarm work continues.
- **Mutation from intent:** mutate the invariant introduced by the current patch rather than applying a generic syntax mutation.
- **Cold-agent direction:** give a fresh agent only the evidence the developer requests; score the developer's diagnosis and instructions rather than manual typing.
- **Recovery ladder:** begin with a trace, then progressively reveal symbol, file, and candidate hypotheses as hints are requested.
- **Future-self handoff:** after a delay, present the developer's own project as an unfamiliar incident with the original generation transcript hidden.
- **Real intervention credit:** if the developer's twin solution is better and passes the production evidence, allow it to replace the agent solution through a normal reviewed merge.

## July 2026 mechanism refresh

The next concepts change where the experience comes from and what the human controls. They are not extra quiz formats.

### Agent near-miss replay

Prefer an agent's real failed hypothesis, red test, rollback, or abandoned implementation branch over a synthetic mutation when the Chronicle contains one. PureFlow rewinds to the first observable divergence, escrows the later repair, and asks the developer to choose evidence and recover the checkpoint.

This is more project-authentic than a generic seeded bug and makes routine agent self-repair produce operator practice as a second output. It also reduces mutation-pattern gaming. The risk is selection bias: clean first-pass runs produce no near miss, and a failed agent path may be irrelevant rather than instructive. Synthetic change-derived mutations remain the fallback.

**Status:** promote to an R1 Chronicle and R7 corpus hypothesis. Adding intermediate checkpoint revisions requires a versioned Chronicle contract change before implementation.

### Evidence escrow

The controller stores the successful trace, repair, and decisive observation but initially exposes only the symptom and a bounded evidence index. The developer requests the next test, log, trace, symbol, or counterfactual. Assistance progressively reveals evidence, not a prose solution.

This restores the information-acquisition and diagnosis stages that agent explanations normally collapse. Requested evidence becomes observable behavior for later calibration; merely opening a diff does not.

**Status:** promote as the default interaction policy for recovery episodes after the protected judge exists. It must never hide production incident evidence or block normal delivery.

### Decision-stage rotation

Automation can remove information acquisition, analysis, option selection, and implementation separately. Rather than repeatedly testing code recall, the scheduler rotates the irreducible human action across those stages: choose evidence, rank causes, select a lever, predict a consequence, or direct a cold agent.

**Status:** test as an episode-family factor. Rotation occurs only inside eligible high-value seams and does not guarantee equal quotas.

### Control reserve

Expose a local forecast of which project boundaries have fresh recovery and transfer evidence, which are stale, and which have never been exercised. This is closer to an aircraft's operational envelope than a developer score: it answers “where could I plausibly take over?” and always shows the underlying attempts, age, assistance, and uncertainty.

**Status:** naming and visualization hypothesis for R5/R6. It cannot exist before the corpus gate and must not collapse evidence into a global number.

### Learned autonomy policy

A later router could learn when to offer no intervention, evidence escrow, a recovery twin, live steering, or a delayed transfer task while jointly optimizing software throughput, human attention, opt-out, and later takeover. Current adaptive-support research shows that optimizing immediate accuracy and optimizing learning are not interchangeable.

**Status:** defer until after a longitudinal pilot. R0–R8 use an inspectable deterministic policy; engagement alone is never the reward.

## Refined priority

The preferred episode-source order is now:

```text
real agent near miss
→ real unresolved design fork
→ change-derived counterfactual
→ intent-derived mutation
→ no episode when evidence is weak
```

This is a meaningful constraint: PureFlow should sometimes produce nothing rather than manufacture an easy question. The common interaction is evidence escrow plus executable recovery; a random function explanation remains only an experiment baseline.

## Naming decision

Avoid `Shadow Workspace`; Cursor already uses it for an AI validation environment.

Working vocabulary:

- **Dual-Control Development** — the category;
- **Experience Compiler** — the mechanism;
- **Takeover Twin** — the disposable executable environment for the human;
- **Readiness Plane** — the evidence and scheduling subsystem;
- **Control Episode** — one human prediction-to-consequence loop.

Names remain hypotheses until user interviews test whether they communicate value without sounding like surveillance or training software.
