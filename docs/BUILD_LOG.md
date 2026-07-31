# Build Log

This is a concise chronological record of material implementation work and runtime evidence. It is not a substitute for Git history; it captures intent, verification, and blockers that a commit alone may not explain.

## 2026-07-31 — R7 sandbox selection and corpus preregistration

- Selected digest-pinned Linux containers through Docker Desktop/WSL2 as the first replaceable Phase-B backend in ADR-003. The decision fixes prerequisite detection, explicit provisioning, mount policy, read-only oracle delivery, resource limits, cancellation/cleanup, image identity, and fail-closed behavior.
- Started Docker Desktop through its supported CLI and ran a real disposable Windows capability audit against `node@sha256:b04ce4ae4e95b522112c2e5c52f781471a5cbc3b594527bcddedee9bc48c03a0`. The probe observed network failure under `network=none`, read-only root, no undeclared mounts, `EROFS` on the oracle with unchanged host hash, 128 MiB/0.5 CPU/64 PID limits, all capabilities dropped, `no-new-privileges`, terminal container kill, and exact removal.
- Froze the R7 sampling and analysis protocol before compiler outcomes: deterministic first-parent eligibility, 30 patches across at least three repositories, hash-assigned 12-patch development and 18-patch held-out sets, two independent human raters, Wilson intervals, adversarial cases, thresholds, and explicit narrowing rules.
- Protected PR #16 run `30672257419` passed the required Linux, Windows, contract, web, and policy checks for the ADR/protocol change. No Docker `SandboxRunner`, corpus patch, compiler result, or human rating exists yet. Arbitrary code remains disabled and R7 has not passed.

Evidence: `docs/v0.3/ADR-003-DOCKER-DESKTOP-SANDBOX.md`, `docs/v0.3/R7_PREREGISTRATION.md`, local Docker Desktop/Engine/image inspection, and the disposable capability output recorded in ADR-003.

## 2026-07-31 — R4.5 fixture-only Control Pulse accepted

- Implemented exact bounded Change Claim, participant/internal probe, Side Coach capsule/proposal, attempt, and result contracts. Claim, probe, attempt, command result, and probe result identities use their normative domain-separated hashes.
- Added one immutable Explain-to-Break catalog input for the reviewed tenant-isolation fixture. The participant commits a prediction before observation; execution can resolve only the catalog-owned `mutated` state and declared tenant-isolation check through `TrustedFixtureRunner`.
- Kept controller bindings out of participant serialization and model context. The Side Coach receives only capped participant-visible excerpts with evidence IDs, local paths, and known credential shapes removed; its output cannot become code, paths, arguments, environment, or tests.
- Six R4.5 tests pass locally on Windows. They cover golden hashes, exact projection, evidence/privacy bounds, model proposal isolation, precommit ordering, result invariance to prose, catalog-only execution, replay/cross-project/late rejection, and timeout/cancellation/runner-error invalidation. The complete extension suite passes 63/63; TypeScript, production build, and VSIX packaging pass. Protected PR #15 run `30671499103` passed the required Linux, Windows, contract, web, and policy checks, so R4.5 acceptance is complete.

Evidence: `extension/src/pulse/`, `extension/test/control-pulse.test.ts`, local command/package output on 2026-07-31, and protected GitHub Actions run `30671499103` on PR #15.

## 2026-07-31 — R4 Experience Compiler and Phase-A Judge accepted

- Added deterministic seam selection over fully supported R2 evidence and compiled the real R1/R2 fixture path into separate internal and participant recovery manifests. The participant projection is exact-schema and omits source revisions, run identity, setup, judge internals, hidden repair, production paths, and controller handles.
- Added a Phase-A judge that reopens the project-scoped snapshot and immutable command registry, verifies the participant Git boundary, computes the candidate diff, rejects protected or out-of-scope edits, and evaluates only an exact catalog-owned known repair in a separate clean evaluation twin. No-op and unrelated candidates never reach command execution.
- Added project-scoped command-evidence persistence with canonical metadata, bounded base64 payloads, hash/size verification, and tamper rejection. Reveal and abandonment remain explicit outcomes without executable readiness evidence.
- Seven R4 tests pass locally on Windows, including three byte-identical judge replays and evidence-store reopening/tamper cases. The complete extension suite passes 57/57; `npm run check`, production build, and VSIX packaging pass. Protected PR #14 run `30670322126` passed the required Linux, Windows, contract, web, and policy checks, so R4 acceptance is complete.

