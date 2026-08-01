# R7 held-out automatic audit

**Date:** 2026-08-01

**Compiler freeze commit:** `ab1ea56`

**Freeze file:** `605b645e9cc27653515665ac002a4b1d9c1e6f36c6ddf3bffbf2be4d2081a81b`

**Held-out plan file:** `ff7e17e59b90f022379105bf116f7aaf158159d3b76001f600f01afc12304e40`

**Summary:** `fe561009447e187e8c085ac499d62496816f2714fc4dcabccdb064ca97708942`

## Automatic result

| Measure | Result | Wilson 95% CI |
| --- | ---: | ---: |
| Structurally compiled | 17/18 (94.4%) | 74.2–99.0% |
| Valid among compiled executions | 16/17 (94.1%) | 73.0–99.0% |
| Valid recovery episodes, end to end | 16/18 (88.9%) | 67.2–96.9% |
| Valid executable probes, end to end | 16/18 (88.9%) | 67.2–96.9% |
| Compile-time abstentions | 1 `unsupported-source-rewind` | — |
| Dynamic rejections | 1 `mutation-did-not-fail` | — |
| Median measured execution work | 276,759 ms | — |
| Total measured sandbox work | 5,845,818 ms | — |

The preregistered automatic held-out thresholds were at least 80% valid episodes and at least 70% valid executable probes. Both passed without compiler changes after freeze. The confidence interval remains wide because this is an 18-patch held-out pilot, not a population estimate.

## Integrity and blinding

- All 17 compiled identities used compiler freeze `ab1ea56`, the same digest-pinned image, exact registered commands, and one target plus three mutation plus three repair runs.
- Frozen summarization verified every plan/result binding and every report hash before counting it.
- The independent post-run audit found zero `pureflow-r7-audit-*` containers and zero `pureflow-r7-audit-*` volumes.
- Eighteen blind expert packets were generated before execution outcomes. Packet index: `54d78382b3ddbe15cba1f8153275e8149d32ddaa5192163f99ca5f43d903e8fe`.
- Packets contain the visible source/test diff and proposed uniform rewind, but exclude source commits, compiler status, observed outcome, command argv, host paths, and protected repair.

## Gate status

The **automatic** R7 gate passed. Full R7 remains incomplete until two independent experienced TypeScript raters return ratings, disagreements are adjudicated without outcome exposure, and agreement plus expert-valid rates are joined to this report. No claim about skill retention, human takeover improvement, or product effectiveness follows from this automatic audit alone.
