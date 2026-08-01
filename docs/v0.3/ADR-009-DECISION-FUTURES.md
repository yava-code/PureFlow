# ADR-009 — Decision Futures and the Takeover Envelope

- **Status:** Proposed; implementation gated by the complete R7 expert audit
- **Date:** 2026-08-01
- **Deciders:** repository owner after R7 adjudication
- **Extends:** ADR-001, ADR-007, and ADR-008

## Context

PureFlow already separates autonomous software production from human readiness work:

- the Intent Ledger accounts for the generated artifact;
- the Executable Operator Model records behavior the developer has demonstrated;
- shadow control and Takeover Twins exercise prediction, diagnosis, intervention, and recovery without stopping the production swarm.

One gap remains. Most shadow-control actions happen beside production. They can prove that the developer understood or controlled a seam, but they do not necessarily give the developer real authority over what the product becomes. If every consequential decision is still made by an agent and the human only practices on a copy, the system risks creating a competent simulator operator who no longer makes engineering decisions in the live project.

ADR-001 names speculative live steering but does not define an executable protocol. It has no honest answer to these questions:

- Was there a real architectural fork or a manufactured quiz?
- Did the developer's commitment actually determine the integrated path?
- How long could agents continue before a decision was needed?
- What happens if the human responds late or skips?
- How is the interruption timed and justified?
- How does one live decision change the future autonomy policy?

The final product needs an autonomy mechanism in which agents retain implementation speed while the developer retains causal and architectural authority.

## Decision

PureFlow will represent selected high-leverage live forks as **Decision Futures**. A Decision Future is a bounded interval during which agents speculatively execute viable alternatives while unrelated production work continues. The developer may commit a prediction, choose discriminating evidence, and select or conditionally direct the path before a controller-owned integration deadline.

```text
real unresolved fork
        │
        ▼
Decision Future opens
        ├────────► agent branch A ── test / trace / benchmark
        ├────────► agent branch B ── test / trace / benchmark
        └────────► unrelated swarm work continues
                         │
                         ▼
              low-cost human breakpoint
              predict → inspect → decide
                         │
              ┌──────────┴──────────┐
              │ before deadline     │ late / skipped
              ▼                     ▼
       choice controls merge    autonomous policy merges
              │                     │
              ▼                     ▼
     live decision evidence    optional counterfactual twin
              └──────────┬──────────┘
                         ▼
             Operator Model + Intent Ledger
                         ▼
                 Takeover Envelope
```

Agents may write every implementation line in every alternative. The human contribution is the scarce part automation otherwise removes: a pre-reveal causal model, evidence strategy, trade-off decision, and recovery policy.

### Decision Future protocol

1. **Detect.** The Flight Recorder finds a natural disagreement, plan revision, constraint conflict, near miss, or unresolved high-leverage trade-off.
2. **Qualify.** The compiler verifies that at least two alternatives are viable, behaviorally distinguishable, and safe to execute in isolated worktrees or twins.
3. **Precommit autonomy.** The controller records the default autonomous policy, integration deadline, reversible boundary, allowed evidence, and what unrelated work may continue.
4. **Execute speculatively.** Build agents implement and test alternatives without waiting for the human.
5. **Offer at a breakpoint.** The cockpit waits for an existing low-cost boundary such as an agent checkpoint, test completion, task switch, or explicit developer availability signal.
6. **Commit before reveal.** The developer predicts a consequence or chooses the observation that would separate alternatives before the decisive result is exposed.
7. **Exercise authority.** A valid on-time commitment selects an existing alternative or bounded conditional directive. The controller, not the model, performs integration.
8. **Join evidence.** The judge records whether the decision affected production, whether the prediction matched behavior, what recovery was needed, and which control dividend survived integration.

### A real fork, not generated theatre

A Decision Future is eligible only when:

- the alternatives arose from the current task, agent disagreement, evidence mismatch, or a controller-derived adjacent design;
- both alternatives satisfy a frozen minimum validity suite before comparison;
- at least one observable consequence can discriminate between them;
- choosing between them would change a behavior, boundary, failure envelope, operating cost, or recovery path;
- the expected decision value justifies the human attention cost;
- final integration can be delayed within a declared bound while unrelated work continues.

Two cosmetically different patches, an obviously inferior decoy, or alternatives that produce the same relevant behavior are not a Decision Future. The compiler must abstain rather than manufacture agency.

### Timing modes

