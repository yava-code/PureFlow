# ADR-010 — Operator Projection and the Dual Source hypothesis

- **Status:** Proposed product hypothesis; not a fourth architectural subsystem
- **Date:** 2026-08-01
- **Deciders:** repository owner after R7 adjudication
- **Extends:** ADR-007, ADR-008, and ADR-009

## Context

PureFlow has mechanisms for three distinct problems:

- the Intent Ledger accounts for every generated line without requiring a full-diff review;
- the Executable Operator Model records project behavior the developer has demonstrated they can control;
- Decision Futures give selected pre-reveal human commitments real integration authority.

Together they are stronger than questions or explanations, but the product can still feel like a collection of instruments attached after code generation. The repository remains the only obvious source of truth. The human sees a projection of what agents changed, demonstrates control in isolated episodes, and occasionally chooses a live path, yet there is no single compact artifact that answers:

- What intent has the human committed before seeing the result?
- Which causal and architectural decisions have bounded control evidence?
- Which observations, actuators, and recovery paths make that belief executable?
- Where did implementation drift from those commitments?
- What useful project model remains if the agent transcript and model disappear?

A natural response is to make a DSL or natural-language specification the source of truth. That does not fit PureFlow. A domain DSL is expensive to introduce into arbitrary existing repositories, excludes behavior it cannot express, and tends to reduce the need for coding expertise rather than preserve it. Unstructured prose has the opposite problem: it is easy to generate and approve but cannot reliably constrain implementation or prove that it still matches behavior.

The product may need a human-scale projection that is executable but does not pretend to replace general-purpose code or become a competing source of truth.

## Decision

PureFlow will test a product metaphor in which an agentic project is shown through two coupled views:

1. **Software Source** — the complete files, dependencies, configuration, and tests executed by machines. Agents may write almost all of it.
2. **Operator Source** — the user-facing name for a compact, revision-bound `OperatorProjection` of human-committed intent, causal decisions, observable invariants, control handles, and recovery policies for critical seams.

There is one architectural evidence authority: the existing immutable event stream plus Intent Ledger, Executable Operator Model, Decision Future, and `VerifiedReadiness` derivation. A pure **Operator Projection Compiler** reads those inputs and renders Operator Source plus an Operator Delta. It owns no mutable facts, performs no general bidirectional synchronization, and cannot promote evidence. “Dual Source” is therefore a falsifiable product/category hypothesis, not the name of a fourth subsystem.

```text
human goal / pre-reveal commitment
             │
             ▼
   Operator Projection
 intent ─ decision ─ invariant ─ observe/actuate/recover
             │                         ▲
             │ forward obligations     │ executable evidence
             ▼                         │
       autonomous build plane ─────► Software Source
             ▲                         │
             └──── reverse deltas ─────┘
                  attributed / stale / contradicted / unknown
```

The category statement becomes:

> Hypothesis: PureFlow can let agents write the full machine source while maintaining an evidence-bound operator projection that shows where human commitments and bounded control agree with it, diverge, or remain unknown.

### Operator Source is not documentation

An Operator Projection node exists only when it is bound to controller-owned evidence and a revision. It may contain:

- a committed goal or bounded decision;
- a behavioral invariant with an executable observation;
- an architectural boundary and its permitted dependency direction;
- a discriminating experiment between viable causal models;
- an observation, actuator, and recovery route;
- a conditional policy committed before an outcome is revealed.

Free-form summaries, generated tours, README prose, hidden chain-of-thought, and unexecuted model claims cannot become evidence-backed Operator Source.

### Derived display states

The projection displays a state derived from referenced immutable events. It does not store or mutate an independent authority field:

| Display state | Derivation | May support human-readiness evidence? |
| --- | --- | --- |
| `proposed` | only an agent/compiler proposal exists | no |
| `committed` | a valid pre-reveal human commitment event exists | not by itself |
| `demonstrated` | scoped `CapabilityEvidence` supports the node at this revision | yes, within that evidence scope |
| `transferred` | the sole `VerifiedReadiness` derivation references a valid delayed adjacent result | yes, strongest bounded state |
| `stale` | a referenced source/evidence/control hash no longer matches | no current claim |
| `contradicted` | executable evidence contradicts the commitment | negative evidence |
| `unknown` | the projection cannot reconcile the inputs honestly | no |

Opening, reading, accepting generated prose, or spending time in the editor never changes the event stream or derived state. The UI must say “committed intent” and “current evidence of bounded control”; it must not infer a person's current belief or broad ownership.