Evidence: `extension/src/experience/`, `extension/src/judge/`, `extension/src/twin/{commands,snapshot}.ts`, `extension/test/experience-judge.test.ts`, local command/package output on 2026-07-31, and protected GitHub Actions run `30670322126` on PR #14.

## 2026-07-31 — R3 Takeover Twin local candidate

- Implemented a controller-owned `SnapshotStore` that starts from the verified fixture target, applies the catalog mutation, creates a sanitized standalone one-commit participant repository, and re-verifies tree hashes, commit identity, ownership, remotes, reflogs, and Git alternates before materialization.
- Added an opaque Twin Manager with separate uniquely named twin/evaluation directories and explicit `preparing → ready → running → completed/failed → cleaning → cleaned` lifecycle. Cleanup resolves and checks both exact controller-owned paths before recursive removal.
- Added the immutable fixture command registry, extension-owned catalog, hash-pinned `fixture-node` resolution, bounded command evidence, tombstoned execution IDs, independent cancellation, scrubbed child environment, and full process-tree termination. Every non-fixture request, caller manifest/runtime/path, unknown command, and undeclared tree state fails before execution.
- Moved the committed fixture from the excluded test tree into packaged extension assets after a VSIX audit found it would otherwise be absent at runtime. The package now contains all three candidate states plus controller-only mutation, repair, harness, and oracle assets.
- Seven R3 tests pass locally on Windows, including a real descendant-process kill in a path with spaces. The complete extension suite passes 50/50; `npm run check`, production build, and VSIX packaging pass. The first protected Windows run exposed missing LF policy after the fixture moved from `test/` to packaged assets; `.gitattributes` now pins the new path. Protected PR #13 run `30668675359` then passed all required Linux, Windows, contract, web, and policy checks, so R3 acceptance is complete.

Evidence: `extension/src/twin/{types,catalog,snapshot,manager,commands}.ts`, `extension/fixtures/v0.3/tenant-cache-key/`, `extension/test/twin.test.ts`, local command/package output on 2026-07-31, and protected GitHub Actions run `30668675359` on PR #13.

## 2026-07-31 — R2 change evidence accepted

- Added a bounded read-only Git revision reader that verifies full base/target commit IDs, parses NUL-delimited name status plus zero-context hunks, detects renames, caps source and revision size, and keeps every emitted path workspace-relative.
- Added TypeScript compiler-API extraction for functions, arrow/function variables, classes, methods, and explicit module boundaries. Removed and added logical lines are hashed rather than stored; syntax failures and unsupported languages remain explicit results.
- Added deterministic evidence assembly behind the exact `ExtractionResult`, `SemanticUnit`, and `CandidateSeam` contracts. Fixture-manifest check links are authoritative, matching Flight Recorder before/after hashes and evidence refs are verified, unknown readiness factors stay `null`, and missing evidence becomes a gap rather than a fabricated score.
- Corrected the checked replay transcript's file hashes, command ID, and test ID to the actual R0 fixture identities so R1→R2 integration can be verified rather than merely shaped correctly.
- Added six R2 tests covering the real cache-key revision pair, golden unit/seam IDs, file rename, multi-file changes, added/deleted functions, a class boundary, Git hunk parsing, unsupported syntax/language, missing links, unsafe paths, and revision/run identity drift.
- Local Windows evidence: `npm run check`, all 43 extension tests, production build, and VSIX packaging passed. Protected PR #12 run `30666648522` then passed `extension`, `extension-windows`, `contract`, `web`, and `jules-rnd-policy`.