| Outcome | Production behavior | Evidence meaning |
| --- | --- | --- |
| `live-steering` | on-time human commitment determines the integrated alternative | may create human decision evidence after executable judging |
| `counterfactual` | autonomous integration already occurred; the human decision runs in a twin | may create capability evidence, never retroactive production influence |
| `auto-default` | no valid commitment arrived; the precommitted policy chooses | no human decision evidence |
| `skipped` | user explicitly declines; the precommitted policy chooses | skip is recorded only for scheduling, not readiness |
| `failed-integrity` | authority, hash, deadline, or evidence binding is invalid | no integration or readiness claim from the session |

The deadline is not a countdown dark pattern. It is the technical point after which keeping speculative branches alive would exceed the declared latency or compute budget. The UI shows the default action and consequence of waiting.

### Low-cost initiative transfer

PureFlow does not interrupt on a timer. The router estimates:

```text
expected control value
− interruption and resumption cost
− speculative compute cost
− integration-delay risk
```

It offers a Decision Future only when the result is positive under the user's session attention budget. The first implementation remains deterministic and explainable. Learning a personal interruption policy is a later experiment and cannot use hidden surveillance signals.

Useful breakpoints include:

- the developer just completed or switched a task;
- the active agent is waiting for tests or external I/O;
- a stable checkpoint has landed and the next action has not started;
- the developer opened the cockpit or explicitly requested a control opportunity.

Continuous popups, random functions, engagement streaks, and notifications during active typing are excluded from the core protocol.

## Takeover Envelope

The vehicle analogy needs two distinct operating domains:

```text
Autonomy Envelope = where agents can currently execute with accepted software evidence
Takeover Envelope = where the human has current executable control and transfer evidence
```

PureFlow does not collapse either envelope into one percentage. It presents the critical seams and the relationship between them:

| Seam state | Meaning |
| --- | --- |
| `autonomous-and-covered` | agents can operate and the human has fresh takeover evidence |
| `autonomous-human-stale` | agents can operate but prior human evidence no longer matches the source or control surface |
| `autonomous-uncovered` | agents can operate; no current human recovery evidence exists |
| `human-controlled-only` | the human has evidence but the autonomous path is unsupported or failing |
| `unsupported` | neither plane has accepted evidence |

Full agentic coding is still allowed in `autonomous-uncovered` areas unless the user explicitly configures a high-risk team policy. PureFlow simply refuses to claim that takeover readiness exists there.

Decision Futures shrink the highest-value divergence between the two envelopes by letting the developer make a real live decision. Shadow control and delayed transfer verify that the decision was not a one-time recognition event.

## Proposed contracts

These shapes remain non-normative until acceptance. Final contracts require strict internal/participant projections, controller-owned authorities, deterministic ordering, RFC 8785 canonicalization, and domain-separated hashes.

```ts
type DecisionReason =
  | "agent-disagreement"
  | "plan-revision"
  | "constraint-conflict"
  | "evidence-mismatch"
  | "near-miss"
  | "uncovered-control-route";

interface DecisionAlternative {
  id: string;
  snapshotTreeHash: string;
  behaviorClaimHash: string;
  evidenceIds: string[];
  judgeSpecHash: string;
  reversible: boolean;
}

interface DecisionFuture {
  schemaVersion: 1;
  id: string;
  projectId: string;
  baseTreeHash: string;
  intentDeltaHash: string;
  operatorModelDeltaHash: string;
  reason: DecisionReason;
  alternatives: DecisionAlternative[];
  availableEvidenceIds: string[];
  defaultPolicyId: string;
  openedAt: string;
  integrationDeadline: string;
  maxActiveSeconds: number;
  authorityHash: string;
  futureHash: string;
}

interface DecisionCommitment {
  schemaVersion: 1;
  futureHash: string;
  selectedAlternativeId?: string;
  selectedExperimentId?: string;
  predictionRef: string;
  conditionalDirectiveRef?: string;
  disclosedEvidenceIds: string[];
  committedAt: string;
  commitmentHash: string;
}

type DecisionOutcomeMode =
  | "live-steering"
  | "counterfactual"
  | "auto-default"
  | "skipped"
  | "failed-integrity";

interface DecisionOutcome {
  schemaVersion: 1;
  futureHash: string;
  commitmentHash?: string;
  mode: DecisionOutcomeMode;
  integratedAlternativeId: string;
  humanSelectionAffectedIntegration: boolean;
  judgeResultHash?: string;
  controlDividendHash?: string;
  outcomeHash: string;
}

interface TakeoverEnvelopeSnapshot {
  schemaVersion: 1;
  projectId: string;
  sourceTreeHash: string;
  autonomyEvidenceHash: string;
  operatorModelSnapshotHash: string;
  seamStates: Array<{
    seamId: string;
    state:
      | "autonomous-and-covered"
      | "autonomous-human-stale"
      | "autonomous-uncovered"
      | "human-controlled-only"
      | "unsupported";
    reasonCodes: string[];
  }>;
  snapshotHash: string;
}
```