### Forward compilation

When a new valid human commitment event is appended, the compiler produces a bounded `AgentObligationSet` rather than direct code:

- behaviors that must remain true;
- observations that must be preserved or added;
- allowed and forbidden dependency directions;
- recovery or rollback evidence required by the decision;
- unresolved ambiguity that requires a Decision Future or explicit autonomous default.

Agents remain free to choose implementation details. A human commitment does not become a shell command, file path, patch, test oracle, branch name, or merge instruction. The normal sandbox and judge boundaries still apply.

### Not a general bidirectional lens

The word “synchronized” does not imply an automatic `put(view) → source patch`. Updating a compact view of arbitrary code is underdetermined: many implementations can satisfy the same intent, and silently selecting one would give the representation false authority.

Operator Source therefore has a one-way event algebra:

1. a reverse `get` derives the current projection and Operator Delta from versioned source plus evidence;
2. `commit(proposalHash, baseProjectionHash, payload)` appends an immutable commitment or decision event only when `baseProjectionHash` still names the current projection; stale bases are rejected and shown for explicit rebase;
3. forward compilation emits obligations and unresolved choices;
4. agents propose implementations, and the normal judge plus Decision Future protocol determines what may integrate;
5. agent/judge results may satisfy, contradict, or stale a projection node, but never edit the human commitment event.

The controller serializes accepted commitment events per project and assigns a monotonic sequence number. Concurrent proposals may coexist; concurrent commits against the same base are accepted only when their declared semantic units do not overlap, otherwise the later commit must rebase. Projection conflicts are rendered as unresolved evidence, never last-write-wins truth.

No generic write-back transforms Operator Source prose directly into Software Source. This deliberately gives up the convenience of an editable architecture diagram in exchange for unambiguous authority and auditable consequences.

### Reverse reconciliation

After an agent checkpoint, the Intent Ledger maps every changed line to a semantic unit and current attribution. The pure Operator Projection Compiler then computes an Operator Delta:

- which projection nodes are still supported;
- which became stale or contradicted;
- which new behavior has no corresponding human-committed model or bounded control evidence;
- which mechanical/generated units are covered by reproducible receipts;
- which critical seam now exceeds the Takeover Envelope.

The reverse pass may propose a node. It cannot silently edit or promote Operator Source. This prevents the same model that wrote the code from authoring a convincing human belief after the fact.

### Human interaction

The developer does not maintain YAML or approve a specification document. PureFlow exposes the smallest pending Operator Delta at an event-driven breakpoint:

```text
Agent changed cache invalidation across 11 files.

Software Source says:
  tenant scope now participates in the cache key.

Operator Source gap:
  no demonstrated recovery route for cross-tenant contamination.

[Choose discriminating trace] [Open takeover twin] [Let agents continue]
```

The human action must be information-dense: select evidence, predict a consequence, choose a boundary, direct a cold executor, or recover an adjacent fault. Agents may continue writing code and executing unrelated work. Budget `0` preserves full autonomy and creates no fake ownership state.

### What “understanding every line” becomes

Literal memory of every physical line is neither scalable nor verifiable. The projection aims to preserve the stronger engineering properties behind that phrase:

- every changed line has an honest account in Software Source through the Intent Ledger;
- every critical behavior has an explicit, evidence-derived control state in the projection;
- the developer can navigate from a line to its intent, evidence, decision, and control surface;
- unsupported or machine-only areas remain visible rather than receiving an invented explanation;
- delayed executable takeover, not line recall, determines whether the model survived.

This is analogous to understanding a program at source level rather than memorizing generated assembly. It does not excuse opaque code: any line without honest attribution remains debt, and any critical seam without human control remains outside the Takeover Envelope.

## Non-normative contracts

These shapes clarify the decision. They must not enter `CONTRACTS.md` before the R7 gate and architecture review.