Evidence: `extension/src/change/`, `extension/test/change-evidence.test.ts`, the checked agent transcript, `docs/v0.3/CONTRACTS.md`, local command output on 2026-07-31, and protected GitHub Actions run `30666648522` on PR #12.

## 2026-07-31 — R1 replay and Flight Recorder accepted

- Implemented the exact schema-v1 `AgentTask`, `AgentWorkspace`, `AgentRun`, `AgentDriver`, `RunEvent`, `RunEnvelope`, `RunRecorder`, and `TaskStore` boundaries behind a checked, credential-free replay driver.
- Added canonical JSONL serialization, strict sequence and terminal ordering, execution identity checks, project-scoped evidence ownership, bounded evidence metadata, task-intent hashing, opaque local-handle omission, range reads, and extension-owned filesystem persistence.
- Added a checked seven-event fixture transcript and ten R1 tests. The tests reject sequence gaps/duplicates, late events, command identity mismatches, cross-project evidence, absolute paths, identity drift, noncanonical lines, unsorted redactions, oversized stored evidence, unknown fields, and unbounded task intent. Failed and cancelled runs do not invent a target revision.
- Renamed the raw event layer from `Chronicle` to **Flight Recorder** before publication because OpenAI now uses Chronicle for screen-derived Codex memory. ADR-005 distinguishes the raw controller ledger from a possible participant-facing Flight Log.
- Compared current official Codex App Server, ACP, Cline SDK, OpenCode server, and Claude Managed Agents interfaces. ADR-006 selects exact-version Codex App Server over local stdio for the first live spike and ACP as the next portability boundary; no generic agent loop or vendor event union enters the domain contract.
- Local Windows evidence: `npm run check`, all 37 extension tests, production build, and VSIX packaging passed. Protected PR #11 run `30665384997` then passed `extension`, `extension-windows`, `contract`, `web`, and `jules-rnd-policy`. The packaged Microsoft Store Codex executable was discoverable but returned `Access denied` from the repository shell, so no live adapter success is claimed; its future preflight must require an accessible exact-version CLI and fail closed otherwise.

Evidence: `extension/src/agent/`, `extension/src/recorder/`, `extension/test/flight-recorder.test.ts`, `docs/v0.3/ADR-005-FLIGHT-RECORDER-NAME.md`, `docs/v0.3/ADR-006-CODEX-APP-SERVER-ADAPTER.md`, local command output on 2026-07-31, and protected GitHub Actions run `30665384997` on PR #11.

## 2026-07-31 — R0 deterministic fixture accepted

- Added the dependency-free `tenant-cache-key` fixture with fixed base, target, and mutated trees; controller-owned harness, oracle, mutation, and known repair; fixed SHA-1 Git identity, timestamps, branch, LF policy, and golden revisions/hashes.
- Added a fixture factory that creates a standalone repository from an empty temp directory, proves base/target/mutation/repair behavior through the pinned runtime, and removes only its validated temp root while preserving the source repository snapshot.
- Added an official Node `v22.17.0` artifact catalog and provisioner for Windows x64 and Linux x64. Download and executable hashes are pinned; the runtime is stored outside Git/VSIX payloads, rehashed on open, executes `--version`, and must not alias `process.execPath`.
- Local Windows evidence: `npm run check` passed, all 27 extension tests passed, production build passed, and the VSIX packaged at 668 KB. Protected PR #10 run `30663623200` then passed `extension`, `extension-windows`, `contract`, `web`, and `jules-rnd-policy`; Linux and Windows both provisioned their pinned standalone runtime and reproduced the fixture behavior. R0 acceptance is complete.
- Refreshed research on cognitive forcing, adaptive support, and AI productivity. Added agent near-miss replay, evidence escrow, decision-stage rotation, control reserve, and a deferred learned autonomy policy as falsifiable concepts. None is represented as implemented or effective.

