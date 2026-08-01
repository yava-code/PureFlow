# Executable Operator Model vertical-slice specification

- **Status:** Draft; implementation blocked by the complete R7 expert gate
- **Date:** 2026-08-01
- **Source decision:** ADR-007
- **Target:** first post-R7 mechanism ablation, before cockpit expansion

## Context

PureFlow needs to distinguish a developer who merely saw agent output from one who can control a changed project seam. Existing immediate evidence is event-scoped. It does not express which causal claims remain valid after later code changes, which critical seams have no human-controlled recovery path, or which small intervention would reduce that gap most efficiently.

The first slice must prove that a deterministic operator-model delta can be derived from existing immutable project evidence and can select a more relevant shadow-control opportunity without using an LLM as the oracle.

## Functional Requirements

Requirement index:

- FR-1: Immutable snapshot
- FR-2: Explicit claim states
- FR-3: Change invalidation
- FR-4: Executable evidence only
- FR-5: Deterministic delta
- FR-6: Bounded selection
- FR-7: Complete control surface
- FR-8: Pre-reveal commitment
- FR-9: Context-starved relay
- FR-10: Non-executable prose
- FR-11: Control dividend
- FR-12: Non-scalar evidence
- FR-13: Local ownership
- FR-14: Zero-budget autonomy

### FR-1: Immutable snapshot

The system MUST create an immutable `OperatorModelSnapshot` from a project ID, source tree, supported control surfaces, and existing capability evidence.

### FR-2: Explicit claim states

The system MUST label each claim `unverified`, `fresh`, `stale`, or `contradicted` using deterministic reason codes.

### FR-3: Change invalidation

A changed source tree MUST NOT preserve a `fresh` claim unless the compiler proves that the claim's bound semantic unit and control surface are unchanged.

### FR-4: Executable evidence only

Only prior executable capability evidence MAY advance a claim to `fresh`; explanations, quiz answers, confidence, and model annotations MUST NOT.

### FR-5: Deterministic delta

The system MUST emit a deterministic `ModelDelta` between a prior snapshot and a new source tree.

### FR-6: Bounded selection

The selector MUST choose at most one bounded shadow-control candidate from the delta for the fixture slice.

### FR-7: Complete control surface

The candidate MUST identify an existing controller-owned observation, actuator, recovery judge, and participant-safe prompt.

### FR-8: Pre-reveal commitment

The participant MUST commit a prediction before its bound observation is disclosed.

### FR-9: Context-starved relay

A context-starved relay MAY write the complete candidate patch, but it MUST receive only participant-selected evidence and a bounded committed directive.

### FR-10: Non-executable prose

Free-form model or participant text MUST NOT become executable input.

### FR-11: Control dividend

A terminal shadow-control result MUST create no more than one proposed control dividend, and that dividend MUST reference executable evidence.

### FR-12: Non-scalar evidence

The system MUST retain failures, assistance, abandonment, and contradiction; it MUST NOT collapse them into a scalar readiness score.

### FR-13: Local ownership

All data MUST remain local, project-scoped, exportable, and deletable.

### FR-14: Zero-budget autonomy

Budget `0` MUST produce no prompt and no readiness claim while leaving autonomous production unaffected.

## Non-Functional Requirements

- **NFR-1 Determinism:** Identical reopened inputs MUST yield byte-identical canonical snapshot, delta, and selection hashes on Windows and Linux.
- **NFR-2 Integrity:** Unknown fields, unsorted IDs, duplicate IDs, hash drift, cross-project evidence, and unknown authorities MUST fail before selection or execution.
- **NFR-3 Isolation:** Shadow execution MUST use the existing SandboxRunner boundary and MUST leave the production worktree unchanged.
- **NFR-4 Boundedness:** The fixture slice MUST cap one session at 600 active seconds, eight evidence references, and one control dividend.
- **NFR-5 Non-blocking production:** Skipping, abandoning, timing out, or failing shadow control MUST NOT block normal checkpoint integration.
- **NFR-6 Honesty:** UI and stored evidence MUST distinguish immediate capability evidence from delayed verified readiness.
- **NFR-7 Privacy:** Persisted records MUST contain no absolute workspace path, credential, raw terminal history, clipboard content, or hidden model reasoning.

