# ADR-008 — Evidence-Carrying Generation and the Intent Ledger

- **Status:** Proposed; implementation gated by the complete R7 expert audit
- **Date:** 2026-08-01
- **Deciders:** repository owner after R7 adjudication
- **Extends:** ADR-007

## Context

ADR-007 defines the Executable Operator Model: a versioned record of the project behavior a developer has actually demonstrated through prediction, evidence selection, intervention, recovery, or delayed transfer. That solves the human-readiness side of the product, but it does not fully solve the artifact side.

An autonomous run may change thousands of lines. Requiring the developer to read every diff recreates the review bottleneck PureFlow is meant to remove. Asking an LLM to summarize the diff is not enough: the same model that generated a change can produce a plausible but false explanation of it. Sampling only critical seams preserves takeover ability at those seams, but leaves the rest of the generated artifact opaque.

The original product goal therefore needs two separate guarantees:

1. **artifact accountability:** every changed line can be traced to a bounded semantic unit, an available reason, and the evidence or gap attached to that reason;
2. **operator readiness:** for selected critical seams, the developer has behaviorally demonstrated the ability to predict, observe, direct, and recover.

PureFlow must provide the first without pretending it proves the second.

## Decision

PureFlow will add an **Intent Ledger** between the autonomous build plane and the Executable Operator Model. The ledger is a revision-bound, bidirectional intermediate representation of why the current change exists and what evidence supports that account.

```text
human goal / committed decision
              │
              ▼
       Intent Ledger N ───────────────► build-agent context
              │                              │
              │ forward obligations          │ generated patch + claim refs
              │                              ▼
              ◄──────────── Flight Recorder / semantic compiler
              │                  reverse attribution + evidence join
              ▼
       Intent Delta N→N+1
       supported / claimed / unattributed / contradicted / stale
              │
              ├────────► navigable accountability for every changed line
              └────────► Operator Model divergence and control selection
```

The build plane remains free to write all implementation code. It is asked to emit structured claim references while it works, but those references are never trusted as evidence by themselves. The Flight Recorder independently binds the resulting diff to syntax, build, test, trace, and repository evidence. Unsupported associations remain `claimed`; missing associations become `unattributed`.

### Unit of accountability

The ledger does not force one explanation per physical line. It compiles the smallest supported semantic unit available:

- symbol, declaration, branch, call site, schema field, route, or configuration key when a language adapter supports it;
- deterministic generator invocation for derived files and lockfiles;
- bounded diff hunk when no safer structural unit exists.

Every changed line must belong to exactly one primary unit for coverage accounting. A unit may have additional dependency and evidence edges. Unsupported files are still represented as bounded hunks, so the compiler cannot silently drop difficult changes.

### Attribution states

| State | Meaning | What it may claim |
| --- | --- | --- |
| `supported` | the structural mapping and at least one evidence reference were independently joined | this unit is connected to the stated intent and available evidence |
| `claimed` | an agent or imported artifact asserted the link, but independent support is incomplete | the build plane says this is why it changed |
| `unattributed` | no bounded intent link is available | the reason for this unit is an explicit gap |
| `contradicted` | executable evidence conflicts with the attached behavior claim | the current account is wrong or incomplete |
| `stale` | the source, intent, or evidence authority changed after the link was compiled | the previous account must be recomputed |

`supported` means supported attribution, not proof of correctness, safety, or human understanding.

### Bidirectional behavior

The ledger operates in both directions:

- **forward:** committed goals, constraints, decisions, and known invariants become obligations the build agent can reference while planning and generating;
- **reverse:** the actual patch, tests, traces, and agent events produce an `IntentDelta` that shows added behavior, changed assumptions, stale decisions, contradictions, and unattributed code.

The reverse pass may create an `agent-claimed` intent node. It must never silently rewrite a user-committed node or present inferred prose as the developer's intent.

### Generated and mechanical artifacts

Formatting changes, generated sources, snapshots, migrations, and lockfiles can dominate a diff without deserving human attention. They are accounted for through a deterministic generation or transformation receipt that names:

- the source-of-truth unit;
- the frozen command or controller-owned transform;
- input and output hashes;
- the evidence that regeneration is reproducible.

This preserves total line coverage without turning mechanical output into a thousand fake decisions.

### Relationship to the Operator Model

The two artifacts have different authority:

```text
Intent Ledger     = what the software change is connected to
Operator Model    = what the human has demonstrated they can control
```

The Operator Model may consume ledger gaps to select a shadow-control episode. A ledger link alone cannot make an operator claim `fresh`. Only the executable human evidence defined by ADR-007 can do that.

## Proposed contracts