Evidence: `extension/test/fixture.test.ts`, `extension/src/twin/fixture-factory.ts`, `extension/src/twin/fixture-runtime.ts`, `extension/fixture-node-artifacts.json`, local command output on 2026-07-31, and protected GitHub Actions run `30663623200` on PR #10.

## 2026-07-26 — Control Pulse architecture and R0a foundation

- Pivoted the random-function idea into semantic Recall Probes: randomness is allowed only inside a high-value seam set selected by blast radius, surprise, evidence, novelty, and future takeover value.
- Accepted event-driven, non-blocking Control Pulses and Explain-to-Break. Agents continue working; a bounded Side Coach can structure a developer answer or propose a falsifier, but only executable evidence can adjudicate it.
- Rejected points for manual lines and a public understanding leaderboard. Deferred a weekly participation streak and evidence-backed Flight Log achievements until a human pilot shows they do not reward easy-task farming.
- Closed five R0 contract ambiguities found by an independent implementation audit: structured candidate diffs, catalog-owned fixture blobs, standalone Node `v22.17.0`, declared test IDs, and SHA-1 Git object format.
- Added a separate R4.5 gate so Control Pulses cannot bypass the recovery contracts: claims/capsules are bounded and sanitized, external model output is non-executable, and fixture probes can select only catalog-owned state/check pairs. Reframed the first H5 interaction pilot as feasibility-only; delayed transfer is mandatory in the powered decision.
- Implemented RFC 8785 canonical JSON, raw and domain-separated SHA-256, UTF-8 tree ordering, exact fixture types, candidate/manifest hashing, and fail-closed validation under `extension/src/rnd` and `extension/src/twin`.
- Added ten tests with the official RFC 8785 serialization and UTF-16 ordering vectors, number edges, SHA-256 and PureFlow golden hashes, domain separation, portable-path rejection, exact-schema enforcement, state-scoped commands, canonical set ordering, timestamp validation, and runtime mismatch rejection.
- Pinned GitHub verification to Node `22.17.0` on Linux and Windows. Local `npm run check` and all 23 extension tests passed. The committed fixture/factory and standalone runtime artifact remain R0b work; no arbitrary code execution or complete R0 claim was made.
- Preserved superseded v0.2 and obsolete Jules histories as archive tags, then deleted their remote branches. `main` and `codex/shadow-cockpit-rnd` are the only intended persistent branches after infrastructure PR #8 is explicitly merged and removed.
- Activated a second exact-branch GitHub ruleset for `codex/shadow-cockpit-rnd`: PR-only integration, no deletion or force-push, up-to-date base, conversation resolution, and five GitHub Actions checks including Windows and the Jules R&D policy. This ledger update is the first short-lived-head canary of that flow.

Evidence: `docs/v0.3/ADR-004-EPISTEMIC-CHECKPOINTS.md`, `docs/v0.3/CONTRACTS.md`, `extension/test/canonical.test.ts`, extension check/test output, and remote archive tags.

## 2026-07-26 — v0.3 contract hardening and handoff audit

- Ran four independent go/no-go passes over the R0–R4 handoff and closed every P0/P1 documentation blocker found.
- Split the finite, repository-owned `TrustedFixtureRunner` from the future untrusted-code `SandboxRunner`; no arbitrary participant or corpus code can execute before ADR-003 proves the required isolation capabilities.
- Added immutable sanitized snapshots, a trusted fixture catalog, manifest and command-registry identities, unique per-invocation `ExecutionId`, bounded/redacted evidence metadata, RFC 8785 domain-separated hashing, explicit extraction failure types, external oracle handling, and concurrency/cancellation semantics.
- Removed the R0→R3 acceptance cycle and fixed the dependency graph to `R0 → R1/R2/R3 → R4`.
- Added a finite R0→R4 Jules work queue with paginated active-session/open-PR preflight, one non-retried session create, same-repository policy provenance, strict path/file/byte/line policy, pinned Actions, and Linux/Windows verification. Plan approval is on by default; merge remains manual until an independent immutable verifier exists. Scheduled continuation remains inactive until its separate infrastructure PR reaches the default branch.
- Published `codex/shadow-cockpit-rnd`; the branch-push dispatcher run was skipped with the enable variable absent, proving that no canary session started accidentally. Opened draft infrastructure PR #8 for the default-branch scheduler. GitHub requested owner reauthentication before saving branch rules, so protections and the canary remain deliberately inactive.
- Final audit verdict: `GO` for the fixture-only R0–R4 mechanism. No runtime was implemented; real-repository feasibility and human takeover remain unproven and gated.

