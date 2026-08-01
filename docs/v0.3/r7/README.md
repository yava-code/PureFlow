# R7 corpus artifacts

This directory contains metadata and hashes only. Third-party source, dependencies, logs with absolute paths, and compiler outcomes do not belong here.

- `repositories.json` is the registration frozen before eligibility inspection.
- `preflight-<repository>.json` is emitted by the read-only Git scanner.
- provisioning evidence is collected separately from clean base/target environments.
- `corpus-manifest.json` may be created only after exactly 30 candidates have complete evidence.

From `extension/`:

```powershell
npm run r7:corpus -- scan <repositories.json> <repository-id> <external-git-clone> <new-preflight.json>
npm run r7:corpus -- provision <repositories.json> <repository-id> <preflight.json> <external-git-clone> <new-evidence.json> [prior-evidence.json]
npm run r7:corpus -- complete <preflight.json> <provision-evidence.json> <new-candidates.json>
npm run r7:corpus -- merge <candidates.json> <candidates.json> [...] <new-candidates.json>
npm run r7:corpus -- freeze <repositories.json> <candidates.json> <new-manifest.json>
```

Every output command refuses to overwrite an existing artifact. The scanner never checks out a revision or runs repository code. Provisioning and execution remain separate so a static scan cannot manufacture a passing test result.

Provisioning uses at most three isolated native Docker-volume workspaces concurrently. Host bind-mounted dependency trees are forbidden because their Windows filesystem cost distorted setup time; the host provides only a read-only Git archive during seeding. This bound is a throughput setting, not a sampling rule; each container retains its own workspace, exact registered argv, resource limits, and network mode.

For pnpm repositories, the controller installs the registered pnpm version into the candidate's Corepack cache, disables project-version substitution, creates `/work/.pureflow-bin` with an exact shell-free `mkdir` invocation, and enables a disposable shim there. This bootstrap is hashed separately from the unchanged registered install/test argv. Provision artifacts expose typed install/test booleans for diagnosis while retaining command output only as bounded hashes.

Resume evidence is immutable input, never overwritten. The provisioner skips recorded targets, advances in ordinal order, and sizes each batch to the remaining eligible slots so it never executes a candidate after the tenth passing base/target pair.

The first registration pass found no lockfile-backed coarse candidates in `p-queue` or `ajv`. Under the preregistered replacement rule, `ofetch`, `defu`, and `hookable` were appended before any compiler outcome was inspected. Registration array order is sampling order; the freezer stops once 30 eligible patches exist and never uses more than 10 from one repository.

That replacement pass produced 19 eligible patches: 10 from `ts-pattern`, 3 from `ofetch`, 2 from `defu`, and 4 from `hookable`. Before inspecting any compiler outcome, `class-transformer` and `class-validator` were appended in that order as MIT-licensed npm replacements with committed lockfiles and deterministic, non-browser Jest commands. Their history is inspected only after this registration change is committed.

Provisioning then showed that all six structurally viable `class-transformer` candidates fail the frozen runtime/test boundary, so none can enter the corpus. Before any compiler execution, `io-ts` was appended after `class-validator` as the next MIT-licensed npm replacement. Its registered command runs only the repository's deterministic Vitest suite; lint, documentation generation, release tasks, and performance tests are outside the R7 execution boundary.

`class-validator` exhausted 31 provisioned candidates with 8 eligible results, bringing the preregistered total to 27. Static inspection after `io-ts` registration showed its frozen `vitest` script exists for only the newest structurally viable historical candidate; the command is not changed after that observation. Before compiler execution, `ufo` was appended as the next MIT-licensed replacement with a lockfile-pinned pnpm toolchain and a direct Vitest/typecheck command that excludes lint, build, release, and documentation tasks.

Before provisioning, the selected digest was capability-probed as Node `22.17.0`, npm `10.9.2`, and Corepack `0.33.0`; the registration metadata was corrected from the planned Node/npm patch versions to those observed immutable-image versions. No repository tests or PureFlow compiler outcomes had been run.