Free-form text from a participant or model cannot become a branch name, command, path, environment value, judge, deadline, or integration instruction. A conditional directive is interpreted only by a context-starved executor inside the existing sandbox boundary; its patch must pass the same controller-owned judge before becoming a candidate.

## User experience

The cockpit explains why the decision is worth attention and what happens if the developer ignores it:

```text
Agents found a real auth boundary fork

A · retry outside idempotency lock
    current tests pass · lower lock time · duplicate-write risk unknown

B · retry inside idempotency lock
    current tests pass · simpler recovery · higher contention

Autopilot default in 7 min: A
Both branches are already being tested. Other agents keep working.

Before the duplicate-delivery replay is revealed:
Which result would make you reject A?

[Commit prediction] [Choose another observation] [Let autopilot decide]
```

After judging:

```text
Your on-time decision selected B and determined the integrated path.
The replay confirmed your predicted duplicate-write boundary.

Created control dividend: duplicate-delivery regression probe
Takeover envelope updated: auth/idempotency — immediate evidence only
Delayed adjacent recovery still required.
```

A late response uses different copy:

```text
Autopilot already integrated A under the declared policy.
Your choice can still run as a counterfactual, but it cannot count as live influence.
```

## Interaction with existing architecture

- **Flight Recorder** supplies observable disagreements, evidence changes, and timestamps.
- **Intent Ledger** binds alternatives to the same committed goal and exposes intent drift.
- **Controllability Compiler** requires each alternative to expose `observe → actuate → recover` handles.
- **Executable Operator Model** determines which decision would reduce a real human-control gap.
- **Decision Future** grants bounded live authority without requiring manual code.
- **Takeover Twin** preserves counterfactual and late-decision value off the production path.
- **Evidence Judge** decides consequences; a Side Coach never decides correctness.
- **Control Dividend** turns the human's attention into a reusable project artifact.
- **Takeover Envelope** makes the autonomy/readiness mismatch explicit for future routing.

## Integrity rules

### Precommitted default

The autonomous policy and deadline are frozen before the participant projection opens. The controller cannot change the default after seeing the human's commitment.

### Comparable alternatives

All visible alternatives must pass the same declared minimum validity suite. Missing, failing, or incomparable evidence is visible and may force abstention.

### No retroactive influence

`humanSelectionAffectedIntegration` can be true only when a valid commitment preceded the deadline and the controller's integration record names that commitment. A later matching opinion cannot be upgraded.

### No rubber-stamp evidence

Selecting an alternative after decisive evidence is revealed, accepting the autonomous default, or approving an agent plan creates no decision evidence. The protocol requires a pre-reveal prediction or evidence strategy.

### No production corruption

Speculative alternatives use isolated worktrees. Only the controller may integrate a candidate after the required software checks. Abandonment and cleanup must preserve production refs, worktree state, and the prior stable checkpoint.

### No hidden compulsion

Budget `0`, explicit skip, timeout, or notification dismissal preserves full autonomous operation and creates no negative developer score. Required human approval exists only under a separately configured high-risk team policy.

## Validation plan

### Technical acceptance

1. Replaying identical inputs produces byte-identical future, commitment, outcome, and envelope hashes on Windows and Linux.
2. The autonomous default, deadline, alternatives, and evidence catalog are immutable after the participant projection opens.
3. A late, replayed, cross-project, cross-tree, or post-reveal commitment cannot yield `live-steering`.
4. `humanSelectionAffectedIntegration` is true only when the merge record references the on-time commitment and selected alternative.
5. Skip and budget `0` leave production agents running and create no readiness evidence.
6. A false fork with equivalent behavior, an invalid alternative, or no discriminating observation produces abstention.
7. Every speculative worktree is removed and the production repository remains byte-for-byte invariant except for the controller-selected integration.
8. The Takeover Envelope changes only from accepted autonomy evidence and Operator Model evidence; interaction counts and confidence cannot alter it.

### Mechanism experiment

Compare three conditions on the same real agent-produced forks:

1. autonomous default plus post-hoc explanation;
2. shadow prediction with no production influence;
3. Decision Future with bounded live influence.

Primary outcome: delayed adjacent takeover success per active human minute. Secondary outcomes: production critical-path time, valid live-influence rate, prediction calibration, discriminating-experiment quality, recovery after a wrong first decision, control-dividend reuse, skip/late rate, interruption acceptance, speculative compute, and software quality.

The automatic policy remains a comparator. A human decision is not presumed superior. The product hypothesis is that exercising real decision ownership improves later takeover without erasing agentic speed.