Evidence: `docs/v0.3/CONTRACTS.md`, `ADR-002-EXECUTION-PHASES.md`, `AGENT_EXECUTION.md`, and `docs/PROJECT_STATE.md`.

## 2026-07-25 — v0.3 Dual-Control R&D reset

- Rejected explanations, post-run questions, comprehension gates, and manual `TODO` handoffs as the product core; reviewed products already implement those primitives and they do not restore full causal control.
- Reviewed human-automation, skill-retention, active-learning, coding-specific, code-review, and operational-drill evidence. Recorded primary sources and limitations in `docs/v0.3/RESEARCH.md`.
- Compared six distinct product mechanisms and selected a dual-output Experience Compiler: autonomous agents produce the software patch while a parallel readiness plane produces an executable human control episode.
- Defined the Takeover Twin, Evidence Judge, local readiness ledger, attention scheduler, line-level evidence graph, and feedback into future delegation.
- Added a falsifiable experiment program centered on delayed AI-off adjacent-task success, not confidence or quiz scores.
- Added an agent-executable vertical-slice plan with exact modules, contracts, acceptance checks, safety boundaries, dependencies, and stop gates.
- Created the work on a clean `codex/shadow-cockpit-rnd` branch from `origin/main`. No v0.3 runtime was implemented and no target metric was represented as observed evidence.

Evidence: `prd.md`, `docs/v0.3/THESIS.md`, `RESEARCH.md`, `CONCEPTS.md`, `ADR-001-DUAL-CONTROL.md`, `CONTRACTS.md`, `EXPERIMENTS.md`, and `AGENT_EXECUTION.md`.

## 2026-07-20 — RepRegistry live on Monad Testnet

- Safe `0x0Eb17425255d826e1FbAF5c473A238bB3EAd8a92` (2-of-3: user owners + agent).
- User confirmed Safe tx; execution `0x276f429828678d7cc9270f8a61f55fb7bd6d8c1470728940a06c8ab1ffd92b75`.
- `verify:deployment` → contract `0xB51B276e6Ee9Cad8181C368bbF6d6efB82c154c8`, 887-byte runtime hash match.
- Source verify API: monadscan Pass + monadvision success.
- Configured `VITE_REP_REGISTRY_ADDRESS` (web `.env.production`) and extension/distribution defaults.
- Spark remaining: demo video URL + form submit + eligibility.

## 2026-07-20 — Spark submit packet

- Confirmed agent wallet funded (1 MON); no Safe yet (`~/.monskills/multisig.json` absent; Safe API `safes: []`).
- Wrote `docs/SUBMIT_NOW.md` with rule checklist, form copy-paste, demo timing, and owner blockers (2 addresses + video + eligibility).
- Updated `docs/submission.md` and demo-script close for honest contract state.
- Product already satisfies hosted URL + public repo + live features; contract address and demo video remain owner-driven (Monskills Safe policy).

## 2026-07-19 — Companion brand: coding muscles + live pixel field

- Studied BuildAnything showcase competitors (games/walls/mints dominate); positioned PureFlow as daily IDE for AI skill-atrophy personal problem.
- Applied Impeccable / Spark anti-slop constraints: no gradient text, no fake metrics, no Inter monoculture, distinctive mineral+pixel brand on companion only.
- Canvas `PixelField` with animated dither cascade (reduced-motion safe); pixel mark; problem / contrast / loop / rules narrative for 3-minute judge path.
- Original slogan restored on public surface: **Keep your coding muscles.**