These shapes are non-normative until the ADR is accepted. Final contracts require strict participant/internal projections, domain-separated RFC 8785 hashes, deterministic ordering, and controller-owned authorities.

```ts
type IntentOrigin =
  | "user-committed"
  | "agent-claimed"
  | "repository-imported"
  | "executable-observed";

type AttributionState =
  | "supported"
  | "claimed"
  | "unattributed"
  | "contradicted"
  | "stale";

interface IntentNode {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sourceTreeHash: string;
  kind: "goal" | "requirement" | "invariant" | "decision" | "constraint";
  origin: IntentOrigin;
  statement: string;
  parentIds: string[];
  evidenceRefs: string[];
  nodeHash: string;
}

interface SemanticUnit {
  schemaVersion: 1;
  id: string;
  projectId: string;
  sourceTreeHash: string;
  adapterId: string;
  kind: "symbol" | "branch" | "call-site" | "config" | "generated" | "hunk";
  relativePath: string;
  changedLineDigest: string;
  sourceDigest: string;
  unitHash: string;
}

interface SemanticAttribution {
  schemaVersion: 1;
  projectId: string;
  sourceTreeHash: string;
  unitId: string;
  intentNodeIds: string[];
  evidenceRefs: string[];
  controlSurfaceHash?: string;
  state: AttributionState;
  reasonCodes: string[];
  attributionHash: string;
}

interface IntentLedgerSnapshot {
  schemaVersion: 1;
  projectId: string;
  sourceTreeHash: string;
  nodes: IntentNode[];
  units: SemanticUnit[];
  attributions: SemanticAttribution[];
  unattributedUnitIds: string[];
  snapshotHash: string;
}

interface IntentDelta {
  schemaVersion: 1;
  projectId: string;
  beforeSnapshotHash: string;
  sourceTreeHash: string;
  addedUnitIds: string[];
  changedUnitIds: string[];
  staleAttributionIds: string[];
  contradictedAttributionIds: string[];
  unattributedUnitIds: string[];
  deltaHash: string;
}
```

The canonical form must reject absolute paths, duplicate IDs, unknown evidence authorities, overlapping primary line ownership, omitted changed lines, hash drift, and cross-project references.

## User experience

The normal view is a compact change account, not a graph editor or mandatory review gate:

```text
Agent checkpoint 42

2,143 changed lines → 37 semantic units
29 supported · 6 claimed · 2 unattributed

New behavior:       tenant cache invalidation
Changed decision:   retry moved behind idempotency boundary
Evidence gap:       rollback has no executable observation

Best 4-minute action:
Test which signal distinguishes a stale key from a dropped invalidation.

[Take control] [Open change account] [Keep agents running]
```

From any changed line, the developer can open a compact chain:

```text
line → semantic unit → intent/claim → executable evidence → control surface
```

If a link is missing, the UI says so. It does not fill the gap with an LLM explanation. A small side-chat model may ask the developer to commit a decision, predict behavior, or choose evidence, but its assessment cannot change ledger or readiness authority.

## Integrity rules

### No trace-washing

An agent cannot mark its own attribution `supported`. Agent-emitted references start as `claimed` until a deterministic structural join and an allowed evidence authority support them.

### No test monoculture

A test generated in the same action is useful evidence but not independent proof. The ledger records evidence origin so the selector can prefer external contracts, prior tests, runtime traces, or later human-created control dividends.

### No giant semantic units

Adapters must expose a configured maximum unit span and deterministic fallback. A repository-wide or file-wide unit cannot hide unrelated behavior merely to improve coverage.

### No silent exclusions

Ignored, binary, vendor, and unsupported artifacts receive explicit classification. Changed text lines must still reconcile against the Git diff. Generated artifacts may use one receipt-backed unit, but cannot disappear from totals.

### No competence inference

Opening the account, reading an explanation, accepting a node, or achieving high attribution coverage must not update the Executable Operator Model or a readiness claim.

## Prior-art boundary

This decision borrows useful ideas but defines a different product object:

- Microsoft's Programming with Representations uses a domain-specific representation and guardrails to translate natural-language intent into robust code, including for people without coding expertise. PureFlow's ledger is revision-bound, accepts arbitrary existing code, exposes reverse-attribution failures, and exists to preserve professional ownership rather than decouple the user from coding expertise.
- Requirements-to-code traceability links requirements, implementation, and tests. The Intent Ledger adds live agent-event provenance, explicit unsupported states, control surfaces, and a separate behaviorally verified Operator Model.
- Proof-carrying code lets a consumer validate adherence to a safety policy. Evidence-carrying generation is deliberately weaker: it carries inspectable evidence and gaps, not a mathematical proof or a total-correctness claim.
- Code summaries and code-to-text representations can improve navigation, but generated prose has no authority unless joined to source structure and executable evidence.

