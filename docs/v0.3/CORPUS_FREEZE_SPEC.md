# R7 corpus freeze contract

**Status:** frozen before any R7 compiler outcome is inspected  
**Protocol:** `r7-typescript-node-v1`

## Purpose

The corpus freezer converts repository registrations and independently collected eligibility facts into one canonical 30-patch manifest. It does not compile recovery episodes, expose held-out compiler outcomes, or decide whether a compiler result is successful.

## Required behavior

- Repository registration happens before candidate inspection and records URL, OSI license, pinned tip, runtime, package manager, immutable install/test argv, and the exact first-parent history command.
- A candidate is a full target commit plus its single adjacent first parent and its ordinal among the first 60 coarse candidates that changed TypeScript source and a test path.
- Eligibility facts are outcome-free. They contain bounded Git/test/provisioning evidence only and cannot contain episode, probe, judge, rater, or compiler fields.
- Every ineligible candidate receives exactly one exclusion code: the first failing rule in the frozen order below.
- At most the first 60 coarse candidates per repository are accepted. At most the first 10 eligible candidates per repository enter the corpus.
- Freezing fails unless exactly 30 eligible patches from at least three repositories exist.
- The split key is exactly `SHA-256("pureflow/r7-typescript-node-v1\n" + repository URL + "\n" + target commit)`.
- Patches are sorted by the raw UTF-8 bytes of that lowercase key. Positions 1–12 are `development`; positions 13–30 are `held-out`.
- Canonical JSON and its SHA-256 are emitted so the manifest can be reviewed and frozen before compiler execution.

## First-match exclusion order

1. `not-adjacent-first-parent`
2. `license-not-approved`
3. `missing-lockfile`
4. `dependency-or-lockfile-change`
5. `unsupported-artifact`
6. `diff-too-large`
7. `snapshot-too-large`
8. `unsupported-typescript-boundary`
9. `missing-attributed-test`
10. `requires-production-capability`
11. `network-required-at-execution`
12. `base-provision-or-test-failed`
13. `target-provision-or-test-failed`
14. `replay-not-deterministic`

The order is deliberately structural-first: cheap immutable failures are classified before provisioning failures. Changing the order requires a new protocol version, never an edit after outcomes are known.

## Non-goals

- downloading or copying third-party source into this repository;
- treating a static heuristic as proof that a test is causally relevant;
- rating compiler output;
- silently replacing missing evidence with defaults;
- claiming that a frozen corpus has already passed R7.