Evidence: web check/build after this entry.

## 2026-07-19 — Knowledge restoration polish + product depth

- Reframed Focus/Mentor as reclaiming fluency on real workspace code; unified live naming to Focus Rep (retired user-facing Pure Mode strings).
- Docs: prefer VS Code Simple Browser; external open remains available.
- Coach: QuickPick presets for Groq / OpenAI / custom OpenAI-compatible; SecretStorage only for keys.
- Distribution: deeper `settings.json` (inline suggest off, editor discipline), `keybindings.json`, broader launcher AI disables, builder product naming + keybindings copy.
- Web companion: mineral pixel field (reduced-motion safe), practice-rules band, problem-aligned hero copy; anti-slop (no gradient text, no fake metrics).
- Commitment policy flags in hash; Monad/Focus UI explains what onchain can and cannot prove.
- Owner idea dump: `docs/IDEAS_BACKLOG.md` (do not treat as shipped).

Evidence: commits after this entry; run `extension` check/test and `web` test/build.

## 2026-07-19 — Repository and product foundation

- Initialized the public Git repository and pushed `main` to `yava-code/PureFlow`.
- Converted the initial concept into product, design, architecture, Spark, submission, and demo documents.
- Installed the requested Monskills and Impeccable skill packages in the workspace.
- Chose a portable VSCodium distribution plus bundled extension over maintaining a deep editor fork.

Evidence: commits `14a1aaa`, `7463632`.

## 2026-07-19 — Rep workflow and Monad contract

- Implemented the privacy-safe `RepRegistry` contract and four Hardhat tests.
- Implemented Rep state, evidence, recall, finish, defense, export, and commitment preparation in the extension.
- Kept configured AI offline during active Reps and keys in SecretStorage.

Evidence: commits `1258170`, `05cd25b`.

Blocker at this milestone: the available agent wallet had `0 MON`, so no deployment or fake transaction state was produced. The later faucet entry supersedes this balance state.

## 2026-07-19 — Portable distribution and companion

- Added reproducible Windows VSCodium download/build/package scripts.
- Built a portable release locally and exercised the end-to-end old Rep flow in the real GUI.
- Added the Spark/GitHub Pages companion and CI workflows.
- Fixed portable launch and responsive issues found during runtime testing.

Evidence: commits `a3f6d03`, `70109ae`, `423b486`.

## 2026-07-19 — IDE-first correction

- Product review found that the full-page training console displaced the editor and resembled local LeetCode.
- Reframed PureFlow as a daily IDE: native editor/Explorer/terminal first; Workspace, Mentor, Focus, and Monad in a compact sidebar.
- Generated and inspected `docs/design/ide-workspace-concept.png` as the implementation reference.
- Began removing the central webview, adding native IDE actions, expanding the mentor, creating a distribution theme, and implementing read-only Monad tools.

Evidence: commit `0b16a17`; implementation work continues in the following commits.

## 2026-07-19 — Durable handoff and acceptance contract

- Added `AGENTS.md`, `docs/END_GOAL.md`, `docs/PROJECT_STATE.md`, `docs/DECISIONS.md`, and this chronological log so future agents can distinguish product invariants, current state, decisions, and evidence.
- Recorded the external deployment and Para authentication blockers instead of leaving them implicit in chat history.

Evidence: commit `3386fbe`.

## 2026-07-19 — Native IDE host and Monad read tools

- Removed the PureFlow central `WebviewPanel` path; opening the workbench now reveals only the Activity Bar `WebviewView` and leaves the editor active.
- Added native open-folder, terminal, test, and source-control commands, workspace/Git context, explicit selection/current-function mentor actions, and a clickable status-bar item.
- Added the PureFlow Mineral theme and distribution defaults without toggling Zen Mode.
- Added a timeout-bounded Monad Testnet RPC client, chain-health snapshot, address/transaction inspector, read-only Project Doctor, and six Monad unit tests.
- Re-ran strict TypeScript and the full extension unit suite after the host implementation: 10/10 tests passed across two files.

