# PureFlow v0.3 R&D

PureFlow v0.3 asks whether an AI IDE can keep autonomous coding fast while behaviorally preserving the developer's ability to take over their own project.

## Read in this order

1. [`../../prd.md`](../../prd.md) — product definition and MVP.
2. [`THESIS.md`](THESIS.md) — causal mechanism and honest limits.
3. [`RESEARCH.md`](RESEARCH.md) — evidence, competitors, and novelty boundary.
4. [`CONCEPTS.md`](CONCEPTS.md) — alternative architectures and selection.
5. [`ADR-001-DUAL-CONTROL.md`](ADR-001-DUAL-CONTROL.md) — system decision.
6. [`ADR-002-EXECUTION-PHASES.md`](ADR-002-EXECUTION-PHASES.md) — trusted-fixture slice versus the untrusted-code sandbox gate.
7. [`ADR-003-DOCKER-DESKTOP-SANDBOX.md`](ADR-003-DOCKER-DESKTOP-SANDBOX.md) — selected Phase-B backend, capability evidence, and remaining gate.
8. [`ADR-004-EPISTEMIC-CHECKPOINTS.md`](ADR-004-EPISTEMIC-CHECKPOINTS.md) — event-driven Control Pulses, Explain-to-Break, Side Coach, and honest motivation mechanics.
9. [`ADR-005-FLIGHT-RECORDER-NAME.md`](ADR-005-FLIGHT-RECORDER-NAME.md) — collision-free name and raw-ledger boundary.
10. [`ADR-006-CODEX-APP-SERVER-ADAPTER.md`](ADR-006-CODEX-APP-SERVER-ADAPTER.md) — first live runtime choice and portability path.
11. [`CONTRACTS.md`](CONTRACTS.md) — normative schemas, hidden-answer isolation, oracle integrity, and command boundary.
12. [`EXPERIMENTS.md`](EXPERIMENTS.md) — hypotheses, metrics, and kill criteria.
13. [`R7_PREREGISTRATION.md`](R7_PREREGISTRATION.md) — frozen 30-patch sampling, metrics, and analysis protocol.
14. [`SANDBOX_RUNNER_SPEC.md`](SANDBOX_RUNNER_SPEC.md) — exact Phase-B runner acceptance and negative contract.
15. [`CONCEPT_LAB_CONTROLLABILITY.md`](CONCEPT_LAB_CONTROLLABILITY.md) — post-R7 control-surface, cold-relay, and dissent hypotheses.
16. [`AGENT_EXECUTION.md`](AGENT_EXECUTION.md) — ordered implementation workstreams and acceptance gates.
17. [`JULES_LOOP.md`](JULES_LOOP.md) — guarded server-side execution queue for the audited R0–R4 slice.

## Current truth

- The released v0.1 VSCodium IDE exists and remains the runtime baseline.
- The complete v0.3 Dual-Control product runtime is not implemented. R0–R4.5 implement and protect the reviewed-fixture path from canonical evidence through recovery judging and a precommitted Control Pulse. The digest-pinned Docker `SandboxRunner` has passed local Windows and protected Linux/Windows gates. The readiness ledger, cockpit, corpus audit, and human pilot remain gated.
- No retention, takeover, productivity, or usability target has been measured.
- The first valid build is one test-backed vertical slice, not a full Cursor clone.
- R0–R4.5 remain the only completed product evidence path. ADR-003's sandbox implementation gate has passed, but arbitrary participant or corpus execution remains blocked until the preregistered collection, eligibility, and freeze artifacts exist.

## Architecture shorthand

```text
production agent run
→ observable Flight Recorder
→ high-value changed seam
→ disposable Takeover Twin
→ human prediction / diagnosis / intervention / recovery
→ executable judge
→ local delayed readiness evidence
→ future attention and delegation policy
```

The production plane continues by default while the readiness plane runs. If the human does no control work, PureFlow makes no claim that capability was preserved.
