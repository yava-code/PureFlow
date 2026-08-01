# R7 corpus collection result

**Status:** corpus frozen; compiler audit not run  
**Protocol:** `r7-typescript-node-v1`  
**Manifest SHA-256:** `a4ef6cbfa48c66cb9d384bcc2834ecbfae8ff08810abfd1863b395b8aa47d149`

## Outcome

The preregistered collector inspected 457 outcome-free eligibility records across 10 registered repositories and froze exactly 30 eligible adjacent patches. The split-key algorithm assigned 12 patches to development and 18 to held-out. No recovery compiler, probe compiler, model, expert rater, or participant outcome was inspected while selecting the corpus.

| Repository | Total | Development | Held-out |
| --- | ---: | ---: | ---: |
| `ts-pattern` | 10 | 6 | 4 |
| `ofetch` | 3 | 1 | 2 |
| `defu` | 2 | 2 | 0 |
| `hookable` | 4 | 2 | 2 |
| `class-validator` | 8 | 1 | 7 |
| `ufo` | 3 | 0 | 3 |
| **Total** | **30** | **12** | **18** |

The held-out set contains a repository absent from development (`ufo`). That is a genuine transfer constraint, not a post-hoc balancing decision.

## Exclusions encountered before the 30-patch stop

| First-match code | Count |
| --- | ---: |
| `missing-lockfile` | 122 |
| `base-provision-or-test-failed` | 107 |
| `dependency-or-lockfile-change` | 69 |
| `missing-attributed-test` | 22 |
| `diff-too-large` | 16 |
| `target-provision-or-test-failed` | 3 |
| **Total** | **339** |

The freezer stopped as soon as the 30th eligible patch was reached, so records after that registration/ordinal boundary were not converted into manifest exclusions. Raw third-party source and command output are not stored in this repository; committed artifacts contain URLs, revisions, bounded facts, stage booleans, and hashes.

## Collection integrity notes

- `p-queue` and `ajv` had no lockfile-backed coarse candidates in the inspected history.
- `class-transformer` had six structurally viable candidates and zero passing frozen runtime/test pairs.
- `class-validator` produced eight eligible patches after 31 provision attempts.
- `io-ts` produced zero eligible patches. For candidates whose frozen `npm run vitest` script was absent from the committed `package.json`, the controller recorded a deterministic command-unavailable failure without installing dependencies or executing repository code.
- `ufo` was capped to the three global slots still open and produced three eligible patches in three attempts.
- Aborted broad provisioning processes were replaced by bounded runs. Their exact controller-owned containers and volumes were removed; no `pureflow-r7-corpus-*` Docker resource remained after collection.
- A clean deterministic re-freeze produced the same manifest hash and byte-for-byte file SHA-256. The full extension suite passed 93/93 with the explicit provisioned Docker integration suite passing 2/2; TypeScript, production build, and VSIX packaging also passed.

## What this does not prove

This milestone proves only that the sampling, provisioning, evidence-merging, and freeze machinery can produce the preregistered corpus. R7 has not passed. Recovery/probe validity, replay reproducibility, false-pass/false-fail rates, expert agreement, Windows/Linux parity, and adversarial integrity remain unmeasured.
