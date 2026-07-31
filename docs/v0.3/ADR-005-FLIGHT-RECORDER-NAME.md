# ADR-005: Name the Observable Run Ledger Flight Recorder

- **Status:** Accepted
- **Date:** 2026-07-31
- **Decision owners:** PureFlow project

## Context

The original v0.3 documents called PureFlow's normalized, append-only agent-run ledger `Chronicle`. OpenAI now uses [Chronicle](https://learn.chatgpt.com/docs/customization/chronicle) for an opt-in Codex feature that derives memories from recent screen context. That product has different data, privacy, and lifecycle semantics from PureFlow's project-local run evidence.

Keeping the name would create avoidable ambiguity in user copy, integration code, issue searches, and security discussions. This is also the cheapest point to correct it: R0 is merged, while R1 has not published a wire format or persisted user data.

## Decision

The product component is named **Flight Recorder**.

- Documentation uses `Flight Recorder` for the controller-local observable run ledger.
- TypeScript uses the compact domain names `RunEnvelope`, `RunEvent`, and `RunRecorder`.
- Extension-owned JSONL is stored under the `recorder/` namespace.
- Vendor adapters emit normalized `RunEnvelope` values and never expose their native event unions downstream.
- The optional future `Flight Log` from ADR-004 remains a participant-facing summary of verified control episodes. It is not the raw Flight Recorder.

The schema remains version `1`. No persisted or public field contained the old component name, and no R1 data has shipped. This ADR changes terminology and code symbols, not the event meaning.

## Consequences

### Benefits

- the name expresses the autopilot analogy: normal automation continues while bounded evidence exists for diagnosis and takeover;
- it avoids collision with Codex screen-memory features;
- `RunEnvelope` and `RunRecorder` remain vendor-neutral and concise in code;
- raw operational evidence stays visibly separate from any user-facing readiness history.

### Costs

- existing R&D documents and the uncommitted R1 spike must be renamed together;
- future migrations must still version any actual schema or storage change, even if the product label remains stable.

## Rejected alternatives

### Keep Chronicle and clarify it in prose

Rejected. The ambiguity would recur in every integration and support conversation.

### Flight Log for both layers

Rejected. A raw append-only event source and a curated participant history have different visibility and retention rules.

### Event Store

Rejected as the product name. It is technically accurate but loses the control-and-recovery metaphor that differentiates the architecture.
