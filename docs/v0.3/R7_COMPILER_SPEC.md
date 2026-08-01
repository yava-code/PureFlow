# R7 rewind compiler specification

**Status:** development iteration 1, frozen before compiler execution  
**Compiler protocol:** `r7-rewind-v1`  
**Corpus:** `a4ef6cbfa48c66cb9d384bcc2834ecbfae8ff08810abfd1863b395b8aa47d149`

## Purpose

Test whether an ordinary historical TypeScript patch can be converted into executable human-control work without a model authoring code, tests, commands, mutations, or answers.

Iteration 1 uses one repository-independent operator: materialize the passing target revision, replace every changed TypeScript source file with the complete adjacent-base version, retain target tests, and execute the preregistered test command. The target versions of those source files are the protected repair.

## Frozen inputs

- only the 12 manifest patches labeled `development` may be executed or inspected while iteration 1 is evaluated;
- repository URL, pinned runtime/package manager, install/test argv, base/target commits, changed source/test paths, and evidence hashes come from the frozen corpus artifacts;
- the external clone is resolved by registered repository ID and verified at the pinned tip;
- no prompt, path, command, test, repair, exception, or mutation may vary by patch.

## Support decision

A patch is supported only when every `changedSourcePath`:

1. is a safe workspace-relative `.ts` or `.tsx` path already accepted by corpus preflight;
2. resolves to an ordinary Git blob in both base and target;
3. is not a declaration file, test, dependency, generated, vendored, build, or coverage path.

If any source path was added, deleted, or is not an ordinary blob, emit `unsupported-source-rewind`. Do not substitute a different operator during iteration 1.

## Compile plan

For a supported patch, emit an internal immutable plan containing:

- corpus/compiler identity and patch evidence hash;
- target snapshot archive hash;
- base rewind archive hash;
- protected target repair archive hash;
- sorted writable source paths and attributed test paths;
- one deterministic semantic-unit selection from the existing R2 extractor;
- exact registered install/test argv and sandbox toolchain handle;
- participant projection hash and internal plan hash.

The participant projection contains the mutated snapshot identity, writable paths, attributed tests, selected seam label, attention budget, and registered observation label. It excludes repository URL, source commits, target archive, repair archive, oracle/controller paths, command argv, host paths, and compiler outcome.

## Execution

All repository code runs in the digest-pinned R7 Docker boundary.

1. Seed a native Docker volume from the target Git archive.
2. Install dependencies with the registered install argv and bridge networking.
3. Run the registered target command once with network none; it must pass.
4. Apply the base rewind archive and verify the candidate tree hash.
5. Run the same command three clean times with network none.
6. Apply the protected target repair archive and verify the repaired tree hash.
7. Run the same command three clean times with network none.
8. Remove exact controller-owned containers, volumes, archives, and temporary roots.

No production checkout, home directory, credentials, extension storage, Git objects, model output, participant text, host executable, caller environment, or unregistered mount is available to the execution container.

## Validity

A recovery episode is valid only when:

- target setup and control pass;
- all three rewound runs fail cleanly with a nonzero exit code;
- all three repaired runs pass;
- immutable plan/tree/command identities remain stable;
- no cleanup or production invariant fails.

The executable probe is valid under the same evidence when it binds the selected semantic seam to the precommitted prediction “the registered observation fails in the rewound state.” Timeout, cancellation, launch error, output overflow, or integrity drift is an execution error, never a predicted failure.

Typed outcomes are:

- `valid`;
- `unsupported-source-rewind`;
- `unsupported-semantic-boundary`;
- `target-control-failed`;
- `mutation-did-not-fail`;
- `mutation-not-reproducible`;
- `repair-failed`;
- `integrity-failed`;
- `execution-error`;
- `cleanup-failed`.

## Development rule

Iteration 1 is evaluated on all 12 development patches. If recovery validity is below 60% or probe validity below 50%, one iteration-2 change may be made using aggregate failure categories only. No patch-specific rule is allowed. If iteration 1 clears those floors, freeze compiler source/config immediately rather than optimizing against development identities.

Held-out execution is forbidden until the freeze commit and config hash are recorded. Human rating packets must be generated for all patches without compiler status or outcomes.

## Post-run conformance record

Development iteration 1 completed on 2026-08-01 without patch-specific rules. Nine of twelve patches produced valid episodes and probes, two emitted `unsupported-source-rewind`, and one emitted `mutation-did-not-fail`. The immutable summary hash is `d4457d21be7939eee4e205d0b559e7e7ef01973df5f0a072f8d2ae4adfcc070b`. Both development floors passed, so iteration 2 is forbidden and the implementation proceeds directly to a source/config freeze.

One implementation deviation was found before the held-out freeze: target, rewind, and repair archive SHA-256 values are recorded in the hash-bound execution report instead of the pre-execution compile plan. The compile plan still binds the full target/base commits, every source blob OID, exact argv, corpus evidence, participant projection, and compiler protocol; the executor creates archives only from those bound Git objects, records each archive SHA-256 and byte length, verifies source blob identities before and after every test, and hashes the complete report. This placement does not change support, mutation, probe, repair, or outcome rules. It is disclosed rather than retroactively changing iteration 1 or rerunning an outcome-tuned compiler.
