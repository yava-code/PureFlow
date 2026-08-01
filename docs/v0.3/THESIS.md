# Thesis: Preserve Control, Not Keystrokes

## Status

This document states the causal hypothesis behind PureFlow v0.3. It is a research position, not evidence that the product works.

## The category error in current tools

Most proposed responses to AI skill loss operate on the generated artifact:

- inspect the diff;
- read an explanation;
- answer questions about the code;
- approve a plan;
- manually fill a small `TODO`;
- write a fixed percentage of the implementation.

Those mechanisms can be useful. They do not restore the activity that automation removed.

Engineering skill is expressed through closed-loop control of a changing system:

```text
form a model
→ predict what the system will do
→ choose evidence
→ locate the cause
→ intervene
→ observe the consequence
→ recover or refine the model
```

An autonomous coding agent can now perform every stage. A human who reads its result is informed, but remains out of the causal loop.

## Causal hypothesis

```text
Agent owns acquisition, analysis, decision, implementation, and repair
        ↓
Human receives finished artifacts and explanations
        ↓
Fewer project-specific predictions, errors, interventions, and recoveries
        ↓
Weaker and less calibrated mental models
        ↓
Reduced ability to diagnose or change the system during an AI-off takeover
```

No longitudinal study currently proves this full chain for professional agent-native development. The hypothesis is supported indirectly by automation research, learning research, and early coding-specific experiments. It must remain falsifiable.

## What should remain human-owned

Not every line and not every feature. The developer needs a repeated sample of complete control experiences on the most important causal seams.

At minimum, a useful episode contains:

1. **Prediction before reveal** — the developer commits to expected behavior, an invariant, or a likely failure.
2. **Evidence acquisition** — they decide what test, trace, log, dependency, or runtime state to inspect.
3. **Diagnosis** — they construct and rank causal hypotheses.
4. **Intervention** — they choose or implement a control action.
5. **Observed consequence** — the action runs in an executable environment.
6. **Recovery** — an incomplete or wrong first action can be corrected.
7. **Delayed transfer** — later, they solve an adjacent case without replaying the answer.

The agent can fully own scaffolding, boilerplate, mechanical edits, formatting, fixture creation, command execution, and implementation after a strategy is chosen. Skill is not proportional to the number of characters typed.

## Why the obvious mechanisms are insufficient

### Diff review

Diff review is quality control after the solution structure is visible. It creates no pre-reveal prediction, no chosen intervention, and usually no consequence tied to the reviewer’s own model. It also scales poorly as autonomous agents increase patch volume.

Diff review remains in the product for code quality. It is not the learning engine.

### Explanations

Explanations can correct a model, but a ready-made causal story can create familiarity without reconstructability. Explanation is most useful after an attempt, when it resolves a specific mismatch between prediction and observed behavior.

### Questions and quizzes

Retrieval questions can improve retention. They usually exercise recall or recognition, not evidence selection, intervention, and recovery. Questions may appear inside an episode, but a question count or comprehension score cannot establish takeover readiness.

### Plan approval

Approval is cheap to rubber-stamp, especially while several agents are running. A real design fork becomes useful only when the developer predicts trade-offs and later sees evidence from the chosen or counterfactual path.

### Decision Futures

PureFlow converts a small number of genuine live forks into bounded Decision Futures. Agents implement alternatives speculatively and continue unrelated work. Before decisive evidence is revealed, the developer predicts a consequence, chooses a discriminating observation, and may determine the branch that is actually integrated. A late or skipped choice never receives retroactive live-influence credit.

This is the missing link between practice and ownership: the human makes the causal or architectural decision while the AI retains implementation work. Shadow control remains necessary for recovery practice, but it cannot substitute for all live authority.

### Manual coding quotas

A fixed quota puts human work on the critical path and can allocate it to trivial glue. One five-minute diagnosis of a high-blast-radius invariant may create more useful ownership than manually typing hundreds of predictable lines.

### Generic exercises

LeetCode and generic tutorials may train valuable skills, but they do not establish a mental model of the current repository. PureFlow experiences must inherit the symbols, dependencies, tests, constraints, and failure modes of live project work.

## The new primitive: an Experience Compiler

A normal compiler converts a specification into executable software. PureFlow adds a compiler that converts an autonomous agent run into a minimal executable human experience.

Its input is:

- user intent;
- agent action events;
- semantic code changes;
- tests, traces, benchmarks, and failures;
- project topology;
- existing, time-scoped readiness evidence;
- a human attention budget.

Its output is not prose. It is a Takeover Twin with a hidden answer, a task, an evidence oracle, and a defined capability being exercised.

```text
agent run + project evidence + readiness state
                    ↓
             semantic seam selection
                    ↓
     executable prediction / fault / counterfactual
                    ↓
       human action + deterministic consequence
                    ↓
            scoped readiness evidence
```

## Why it runs in parallel

Active practice costs attention. Pretending otherwise would make the thesis dishonest.

Parallel execution changes where that cost lands:

- the production swarm continues building and testing;
- the human operates on a disposable twin at the same time;
- normal merging is not blocked by default;
- the episode can use otherwise idle wait time;
- the developer controls a session-level attention budget.

Parallelism preserves throughput. It does not cause learning by itself. The episode must still contain prediction, intervention, executable feedback, recovery, and later transfer.

## Operational definition of ownership

“Understand every line” is not measurable and is not how engineers usually operate in large systems. PureFlow separates two properties:

### Accountability of the artifact

Every changed line is either covered by a supported semantic unit with available provenance or visibly unattributed. PureFlow must not infer a convincing invariant for a line when the build plane and executable evidence do not provide one.

ADR-008 makes this concrete as a bidirectional Intent Ledger. Agent-emitted intent links are untrusted claims; the ledger independently reconciles every changed line to a bounded semantic unit and labels the link `supported`, `claimed`, `unattributed`, `contradicted`, or `stale`. Derived artifacts may bind to a deterministic generation receipt. This creates navigable accountability without claiming that the developer read or memorized every token.

### Readiness of the operator

For a critical seam, the developer can:

- locate the behavior path;
- predict a meaningful consequence;
- select diagnostic evidence;
- safely modify the behavior;
- recover a failure;
- transfer the model to an adjacent task later.

The Takeover Envelope lists where those claims remain current and contrasts them with the Autonomy Envelope where agents can execute. Divergence is visible by critical seam; it is not hidden behind one readiness percentage.

The second property requires behavior, not self-report.

## What would falsify the thesis

The architecture should be rejected or materially changed if controlled pilots show any of the following:

- executable episodes improve only immediate quiz scores, not delayed AI-off tasks;
- a diff/explanation baseline achieves equal transfer with less attention;
- users consistently opt out because the episodes interrupt flow;
- automatically generated twins are too brittle to cover normal real-world changes;
- success is explained by memorizing mutation patterns rather than understanding adjacent behavior;
- production critical-path speed loses the advantage of autonomous agents;
- readiness evidence does not predict later takeover performance.

## Strongest honest product promise

> PureFlow keeps autonomous coding fast while continuously creating and checking the project-specific control experiences a developer needs to take over.

It does not promise that passive use preserves skill. It makes skill preservation an engineered output of the development system and gives that claim an executable test.
