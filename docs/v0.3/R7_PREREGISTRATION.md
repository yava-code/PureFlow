# R7 technical corpus audit preregistration

**Status:** frozen design; corpus not collected and outcomes not inspected  
**Protocol version:** `r7-typescript-node-v1`  
**Date:** 2026-07-31

## Question

Can the frozen PureFlow compiler produce a causally relevant recovery episode and a bounded executable prediction probe from ordinary test-backed TypeScript patches without per-patch scenario code?

R7 evaluates mechanism coverage and integrity. It does not estimate developer learning, productivity, market value, or skill retention.

## Repository and patch sampling

Use at least three open-source TypeScript/Node repositories with OSI-compatible licenses, local deterministic tests, and no credentials. Record the repository URL, license, pinned tip commit, package manager/runtime versions, and candidate-history command before eligibility inspection.

For each repository, walk first-parent commits backward from the pinned tip. Consider at most the first 60 commits that change a `.ts` or `.tsx` source file and a test file. Apply the eligibility rules below without running PureFlow compilation. Stop after ten eligible patches per repository. If a repository yields fewer than ten, report it and add a replacement repository under the same rule before any compiler outcome is inspected.

After 30 eligible patches exist, compute:

```text
key = SHA-256("pureflow/r7-typescript-node-v1\n" + repository URL + "\n" + target commit)
```

Sort by `key`. The first 12 patches form the development corpus; the remaining 18 form the held-out corpus. Repository identity remains visible for setup but compiler outcomes stay hidden from expert relevance raters.

## Eligibility frozen before outcomes

A patch is eligible only when all conditions hold:

- base and target are full adjacent first-parent commits;
- both install from a lockfile with the pinned runtime/package manager and pass the same declared deterministic test command in a clean network-enabled provisioning stage;
- the target changes at least one behavior-relevant TypeScript function, method, class, or module boundary supported by the frozen R2 extractor;
- at least one existing or patch-added deterministic test is attributable to that boundary;
- the patch needs no production credential, external service, browser, GPU, privileged device, or host daemon during execution;
- the execution stage can run with network none;
- dependency and lockfile changes are absent;
- generated files, snapshots larger than 1 MiB, vendored dependencies, submodules, symlinks, and platform-only native addons are absent;
- the relevant diff is at most 500 changed lines and the sanitized repository is at most 25 MiB after offline dependency provisioning;
- license and test artifacts may be used for this research audit.

Every excluded candidate receives exactly one first matching exclusion code. Rules are never changed after the first compiler outcome is viewed.

## Frozen support envelope

The v1 compiler may use only:

- R1 Flight Recorder-style task/change/command/test evidence reconstructed from Git and declared tests;
- the R2 TypeScript compiler-API extractor;
- existing test commands and controller-owned deterministic mutation operators;
- a sanitized standalone snapshot and immutable command registry;
- the digest-pinned ADR-003 sandbox with network none;
- deterministic heuristics frozen after the 12-patch development set.

No patch-specific prompt, test, mutation, repair, oracle, command, path mapping, or exception may be added. Model prose may suggest a hypothesis but cannot supply executable material or determine pass/fail.

## Outputs per eligible patch

The compiler emits independently:

1. one recovery episode or a typed no-episode reason;
2. one Explain-to-Break probe or a typed no-probe reason;
3. setup, execution, cleanup, timing, and disk evidence for three clean replays;
4. a strict participant projection and adversarial capsule result;
5. judge outcomes against the protected oracle.

Development-set changes are limited to two compiler iterations. After iteration two, freeze the source commit and all configuration before revealing the held-out set. No held-out patch may trigger a code or configuration change.

## Human rating

Two independent experienced TypeScript engineers rate each eligible patch without seeing compiler success:

- whether the selected seam is causally relevant to the changed behavior;
- the expected recovery oracle outcome;
- whether the probe falsifier tests the claimed invariant rather than syntax or trivia.

Use binary judgments plus a short rationale. Report raw agreement and Cohen's kappa with a 95% bootstrap interval. A third adjudication record resolves disagreements but does not replace the pre-adjudication agreement result. AI agents may prepare packets, but they cannot count as either independent rater.

## Primary metrics

Report development and held-out results separately:

- valid recovery episode rate;
- valid executable probe rate;
- three-run reproducibility rate;
- expert causal-relevance agreement;
- false-pass and false-fail rates;
- capsule rejection/leakage and unauthorized-execution counts;
- production-worktree writes and cleanup failures;
- median and interquartile setup time and disk cost.

Use Wilson 95% intervals for binomial rates. Report every eligible patch in the denominator; typed compiler abstentions are failures for the corresponding validity rate. Report excluded candidates separately and never move them into the denominator after outcomes are known.

## Gates

- held-out valid recovery episodes: at least 80%;
- held-out valid probes: at least 70%;
- reproducible setup and judge result: at least 95%;
- expert-labeled outcome agreement: at least 90%;
- observed false passes, production writes, accepted leaks, and unauthorized executable inputs: zero;
- median setup after dependencies are present: under two minutes.

If episode validity is below 60% or probe validity below 50% after the two development iterations, narrow to explicit invariant manifests, mutation-test operators, or test-backed API boundaries. Do not hide a miss by adding UI, streaks, scalar readiness, another model, or patch-specific rules.

## Required parity and adversarial cases

Run the held-out set on protected Linux and the selected Windows backend. Include paths with spaces, concurrent twins, cancellation, descendant processes, locked files, timeout, output overflow, exact cleanup, prompt/label/order drift, cross-project refs, replayed IDs, absolute paths, controller/oracle IDs, credential fixtures, and model proposals containing code, commands, arguments, mounts, or environment values.

## Publication

Publish aggregate metrics, all typed failures, exclusions, compiler freeze commits, environment identities, rater agreement, adjudications, and confidence intervals under `docs/v0.3/results/`. Raw third-party source is not copied into PureFlow; retain only repository URLs, commit IDs, bounded evidence hashes, measurements, and license metadata.