## Acceptance Criteria

Traceability: (FR-1), (FR-2), (FR-3), (FR-4), (FR-5), (FR-6), (FR-7), (FR-8), (FR-9), (FR-10), (FR-11), (FR-12), (FR-13), and (FR-14).

### AC-1: Cross-platform snapshot identity

References FR-1, FR-4, and NFR-1. Given identical fixture evidence on Windows and Linux, when the snapshot compiler runs, then canonical JSON and `snapshotHash` are identical.

### AC-2: Material change stales a claim

References FR-2 and FR-3. Given a fresh claim and a materially changed bound unit, when a new snapshot is compiled, then the claim is `stale` with a deterministic reason and cannot remain `fresh`.

### AC-3: Contradiction remains evidence

References FR-2. Given an observation that contradicts a committed prediction, when the result is joined, then the claim becomes `contradicted` rather than failed or deleted.

### AC-4: Prose cannot create freshness

References FR-4 and FR-12. Given only an explanation, confidence value, quiz answer, or Side Coach annotation, when the snapshot is compiled, then no claim advances to `fresh`.

### AC-5: Delta replay is deterministic

References FR-5 and NFR-1. Given the same prior snapshot and new tree, when delta compilation repeats three times, then every output and hash is identical.

### AC-6: Selection has a complete authority chain

References FR-6 and FR-7. Given several gaps, when selection runs, then it returns one eligible candidate with a controller-owned observer, actuator, recovery judge, and transparent reason list.

### AC-7: Observation requires commitment

References FR-8. Given a shadow session, when observation execution is requested before the prediction commitment exists, then execution is rejected.

### AC-8: Relay prose stays non-executable

References FR-9 and FR-10. Given a relay directive containing code, command arguments, a path, environment value, or unknown evidence ID, when validation runs, then it fails before an executor starts.

### AC-9: A passed session emits one bounded dividend

References FR-11. Given a passed session, when its result is finalized, then at most one proposed dividend is emitted and it points to a verified test, probe, rollback, or control handle.

### AC-10: Immediate evidence is not verified readiness

References FR-12 and NFR-6. Given immediate recovery without delayed transfer, when evidence is rendered, then it is labeled capability evidence and never verified readiness.

### AC-11: Project evidence is private and deletable

References FR-13 and NFR-7. Given exported or persisted evidence, when scanned with absolute-path and secret fixtures, then none are present; deleting the project removes all Operator Model records.

### AC-12: Zero budget leaves production autonomous

References FR-14 and NFR-5. Given budget `0`, when an eligible delta exists, then agents continue, no shadow session is offered, and no capability event is fabricated.

### AC-13: Every terminal path preserves production state

References NFR-3. Given pass, fail, cancel, timeout, and tamper cases, when cleanup finishes, then source files, index, HEAD, refs, remotes, and worktree list match their captured state.

## Edge Cases

Edge-case index:

- EC-1: Cross-project evidence
- EC-2: Unproven rename
- EC-3: Judge drift
- EC-4: Incompatible claims
- EC-5: Precommit skip
- EC-6: Protected-path relay patch
- EC-7: Partial timeout output
- EC-8: Missing dividend
- EC-9: Time decay
- EC-10: Attribution gap

### EC-1: Cross-project evidence

Evidence refers to a previous project identity.

### EC-2: Unproven rename

A semantic unit was renamed without behavioral evidence proving equivalence.

### EC-3: Judge drift

The control surface exists but its recovery judge changed.

### EC-4: Incompatible claims

Two claims bind to the same seam with incompatible predictions.

### EC-5: Precommit skip

The participant skips after seeing the prompt but before commitment.

### EC-6: Protected-path relay patch

The relay proposes a passing patch that edits a protected oracle or test.

### EC-7: Partial timeout output

The runner times out after producing partial output.

### EC-8: Missing dividend

A passed immediate episode has no valid reusable dividend.

### EC-9: Time decay

A previously fresh claim ages without a code change.

### EC-10: Attribution gap

The model compiler cannot attribute a changed line or invariant.