Freeze the corpus, thresholds, default policy, timing rule, alternative-validity suite, adjudication procedure, and non-inferiority margin before revealing held-out outcomes.

### Falsifiers

Reject or narrow this decision if a preregistered study shows:

- genuine behaviorally distinct forks are too rare to sustain the mechanism;
- users mostly rubber-stamp the default or respond only after decisive evidence;
- live influence does not improve delayed takeover over shadow prediction alone;
- interruption and branch cost erase the production-speed benefit;
- the automatic policy matches or beats the human condition on both software and delayed-transfer outcomes;
- human choices affect integration but produce no reusable control artifacts;
- developers reduce their attention budget to zero after novelty fades;
- the Takeover Envelope does not predict blackout-recovery performance;
- meaningful results require blocking every merge or manufacturing inferior decoys.

## Prior-art boundary

Mixed-initiative interaction, adjustable autonomy, speculative execution, and interruption management are established fields. NASA human-autonomy work specifically recommends negotiated decisions and greater interaction to reduce out-of-the-loop situation-awareness loss. Research on collaborative interruptions shows that timing and perceived benefit influence whether people accept an interruption. Recent professional-agency research also distinguishes automating execution from retaining human judgment.

PureFlow does not claim novelty for any one of those ideas. The proposed contribution is their software-development combination:

> agents speculatively implement real alternatives + the human commits before reveal + an on-time choice controls integration + executable consequences update a project-specific takeover envelope + delayed transfer tests whether control survives later

No reviewed mainstream AI IDE documents that complete loop. This is a bounded landscape statement, not proof of global or patent novelty.

## Options considered

### A. Ask the developer to approve every plan

High interruption cost, easy to rubber-stamp, and no evidence that the approval changed an outcome.

### B. Ask random questions while the agent works

May support recall, but does not exercise engineering authority and can become engagement theatre.

### C. Run only off-path takeover rehearsals

Useful for diagnosis and recovery, but all live product decisions remain delegated.

### D. Block final integration until a human reviews the diff

Restores the code-review bottleneck and makes throughput depend on passive inspection.

### E. Decision Futures plus a Takeover Envelope — selected

Preserves autonomous implementation and unrelated progress while giving a small number of human decisions real, measurable production authority.

## Consequences

### Easier

- explain how the developer still makes consequential engineering decisions while agents write the code;
- use genuine agent disagreement as productive human work;
- separate live influence from practice and post-hoc agreement;
- time interactions around expected value instead of timers;
- show exactly where autopilot capability exceeds human takeover evidence.

### Harder

- alternatives must be genuinely comparable and safely isolated;
- speculative execution consumes compute and may delay one integration boundary;
- deadlines, defaults, and authority need tamper-evident contracts;
- some tasks have no honest design fork and must produce no interaction;
- long-term voluntary use requires human studies, not only compiler tests.

## Entry and implementation gates

This ADR does not authorize R5/R6 implementation. Before acceptance:

1. complete and adjudicate the two-rater R7 expert audit;
2. review ADR-007, ADR-008, and ADR-009 as one architecture;
3. freeze Decision Future projections, hash domains, alternative validity, deadline semantics, and integration authority in `CONTRACTS.md`;
4. compile one offline natural disagreement fixture with a false-fork negative control;
5. compare shadow-only and live-influence modes before expanding the cockpit;
6. run the delayed-transfer human pilot before claiming skill preservation.

## Research anchors

- Horvitz, [Mixed-Initiative Interaction](https://www.microsoft.com/en-us/research/publication/mixed-initiative-interaction/), 1999.
- Kamar, Gal, and Grosz, [Modeling Information Exchange Opportunities for Effective Human-Computer Teamwork](https://www.microsoft.com/en-us/research/publication/modeling-information-exchange-opportunities-for-effective-human-computer-teamwork/), 2013.
- Iqbal and Horvitz, [Conversations Amidst Computing](https://www.microsoft.com/en-us/research/publication/conversations-amidst-computing-a-study-of-interruptions-and-recovery-of-task-activity/), 2007.
- NASA, [Understanding Human Autonomy Teaming Through Applications](https://ntrs.nasa.gov/api/citations/20170010163/downloads/20170010163.pdf), 2017.
- Nishal et al., [Helping Me Versus Doing It for Me](https://www.microsoft.com/en-us/research/publication/helping-me-versus-doing-it-for-me-designing-for-agency-in-llm-infused-writing-tools-for-science-journalism/), 2026.
- Buçinca, Malaya, and Gajos, [To Trust or to Think](https://doi.org/10.1145/3449287), 2021.

These sources motivate negotiated authority, pre-reveal engagement, and interruption-aware scheduling. They do not validate Decision Futures or prove programming-skill preservation.