The intended novelty is the combination of total change reconciliation, untrusted agent claims, executable evidence, visible attribution debt, and a separate human-control model inside an autonomy-first IDE.

## Validation plan

The first post-R7 slice is a compiler and experiment, not a broad UI build.

### Technical acceptance

1. For every supported text diff, 100% of changed lines reconcile to exactly one primary semantic unit or the compile fails.
2. Reopening identical inputs yields byte-identical canonical snapshots and hashes on Windows and Linux.
3. No model-only claim can become `supported` in the negative fixture suite.
4. Unsupported languages fall back to bounded hunks without silently losing lines.
5. A material source, intent, evidence, or generator change deterministically marks affected links `stale`.
6. Clicking any changed line resolves to its unit and current attribution state without network access.
7. Deleting the project ledger removes all project-scoped attribution data without changing source code.

### Mechanism experiment

Freeze a corpus of real agent-produced changes before evaluation. Compare:

- raw diff plus ordinary AI summary;
- semantic change account without executable evidence;
- Intent Ledger plus Operator Model routing.

Measure supported-attribution precision and recall against two independent expert raters, false-provenance rate, unresolved-unit visibility, time to answer a code-navigation question, delayed adjacent takeover success, production critical-path time, active human minutes, and ledger maintenance cost. Freeze thresholds and the adjudication rule before opening the held-out changes.

### Falsifiers

Reject or narrow the decision if any preregistered study shows:

- expert raters cannot reliably agree whether intent links are supported;
- false supported provenance survives the negative corpus;
- a plain AST/diff navigator performs as well on delayed takeover and causal navigation;
- users treat `claimed` links as truth despite the state distinction;
- incremental maintenance cost erases the production-speed advantage of agentic coding;
- reverse compilation produces mostly generic intent nodes that do not help control selection;
- Intent Ledger coverage does not improve selection beyond ADR-007's weighted semantic seams;
- benefits disappear on another supported language or real repository.

## Options considered

### A. Require full diff review

Provides visibility but does not scale and restores the exact bottleneck the product rejects.

### B. Generate a repository explanation or code graph

Fast and useful for navigation, but cannot distinguish evidence from a plausible model story and does not maintain human control.

### C. Use only the Executable Operator Model

Strong for critical takeover seams, but does not reconcile the rest of a large generated change.

### D. Make a domain DSL the source of truth

Can improve reliability in bounded domains, but does not fit arbitrary existing repositories and shifts the product toward low-code generation.

### E. Intent Ledger plus Executable Operator Model — selected

Maintains autonomous generation, accounts for the whole change, and spends scarce human attention only where behavioral control evidence is valuable.

## Consequences

### Easier

- navigate a 2,000-line agent change without pretending every line was manually reviewed;
- expose code the agent cannot honestly explain or support;
- detect drift between decisions, generated behavior, and tests;
- route control episodes from concrete accountability gaps;
- reuse human interventions as better evidence for future agents.

### Harder

- each language adapter needs deterministic unit boundaries and fallback behavior;
- attribution authority and evidence origin must survive rebases and regeneration;
- UI must communicate uncertainty without turning states into a vanity score;
- useful intent granularity is an empirical question;
- storage and incremental compilation need measurement on real repositories.

## Entry and implementation gates

This ADR does not authorize R5/R6 implementation. Before acceptance:

1. complete and adjudicate the two-rater R7 expert audit;
2. review ADR-007 and ADR-008 together as one product architecture;
3. freeze unit-boundary, evidence-authority, projection, and hash rules in `CONTRACTS.md`;
4. build one offline Intent Ledger fixture with deliberately false agent claims and unsupported files;
5. pass the technical acceptance suite before any cockpit coverage UI;
6. run the held-out attribution study before using the ledger to make product claims.

## Research anchors

- Microsoft Research, [Programming with Representations](https://www.microsoft.com/en-us/research/project/pwr/), 2023–2026.
- YM et al., [PwR: Exploring the Role of Representations in Conversational Programming](https://www.microsoft.com/en-us/research/publication/pwr-exploring-the-role-of-representations-in-conversational-programming/), 2023.
- Schlathölter, [ReqToCode: Embedding Requirements Traceability as a Structural Property of the Codebase](https://arxiv.org/abs/2603.13999), 2026.
- Necula, [Proof-Carrying Code](https://doi.org/10.1145/263699.263712), 1997.

These sources establish adjacent mechanisms. They do not validate PureFlow's combined architecture or its skill-preservation effect.