Every edge case must produce an explicit state or reason code. None may silently become success.

## API Contracts

ADR-007 defines the proposed public shapes. Implementation must add exact JSON schemas and separate internal/participant projections before code. The participant projection may contain a bounded behavior claim, labels for approved observations, attention budget, and opaque session identity. It must exclude revisions, command definitions, controller authorities, oracle identities, hidden repairs, and source paths.

HTTP endpoint: N/A — this slice is an injected extension-host TypeScript boundary with no network transport. Adding a fake `POST` route solely to satisfy a generic validator would widen the attack surface and misstate the architecture.

Required service boundary:

```ts
interface OperatorModelCompiler {
  compileSnapshot(input: CompileOperatorSnapshotInput): Promise<OperatorModelSnapshot>;
  compileDelta(input: CompileOperatorDeltaInput): Promise<ModelDelta>;
}

interface ShadowControlSelector {
  select(input: SelectShadowControlInput): Promise<ShadowControlSelection | null>;
}

interface ShadowControlController {
  commitPrediction(input: CommitShadowPredictionInput): Promise<CommittedShadowPrediction>;
  commitDirective(input: CommitRelayDirectiveInput): Promise<CommittedRelayDirective>;
  execute(input: ExecuteShadowControlInput): Promise<ShadowControlResult>;
  abandon(input: AbandonShadowControlInput): Promise<ShadowControlResult>;
}
```

## Data Models

| Entity | Required identity | Persistence | Authority |
| --- | --- | --- | --- |
| `OperatorClaim` | project, source tree, seam, control surface | local append-only evidence plus derived snapshot | controller compiler |
| `OperatorModelSnapshot` | project and source tree | immutable local object | controller compiler |
| `ModelDelta` | before snapshot and new source tree | immutable experiment evidence | controller compiler |
| `ShadowControlSession` | project, delta, participant experience | session lifetime plus bounded result | controller |
| `ShadowControlResult` | session, committed prediction, judge result | append-only | executable judge |
| `ControlDividend` | terminal result and artifact hash | proposed until separately verified | controller-owned materializer |

## Out of Scope

Exclusion index:

- OS-1: Live multi-agent adapter
- OS-2: Universal comprehension
- OS-3: Invented invariants
- OS-4: Management scoring
- OS-5: Manual-code quotas
- OS-6: Free-form execution
- OS-7: Immediate readiness claims
- OS-8: Stack expansion
- OS-9: Premature production UI
- OS-10: Skill-preservation claim

### OS-1: Live multi-agent adapter

Live multi-agent adapter implementation is excluded from this slice.

### OS-2: Universal comprehension

Universal program understanding is not attempted.

### OS-3: Invented invariants

Automatic natural-language invariant generation presented as fact is prohibited.

### OS-4: Management scoring

Manager dashboards and public developer rankings are excluded.

### OS-5: Manual-code quotas

No requirement is based on manually typed lines.

### OS-6: Free-form execution

Arbitrary shell commands from a model or participant are excluded.

### OS-7: Immediate readiness claims

Immediate performance cannot create verified readiness.

### OS-8: Stack expansion

More than one language or the preregistered TypeScript support envelope is excluded.

### OS-9: Premature production UI

Production UI is excluded until the selector and relay ablations pass.

### OS-10: Skill-preservation claim

This slice cannot establish that PureFlow preserves long-term skill.

## Required Ablations

The slice is not accepted from unit tests alone. Under the same attention and executor budget, compare:

1. random changed function;
2. existing weighted semantic seam;
3. Operator Model delta selection.

For cold relay, compare:

1. automatic evidence and directive policy;
2. human-selected evidence plus committed conditional directive.

Primary technical outcomes are valid executable selection, recovery after a wrong first action, fault-route coverage, and control-dividend validity. The later human outcome remains delayed regression-free adjacent-task success.

## Implementation Entry Gate

Do not generate tests or implementation until:

- two independent R7 expert bundles are joined and adjudicated;
- R7 passes its complete preregistered gate;
- ADR-007 is accepted;
- exact schemas, hash domains, projections, and reason codes are added to `CONTRACTS.md`;
- the specification status changes from Draft to Approved.
