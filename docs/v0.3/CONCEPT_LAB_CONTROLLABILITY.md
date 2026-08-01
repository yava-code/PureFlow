# Concept Lab — software controllability by construction

**Status:** post-R7 product hypothesis; not implemented and not measured  
**Date:** 2026-08-01  
**Depends on:** R7 SandboxRunner and corpus audit passing their preregistered gate

## Category shift

PureFlow should not ask whether a developer read AI-written code. It should make autonomous software **controllable by its human owner**.

The build swarm remains responsible for most code production. A parallel readiness plane compiles the smallest executable interface through which a developer can observe a failure, choose a causal action, and recover the system. The developer acts as an operator and decision owner, while a cold agent may still write every line of the intervention.

```text
AUTONOMOUS BUILD
agent change ───────────────► tested production checkpoint ─────► next task
      │                                  │
      └► recorder ─► control compiler ─► takeover cut set
                                          │
HUMAN CONTROL                              ▼
symptom ─► select evidence ─► directive to cold agent ─► sandbox judge
                                                              │
                                                              └► reusable control artifact
```

This is an inference from automation research, not a measured PureFlow result. Bainbridge's automation paradox is that removing routine work can leave the human with rarer, harder takeover work. The Parasuraman–Sheridan–Wickens model separates information acquisition, analysis, decision selection, and action implementation instead of treating automation as one scalar. NASA experiments found worse situation awareness under fully automated conflict resolution than under manual or interactive conditions, and slower failure detection when automation occupied higher-order decision stages. A 2026 randomized developer study found lower mastery under AI assistance on average, while interaction styles that retained cognitive engagement did not show the same pattern.

PureFlow's design response is therefore: automate code execution aggressively, but preserve selected evidence acquisition, causal discrimination, and recovery decisions as real project work.

## Candidate mechanisms

| Mechanism | What the human owns | What remains automated | Primary falsifier |
| --- | --- | --- | --- |
| Controllability Compiler | selects and uses an `observe → actuate → recover` surface | agents add minimal probes, reversible handles, and judge artifacts | surfaces require intrusive hooks or do not improve takeover |
| Context-Starved Relay | chooses evidence, hypothesis, expected observation, and conditional directive | a fresh agent writes the complete patch | automatic evidence policy performs equally well |
| Dissent Engine | chooses the experiment that distinguishes competing causal models | agents generate alternatives and execute the chosen experiment | natural disagreements are too rare or choices are non-discriminating |
| Takeover Cut Set | controls a small set of high-coverage seams | graph construction and route coverage | no gain over a simple blast-radius heuristic |
| Autopilot Blackout Replay | inherits a real incomplete checkpoint and decides the next diagnostic move | production agent has already continued elsewhere | replay success does not transfer to adjacent faults |
| Causal Twinboard | selects one controlled perturbation and interprets the trace delta | twin materialization, input mutation, and trace comparison | users explore randomly or traces do not isolate causes |
| Control Dividend | confirms which episode artifact becomes project infrastructure | agents turn it into a regression probe, rollback recipe, or observation handle | artifacts are unused or create maintenance drag |
| Fault-Family Portfolio | demonstrates transfer across a related failure family | scheduling and delayed judge execution | results reflect memorized mutations rather than transfer |

Streaks, points, leaderboards, random function questions, and periodic explanations may be optional engagement surfaces. None can create readiness evidence or replace executable control.

## Selected extension A — Controllability Compiler

For a critical seam, the compiler attempts to produce an immutable control surface:

```ts
interface ControlSurfaceManifest {
  schemaVersion: 1;
  projectId: string;
  checkpointId: string;
  sourceTreeHash: string;
  seamId: string;
  observers: Array<{
    id: string;
    kind: "test" | "trace" | "state-check";
    authorityHash: string;
  }>;
  actuators: Array<{
    id: string;
    kind: "approved-command" | "frozen-change" | "runtime-control";
    authorityHash: string;
    reversible: boolean;
  }>;
  recovery: { id: string; judgeSpecHash: string };
  manifestHash: string;
}

interface TakeoverCutSet {
  schemaVersion: 1;
  projectId: string;
  sourceTreeHash: string;
  graphHash: string;
  seamIds: string[];
  coveredRouteIds: string[];
  uncoveredRouteIds: string[];
  reasonCodes: string[];
  cutSetHash: string;
}
```

Controller-owned authorities reopen every observer and actuator. Model output never becomes a command, argument, path, mount, environment value, or judge.

