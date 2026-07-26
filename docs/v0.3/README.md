# PureFlow v0.3 R&D

PureFlow v0.3 asks whether an AI IDE can keep autonomous coding fast while behaviorally preserving the developer's ability to take over their own project.

## Read in this order

1. [`../../prd.md`](../../prd.md) — product definition and MVP.
2. [`THESIS.md`](THESIS.md) — causal mechanism and honest limits.
3. [`RESEARCH.md`](RESEARCH.md) — evidence, competitors, and novelty boundary.
4. [`CONCEPTS.md`](CONCEPTS.md) — alternative architectures and selection.
5. [`ADR-001-DUAL-CONTROL.md`](ADR-001-DUAL-CONTROL.md) — system decision.
6. [`ADR-002-EXECUTION-PHASES.md`](ADR-002-EXECUTION-PHASES.md) — trusted-fixture slice versus the untrusted-code sandbox gate.
7. [`CONTRACTS.md`](CONTRACTS.md) — normative schemas, hidden-answer isolation, oracle integrity, and command boundary.
8. [`EXPERIMENTS.md`](EXPERIMENTS.md) — hypotheses, metrics, and kill criteria.
9. [`AGENT_EXECUTION.md`](AGENT_EXECUTION.md) — ordered implementation workstreams and acceptance gates.
10. [`JULES_LOOP.md`](JULES_LOOP.md) — guarded server-side execution queue for the audited R0–R4 slice.

## Current truth

- The released v0.1 VSCodium IDE exists and remains the runtime baseline.
- The v0.3 Dual-Control architecture is documented but not implemented.
- No retention, takeover, productivity, or usability target has been measured.
- The first valid build is one test-backed vertical slice, not a full Cursor clone.
- R0–R4 may execute only finite, repository-owned fixture states. Arbitrary participant or corpus code remains blocked until ADR-003 selects and runtime-verifies a real sandbox backend.

## Architecture shorthand

```text
production agent run
→ observable Chronicle
→ high-value changed seam
→ disposable Takeover Twin
→ human prediction / diagnosis / intervention / recovery
→ executable judge
→ local delayed readiness evidence
→ future attention and delegation policy
```

The production plane continues by default while the readiness plane runs. If the human does no control work, PureFlow makes no claim that capability was preserved.