```ts
interface OperatorNode {
  schemaVersion: 1;
  nodeId: string;
  projectId: string;
  kind: "intent" | "decision" | "invariant" | "boundary" | "control-policy";
  createdByEventHash: string;
}

interface OperatorNodeProjection {
  schemaVersion: 1;
  nodeId: string;
  projectionHash: string;
  predecessorProjectionHash?: string;
  sourceTreeHash: string;
  displayState: "proposed" | "committed" | "demonstrated" | "transferred" | "stale" | "contradicted" | "unknown";
  statement: string;
  semanticUnitIds: string[];
  commitmentEventHash?: string;
  capabilityEvidenceHashes: string[];
  verifiedReadinessHash?: string;
  observeRefs: string[];
  actuateRefs: string[];
  recoveryRefs: string[];
  invalidatedByHashes: string[];
}

interface OperatorDelta {
  schemaVersion: 1;
  projectId: string;
  baseTreeHash: string;
  targetTreeHash: string;
  retainedProjectionHashes: string[];
  staleProjectionHashes: string[];
  contradictedProjectionHashes: string[];
  proposedProjectionHashes: string[];
  uncoveredCriticalUnitIds: string[];
  intentLedgerHash: string;
  operatorModelHash: string;
  deltaHash: string;
}

interface AgentObligationSet {
  schemaVersion: 1;
  projectId: string;
  baseProjectionHash: string;
  requiredBehaviorRefs: string[];
  requiredObservationRefs: string[];
  forbiddenBoundaryRefs: string[];
  recoveryEvidenceRefs: string[];
  unresolvedDecisionRefs: string[];
  obligationHash: string;
}
```

Internal and participant projections must differ. Participant views use sanitized workspace-relative labels and bounded prose. Canonical internal nodes use controller-owned IDs, deterministic ordering, strict evidence authorities, RFC 8785 canonicalization, and domain-separated hashes.

## Relationship to existing components

| Component | Question it answers | Operator Source relationship |
| --- | --- | --- |
| Flight Recorder | What observably happened during the run? | raw evidence input |
| Intent Ledger | Why does each generated unit exist, and how strong is that attribution? | total Software Source reconciliation |
| Executable Operator Model | What has the human demonstrated they can control? | capability-evidence input |
| Decision Future | Did a human commitment really affect integration? | creates live decision nodes |
| Takeover Envelope | Where can the human plausibly take over now? | derived coverage over current nodes |
| Operator Projection | What compact executable project model is supported by commitments and bounded evidence? | optional human-facing projection |

Operator Source must be purely derived from these existing contracts plus immutable human commitment events. A separate mutable store, duplicate readiness state, or alternate evidence authority is rejected.

## Architecture laws

The eventual implementation must enforce:

1. **No silent promotion.** Agent claims and reverse-compiled prose start `proposed`.
2. **No orphaned claims.** Every changed text line resolves through exactly one primary Intent Ledger unit or is labeled `accountability-unavailable`; this blocks attribution/readiness claims, not autonomous production. Only an independently configured high-risk production policy may gate integration.
3. **No false understanding.** Ledger coverage cannot promote an Operator Source node.
4. **No stale control.** A relevant source, evidence, or control-surface change deterministically derives affected projections as stale.
5. **No prose execution.** Statements cannot directly become commands, paths, patches, or judge logic.
6. **No hidden approval gate.** Budget `0`, skip, and timeout preserve normal autonomous delivery unless a separately configured production policy requires approval.
7. **No retroactive ownership.** A post-reveal agreement cannot become a committed or live-decision node.
8. **No representation monopoly.** Unsupported code remains visible through fallback hunks; the Operator Source never claims to fully specify arbitrary repositories.

## Prior-art boundary

Shared and intermediate representations are established:

- Microsoft Programming with Representations uses domain-specific representations with guardrails to translate natural-language intent into programs, explicitly aiming to reduce the need for coding expertise.
- Apple Athena uses shared intermediate representations such as storyboards, data models, and GUI skeletons to scaffold iterative application generation.
- Bidirectional-transformation research studies lawful synchronization between a source and an editable view.
- executable specifications, model-driven engineering, traceability, tests, and architecture-as-code all predate PureFlow.

PureFlow does not claim novelty for intermediate representations, executable specifications, or bidirectional views. The proposed contribution is narrower:

> arbitrary existing software remains the sole complete executable source + agents retain implementation + a pure operator projection renders immutable human commitments and bounded control evidence + the generator cannot self-certify + delayed AI-off takeover tests whether that view is operationally useful

This combination is a research hypothesis, not a proven global novelty claim.

## Options considered

### A. Keep code as the only source and generate explanations

Simple, but the generator remains the authority for both implementation and its story. Explanations can improve navigation without preserving control.

### B. Make a domain DSL the complete source of truth

Strong inside a bounded domain, but incompatible with arbitrary existing repositories and shifts toward low-code generation. This is the Programming with Representations direction, not PureFlow's professional takeover goal.