Evidence: commit `626be60`; verification rerun on 2026-07-19.

Remaining risk: the production bundle, VSIX, and portable GUI still require a post-pivot rebuild and smoke test.

## 2026-07-19 — Compact workbench and project starters

- Replaced the wide Rep UI with the compact Workspace, Mentor, Focus, and Monad route structure.
- Kept Focus fully available while making Workspace the startup route and ordinary coding independent of any Rep.
- Added native project creation for empty, strict Node + TypeScript, and Monad + Hardhat starters.
- Applied safe portable product naming and window title branding while preserving upstream VSCodium runtime identifiers.

Evidence: commits `83e51c6`, `7bfda0b`.

## 2026-07-19 — IDE-first documentation sync

- Rewrote README, architecture, Spark alignment, submission packet, demo script, and process notes around the implemented daily-IDE hierarchy.
- Updated Project State with completed work, ordered next actions, exact blockers, test evidence, and commit ledger.
- Changed the demo order to normal project editing, explicit mentor actions, live Monad inspection, then optional Focus.
- Removed all planned publish/verify steps from the demo until the contract and wallet blockers are cleared.
- Confirmed <https://yava-code.github.io/PureFlow/> returned HTTP 200 before retaining it as the public app URL.

Evidence: documentation working tree on 2026-07-19; milestone commit pending.

## 2026-07-19 — Security-hardened portable runtime

- Independent runtime review found two privacy/trust defects before release: loose files could expose an absolute path label, and an untrusted workspace could override network-facing settings.
- Added basename/workspace-relative path sanitization, removed the unused document URI from sidebar state, and added three regression tests.
- Changed Restricted Mode support from unrestricted to `limited`, restricted six workspace configurations, and disabled configured coach calls until the workspace is trusted.
- Made the Windows builder fail closed on every npm exit code, remove a stale same-version VSIX before packaging, and prefer `tar.exe` over the much slower `Expand-Archive` path.
- Built a fresh portable release at `release/ide-secure/PureFlow-win32-x64-1.126.04524` in 142.4 seconds. The clean gate passed TypeScript, 13/13 extension tests, VSIX packaging, checksum verification, extraction, and extension installation.
- Inspected the installed portable: `PureFlow` / `PureFlow IDE` branding, PureFlow Mineral theme, launcher and executable, `yava-code.pureflow@0.1.0`, `limited` trust, and all six restricted settings were present.

Evidence: commit `d53e6c2`; fresh ignored build under `release/ide-secure/`.

## 2026-07-19 — IDE-first companion and proof protocol

- Rebuilt the public companion around the daily IDE, interactive Workspace/Mentor/Focus/Monad preview, and live Monad Testnet health.
- Added a capped and allowlisted `#attest=` handoff. It drops unknown fields and labels the payload structurally valid but unauthenticated and **Prepared, not published**.
- Added stale-request invalidation to registry reads, six proof tests, Pages test gating, responsive layout, and complete keyboard/ARIA tab behavior.
- Browser-checked desktop and 390 px mobile layouts, zero horizontal overflow, live chain ID `10143`, proof handoff, Arrow-key route navigation, and no application console errors.
- Confirmed the `Verify` and `Deploy companion` workflows for `1f27790` completed successfully. The deployed Pages HTML returned HTTP 200 with the IDE-first title and without the superseded manual-practice metadata.

Evidence: commit `1f27790`; extension 13/13, web 6/6, contract 4/4.

## 2026-07-19 — Public v0.1.0 release

- Archived the clean portable build and verified 5,775 archive entries including `PureFlow.cmd`.
- Published GitHub release <https://github.com/yava-code/PureFlow/releases/tag/v0.1.0> with the Windows portable ZIP and extension-only VSIX.
- Verified the public release API reports both uploaded assets and that `/releases/latest` responds successfully.