Candidate events use a new versioned stream:

```text
control_surface.compiled
control_surface.unavailable
takeover_cut.selected
control_action.committed
control_action.observed
control_surface.invalidated
```

The first ablation compares random seam selection, current weighted selection, and takeover-cut selection under the same attention budget. Primary outcome: held-out fault routes localized and recovered. Secondary outcomes: time to first useful observation and operability overhead.

## Selected extension B — Context-Starved Relay

The participant does not manually type the repair. A fresh executor receives only evidence selected by the participant plus a committed directive; it receives neither the original build transcript nor the hidden repair.

```ts
interface RelaySession {
  schemaVersion: 1;
  id: string;
  projectId: string;
  experienceId: string;
  snapshotTreeHash: string;
  commandRegistryHash: string;
  executorProfileId: string;
  maxEvidenceRefs: number;
  maxContextBytes: number;
  judgeSpecHash: string;
}

type RelayEvent =
  | { type: "relay.started"; sessionId: string; at: string }
  | { type: "relay.evidence.requested"; sessionId: string; selectorId: string; at: string }
  | {
      type: "relay.directive.committed";
      sessionId: string;
      directiveRef: string;
      disclosedEvidenceIds: string[];
      at: string;
    }
  | { type: "relay.patch.proposed"; sessionId: string; candidateDiffHash: string; at: string }
  | {
      type: "relay.judged";
      sessionId: string;
      judgeResultHash: string;
      outcome: "passed" | "partial" | "failed" | "failed-integrity";
      at: string;
    };
```

The decisive test is an ablation against the same cold executor with an automatic evidence policy. If the automatic policy matches human-selected evidence and directives on recovery and delayed adjacent transfer, the mechanism has not shown human contribution.

## Selected extension C — Dissent Engine

Natural disagreements are high-value control moments: two agent branches pass current tests but predict different runtime behavior, a plan changes after new evidence, or a rollback reveals a hidden invariant. PureFlow asks the participant which bounded experiment would discriminate between the models, not which answer sounds better.

```ts
interface InternalDissentCase {
  schemaVersion: 1;
  id: string;
  projectId: string;
  checkpointId: string;
  sourceTreeHash: string;
  alternatives: Array<{
    id: string;
    claimHash: string;
    snapshotTreeHash: string;
    predictedObservationHash: string;
  }>;
  experimentIds: string[];
  autonomousDeadline?: string;
  caseHash: string;
}
```

Production never waits by default. If the participant skips or the deadline passes, autonomous policy resolves the branch and records that the opportunity was not human-controlled. The experiment measures the proportion of participant choices that are genuinely discriminating, integration correctness, delayed transfer per active minute, and extra compute.

## Build order after R7

1. Write `ADR-007 — Software controllability and cold relay`; freeze authority, invalidation, and evidence contracts.
2. Compile one `ControlSurfaceManifest` for the existing tenant-cache fixture without changing its hidden-answer boundary.
3. Implement a replay-only cold relay and compare it with an automatic evidence policy.
4. Add one real near-miss transcript as a `DissentCase`; keep synthetic cases labeled separately.
5. Run the three selector ablation before adding cockpit UI or gamification.
6. Only after falsification survives, integrate the control plane with a live coding-agent adapter.

## Research anchors

- Lisanne Bainbridge, [Ironies of Automation](https://doi.org/10.1016/0005-1098(83)90046-8), *Automatica* 19(6), 1983.
- Raja Parasuraman, Thomas Sheridan, and Christopher Wickens, [A Model for Types and Levels of Human Interaction with Automation](https://pubmed.ncbi.nlm.nih.gov/11760769/), *IEEE Transactions on Systems, Man, and Cybernetics* 30(3), 2000.
- NASA Ames, [Effects of Automation Types on Air Traffic Controller Situation Awareness and Performance](https://ntrs.nasa.gov/citations/20090040350), 2009.
- NASA Ames, [The Impact of Automation Assisted Aircraft Separation on Situation Awareness](https://humansystems.arc.nasa.gov/awards_pubs/publication_view.php?publication_id=1822), 2009.
- Judy Hanwen Shen and Alex Tamkin, [How AI assistance impacts the formation of coding skills](https://www.anthropic.com/research/AI-assistance-coding-skills), randomized controlled developer study, 2026.

These sources motivate the mechanism and its experiment design. They do not prove that PureFlow preserves skill; only the preregistered R7/R8 evidence can support that claim.
