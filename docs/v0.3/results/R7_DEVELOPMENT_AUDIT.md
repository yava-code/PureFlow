# R7 development audit — iteration 1

**Date:** 2026-08-01  
**Corpus:** `a4ef6cbfa48c66cb9d384bcc2834ecbfae8ff08810abfd1863b395b8aa47d149`  
**Protocol:** `r7-rewind-v1`  
**Machine:** Windows host, Docker Desktop 29.2.1, digest-pinned Node sandbox  
**Summary:** `d4457d21be7939eee4e205d0b559e7e7ef01973df5f0a072f8d2ae4adfcc070b`

## Result

| Measure | Result |
| --- | ---: |
| Eligible development patches | 12 |
| Structurally compiled | 10/12 (83.3%) |
| Valid among compiled executions | 9/10 (90.0%) |
| Valid recovery episodes, end to end | 9/12 (75.0%) |
| Valid executable probes, end to end | 9/12 (75.0%) |
| Compile-time abstentions | 2 `unsupported-source-rewind` |
| Dynamic rejection | 1 `mutation-did-not-fail` |
| Median measured execution work | 360,742 ms |
| Total measured sandbox work | 4,273,101 ms |

Both preregistered development floors passed. No iteration-2 compiler change is allowed. These are technical development-corpus results, not held-out generalization, human learning, skill retention, or product-effectiveness evidence.

## Integrity evidence

- Every compiled patch ran one target control, three clean rewind states, and three protected repair states.
- Install was the only repository-code phase with bridge networking; controls and replay tests used network none.
- Each state used a fresh native Docker volume cloned from the installed dependency volume.
- Source Git blob OIDs were verified before and after every registered test command.
- Ten result files have unique internal-plan and execution-report hashes.
- The independent post-run audit found zero `pureflow-r7-audit-*` containers and zero `pureflow-r7-audit-*` volumes.
- All external repository snapshots were unchanged by execution.

The compile specification's archive-hash placement deviation is disclosed in `docs/v0.3/R7_COMPILER_SPEC.md`. Raw bounded receipts and their hashes are under `docs/v0.3/results/dev-iteration1/`; test stdout/stderr content is not committed.

## Remaining gate

The automatic development stage permits a compiler source/config freeze and held-out execution. R7 itself remains incomplete until the frozen 18-patch held-out audit is finished and two independent experienced TypeScript raters, blind to compiler outcomes, rate the participant packets with adjudication and agreement reporting.