Portable asset:

- file: `PureFlow-win32-x64-0.1.0.zip`;
- size: `239233919` bytes;
- SHA-256: `651239343DAC42CD8D919EF78E115DE79E14983BB212F6208EC8D5C143FE13A5`.

VSIX asset: `pureflow-0.1.0.vsix`, `679470` bytes.

## 2026-07-19 — Spark rules audit

- Re-read the official Spark page instead of relying on inferred hackathon conventions.
- Confirmed the 2026-07-19 23:59 UTC deadline, required Problem/Solution/project/repository/category/contract/video fields, public repository expectation, three-minute video cap, and AI-agent checks for placeholder data and suspicious commit history.
- Kept contract address and video explicitly pending. A social post is required only for the Most Viral Solution prize.
- Recorded stable finalized Testnet demo fixtures in `docs/demo-script.md` rather than inventing live-looking values.

## 2026-07-19 — Testnet funding and Safe boundary

- Confirmed the encrypted agent wallet address `0xe0D9466626be495C8ECC339E6866f72E9dad06C9` without exposing its private key.
- Claimed 1 Testnet MON through the Monskills agent faucet. Transaction `0x5c7939c6e0d9798e21a3708ab8ca406a45a76b88092c0236d8895a32315d9af6` succeeded in block `46343837`, and a follow-up balance read returned 1 MON.
- Re-read the installed wallet policy and recorded the write boundary: only Safe creation may be broadcast directly; contract deployment and later calls must be proposed through the supplied wrapper and approved by the owner.
- Replaced the obsolete zero-balance blocker with the actual missing input: two public owner addresses for a 2-of-3 Monad Testnet Safe. No private key is requested or stored.

Evidence: successful faucet receipt and balance read on 2026-07-19; onchain deployment remains pending.

## 2026-07-19 — Safe-governed deployment tooling

- Removed the direct EOA account hook from Hardhat's Monad network configuration.
- Added read-only preparation for the production `RepRegistry` creation bytecode and the exact installed Monskills `propose.sh` handoff; no project-owned proposer or broadcast path was added.
- Added read-only receipt validation that decodes the indexed CreateCall `ContractCreation(address)` event, rejects unrelated receipts, requires chain ID `10143`, and compares deployed runtime code byte-for-byte with the production artifact.
- Canonicalized Hardhat and Foundry production output by matching Solidity `0.8.28`, Cancun EVM, optimizer settings, and source-independent metadata. Verified identical 915-byte creation and 887-byte runtime code.
- Added an all-explorer verification request builder that refuses to emit standard JSON/compiler metadata unless Foundry and Hardhat bytecode match.
- Updated the Monad sidebar pending-state copy to name Safe deployment and source verification instead of the superseded zero-funding condition.
- Re-ran the contract gate: 4/4 Solidity tests and 8/8 Node deployment-tool tests passed. A finalized but unrelated Testnet receipt correctly failed with `Receipt has no CreateCall ContractCreation event`.
- Re-ran extension TypeScript, 13/13 tests, and the production bundle after the pending-state copy change.

Evidence: commits `7bcc05c`, `a964032`; onchain Safe creation still awaits two public owner addresses.

## 2026-07-19 — Final handoff verification

- Pushed the complete IDE-first documentation and agent handoff in commit `0ac01b8`.
- Confirmed GitHub's `Verify` workflow completed successfully for that commit across extension, contract, and web jobs.

Evidence: <https://github.com/yava-code/PureFlow/actions/runs/29700801939>.

## Logging convention

Append an entry after each material milestone with:

- user-visible outcome;
- architectural consequence, if any;
- tests or runtime evidence;
- commit or public URL;
- honest blocker or remaining risk.

### Milestone: Documentation Layout and Focus Safety

- Added `openDocsSideBySide` configuration using `vscode.ViewColumn.Beside`.
- Created safety gate requiring developers to manually record recall context before loading external documentation during an active Focus Rep.