### C. Make tests the human source

Tests are executable evidence but rarely encode architectural alternatives, causal models, diagnostic observations, or recovery policy. Agent-written tests may repeat the implementation's mistake.

### D. Store a separate AI-generated architecture graph

Adds another stale summary and lets the generator self-certify. A graph may visualize evidence but cannot own authority.

### E. Operator Projection over existing evidence — selected for experiment only

Keeps arbitrary code and full autonomy while testing a compact, executable, revision-bound project view that cannot be promoted by prose alone. Acceptance of this ADR authorizes the experiment and contract freeze, not a permanent product subsystem or category claim.

## Experiment

Run a pre-R8 representation pilot after full R7 and R5.1, before freezing the R6 projection. Use unfamiliar realistic TypeScript modules and matched active attention.

Compare:

1. Intent Ledger plus Executable Operator Model navigation;
2. the same mechanisms rendered through the Operator Projection with forward obligations and reverse deltas.

Both conditions receive identical evidence, control episodes, agent output, and time budgets. The representation alone differs.

Primary feasibility outcome:

- time to produce the first valid causal hypothesis on an unseen adjacent fault.

Secondary outcomes:

- regression-free delayed adjacent completion;
- time to locate the controlling intent, evidence, and recovery route;
- incorrect causal claims and false confidence;
- maintenance time per meaningful checkpoint;
- stale-node detection and missed invalidation;
- rubber-stamp acceptance of proposed nodes;
- production critical-path cost;
- preference after completing the behavioral task.

The representation pilot cannot replace the four-condition R8 controlled study. It selects or rejects a projection used inside Shadow control and Full PureFlow.

### Falsifiers

Reject Operator Source as a product-level abstraction if:

- it does not beat the existing ledger/model projection on causal localization per active minute;
- developers treat proposed nodes as trustworthy generated documentation;
- projection and obligation derivation frequently produces ambiguous or misleading updates;
- maintenance cost breaches the frozen attention margin;
- stale nodes survive material code or evidence changes;
- bootstrapping arbitrary repositories requires a domain model or manual specification project;
- delayed takeover is flat or worse despite better immediate explanations;
- users cannot distinguish Software Source accountability from bounded human-control evidence.

If the representation helps navigation but not takeover, retain it only as an optional code-navigation view and remove the dual-source category claim.

## Consequences

### Easier

- explain the full product as one architecture instead of a bundle of questions and dashboards;
- preserve a compact project model when agent transcripts disappear;
- make human commitments, bounded control evidence, agent claims, and unknown areas visibly distinct;
- compile human decisions forward without asking the human to implement them;
- detect drift between recorded pre-reveal commitments and what agents shipped;
- connect total line accountability to critical-seam takeover evidence.

### Harder

- derivation and invalidation become central correctness problems;
- a useful granularity must be learned without becoming paperwork;
- participant projections must remain compact while preserving uncertainty;
- legacy repositories may begin with few human commitments or little bounded control evidence;
- a second “source” metaphor can overpromise unless claim boundaries remain explicit.

## Entry and implementation gates

This ADR does not authorize R5.1/R6 implementation. Before acceptance:

1. complete and adjudicate the two-rater R7 expert audit;
2. review ADR-007–010 as one architecture and decide whether the projection is useful or unnecessary naming;
3. freeze one fixture's nodes, Operator Delta, obligations, projections, evidence authorities, invalidation rules, and hash domains;
4. add negative fixtures for self-certification, stale survival, ambiguous reverse updates, and omitted changed lines;
5. run the matched representation pilot before making Operator Source the default cockpit abstraction;
6. run the four-condition R8 and longitudinal studies before claiming skill preservation.

## Research anchors

- Microsoft Research, [Programming with Representations](https://www.microsoft.com/en-us/research/project/pwr/).
- Beason et al., [Athena: Intermediate Representations for Iterative Scaffolded App Generation with an LLM](https://machinelearning.apple.com/research/athena), IUI 2026.
- Matsuda and Wang, [Applicative bidirectional programming](https://doi.org/10.1017/S0956796818000096), Journal of Functional Programming, 2018.
- Yu et al., [Maintaining invariant traceability through bidirectional transformations](https://doi.org/10.1109/ICSE.2012.6227162), ICSE 2012.

These sources establish representations, scaffolding, traceability, and bidirectional synchronization. They do not test developer skill preservation or validate this one-way Operator Projection.
