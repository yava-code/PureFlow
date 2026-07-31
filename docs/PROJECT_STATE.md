# Project State

Last updated: 2026-07-31

## Current branch milestone — R3 Takeover Twin complete

Branch `codex/shadow-cockpit-rnd` resets the product R&D thesis around **Dual-Control Development**.

- Autonomous coding remains the production engine.
- The selected research mechanism is an Experience Compiler that creates a parallel executable Takeover Twin from a high-value seam in the current agent change.
- Tests and runtime behavior judge human prediction, intervention, recovery, and delayed transfer.
- Scoped readiness evidence is intended to influence future experience selection and later delegation policy.
- ADR-004 defines event-driven Control Pulses: agents keep working while a developer predicts, falsifies, chooses evidence, or defends one high-value seam. A bounded Side Coach may structure the answer but cannot create readiness evidence.
- Research, alternative concepts, ADR, experiments, and an agent-executable vertical-slice plan are recorded in `prd.md` and `docs/v0.3/`.
- R0a now implements RFC 8785 canonical JSON, domain-separated SHA-256, UTF-8 path ordering, tree/candidate/manifest hashes, the versioned fixture types, and fail-closed manifest validation. Ten R0a tests pass on this Windows checkout, bringing the extension suite to 23/23.
- R0b now has a committed dependency-free `tenant-cache-key` fixture, deterministic Git factory, fixed base/target revisions and state-tree hashes, controller-owned mutation/repair/harness/oracle blobs, and a separately downloaded hash-pinned Node `v22.17.0` runtime. On this Windows checkout, base and target checks pass, the mutation fails the declared tenant-isolation check, the known repair returns the exact target tree to green, and cleanup preserves the source repository snapshot.
- The full local Windows extension suite passes 27/27 with `npm run check`, build, and VSIX packaging. Protected PR #10 run `30663623200` independently reproduced the exact fixture/runtime behavior on Linux and Windows; all five required checks passed, so R0 acceptance is complete.
- R1 implements the schema-v1 `AgentDriver` boundary, checked replay driver, canonical task-intent storage, and append-only local Flight Recorder behind injected storage and evidence-ownership interfaces. Ten R1 tests cover deterministic replay, canonical round trips, sequence/execution/identity violations, cross-project evidence, path and size bounds, failed/cancelled honesty, persistence, range reads, and secret/local-handle omission.
- The full local Windows extension suite passes 37/37 with `npm run check`; the production bundle and VSIX package also pass. Protected PR #11 run `30665384997` independently passed `extension`, `extension-windows`, `contract`, `web`, and `jules-rnd-policy`, so R1 acceptance is complete.
- R2 implements bounded Git revision diffs, zero-context changed-line extraction, TypeScript compiler-API symbol resolution, explicit fixture check linkage, Flight Recorder hash/attribution validation, and exact `ExtractionResult` / `SemanticUnit` / `CandidateSeam` outputs. It fails to `partial` or `unsupported` for missing links, syntax failures, unsupported languages, or incomplete coverage instead of inventing an invariant.
- Six R2 tests cover the real cache-key fixture, cross-run determinism and golden IDs, file rename, multi-file changes, added/deleted functions, class boundaries, Git hunk parsing, unsupported syntax/language, missing checks, unsafe paths, and revision/run drift. The full local Windows extension suite passes 43/43 with TypeScript, build, and VSIX packaging. Protected PR #12 run `30666648522` passed `extension`, `extension-windows`, `contract`, `web`, and `jules-rnd-policy`, so R2 acceptance is complete.
- R3 now implements the fixture-only sanitized snapshot store, standalone one-commit participant repository, opaque Twin Manager, immutable command-registry snapshots, extension-owned trusted catalog, and `TrustedFixtureRunner`. The runner accepts only the pinned manifest, exact declared state/tree, catalog command, hash-verified standalone Node runtime, and opaque twin handle; non-fixture execution remains explicitly unsupported.
- Seven R3 tests cover production file/index/HEAD/ref/remote/worktree invariants, hidden-answer and source-history absence, cross-project ownership, exact-state execution, tamper/unknown-command rejection, concurrent execution IDs, single-run cancellation, immutable command snapshots, Windows paths with spaces, descendant-process termination, and exact cleanup. The full local Windows extension suite passes 50/50; build and VSIX packaging pass, and the runtime fixture assets are present in the VSIX. Protected PR #13 run `30668675359` passed `extension`, `extension-windows`, `contract`, `web`, and `jules-rnd-policy`, so R3 acceptance is complete.
- The Experience Compiler, Evidence Judge, Control Pulse runtime, readiness ledger, and v0.3 cockpit do not exist yet. R3 proves only the closed reviewed-fixture boundary; it does not execute arbitrary participant or workspace code.
- No skill-retention or speed metric has been measured. Values in the PRD are predeclared R&D targets.
- A new implementation audit found five R0 ambiguities: candidate-diff identity, pre-store fixture blobs, runtime identity, check IDs, and Git object format. The normative contract closes them with structured diffs, catalog-owned blobs, standalone Node `v22.17.0`, declared test IDs, and SHA-1 Git initialization; R0a/R0b now implement and verify that complete substrate.
- A guarded Jules dispatcher and PR policy are defined as a finite R0→R4 queue. They create at most one session after a successful preflight, stop after merged R4, remain inert unless dispatch is explicitly enabled, and keep plan approval on by default. Merges remain manual because the current project tests are not an independent immutable verifier. Full scheduled continuation still requires the dispatcher workflow to be reviewed into the default branch.
- The R&D branch is published at `origin/codex/shadow-cockpit-rnd`. Its first Jules workflow run was correctly skipped because `JULES_RND_LOOP_ENABLED` is not enabled; no Jules session was created.
- `Protect main` is active: PR, conversation resolution, strict `extension`/`contract`/`web` checks, up-to-date base, deletion protection, and force-push protection are enforced with zero required approvals for the sole owner.
- `Protect R&D integration` is active on exact branch `codex/shadow-cockpit-rnd`: PR-only updates, conversation resolution, strict `extension`, `extension-windows`, `contract`, `web`, and `jules-rnd-policy` GitHub Actions checks, up-to-date base, deletion protection, and force-push protection. Codex and Jules now integrate through short-lived heads.
- Superseded `codex/v0.2-ownership-compiler` and the obsolete Jules vibe-gate branch were preserved as dated archive tags and deleted as branches. `codex/shadow-cockpit-rnd` is the only persistent coding branch; draft PR [#8](https://github.com/yava-code/PureFlow/pull/8) temporarily retains the default-branch scheduler until the owner explicitly authorizes its merge into `main`.

The v0.1 runtime below remains released evidence and a reusable IDE shell. Its Mentor, Quiz, and Focus behavior is not the v0.3 product core.

## Released v0.1 milestone (historical runtime state)

**RepRegistry deployed on Monad Testnet; Spark form blocked only on demo video + owner submit/eligibility.**

- Registry: `0xB51B276e6Ee9Cad8181C368bbF6d6efB82c154c8`
- Deploy tx: `0x276f429828678d7cc9270f8a61f55fb7bd6d8c1470728940a06c8ab1ffd92b75`
- Safe: `0x0Eb17425255d826e1FbAF5c473A238bB3EAd8a92`

See `docs/SUBMIT_NOW.md` for copy-paste form fields.

PureFlow is a portable VSCodium product profile (not an empty fork + extension): Mineral theme, deep defaults, keybindings, AI-surface reduction, compact sidebar, explicit mentor, optional Focus Rep framed as relearning on real code, in-IDE documentation, live Monad reads, and honest prepared proofs. Owner backlog lives in `docs/IDEAS_BACKLOG.md`.

- Release: <https://github.com/yava-code/PureFlow/releases/tag/v0.1.0>
- Public companion: <https://yava-code.github.io/PureFlow/>
- Repository: <https://github.com/yava-code/PureFlow>

## Completed

### IDE and distribution

- Central PureFlow `WebviewPanel` and forced Zen Mode paths are gone; the native editor remains active.
- Native folder, terminal, tests, Source Control, debugger, tasks, and extension surfaces remain upstream VSCodium behavior.
- Workspace, Mentor, Focus, and Monad are peer routes in one Activity Bar `WebviewView`.
- Empty, strict Node + TypeScript, and Monad + Hardhat project starters are available.
- PureFlow Mineral theme, restrained product naming, isolated portable profile, and reproducible Windows builder are implemented.
- `v0.1.0` publishes a portable Windows x64 ZIP and extension-only VSIX.

### Mentor, privacy, and Workspace Trust

- Explain, Explain why, Quiz selection/current function, Review reasoning, Find documentation, and Inspect Monad selection are explicit editor/command-palette actions.
- Context is bounded to a selection or current function. File identity is sanitized to a workspace-relative label or basename; the unused document URI was removed.
- A deterministic fallback is labeled `local guide`; optional coach credentials stay in `SecretStorage`.
- Configured coach calls remain disabled during Focus and in Restricted Mode.
- Untrusted workspaces have `limited` support. Six trust-sensitive settings ignore workspace overrides, preventing a folder from replacing coach, RPC, contract, companion, or extension-ID configuration.

### Monad and proof boundaries

- The extension reads chain ID `10143`, latest/safe/finalized blocks, gas price, address state, transaction receipt/finality, logs, and official explorer links through a timeout-bounded host RPC client.
- Read-only Project Doctor detects Hardhat, Foundry, Solidity, viem, wagmi, and Testnet configuration with bounded scanning.
- `RepRegistry` exists with four passing contract tests.
- Storage contains `commitment -> attestor` and `wallet -> rep count`. Focus/test/debug/ownership counters and the chain timestamp are emitted in `RepAttested`, not stored as separate mappings.
- Safe release tooling prepares 915-byte production creation code without a key or broadcast, decodes the indexed CreateCall deployment event, rejects unrelated receipts, and requires the exact 887-byte `RepRegistry` runtime.
- Hardhat and Foundry production output is byte-for-byte canonical. An all-explorer request preparer validates that equality before emitting standard JSON input and compiler metadata.
- The companion accepts only a capped, allowlisted prepared payload and labels it structurally valid but unauthenticated. No wallet signature, transaction, or verified state is fabricated.

### Web and release surface

- The IDE-first companion renders live Monad RPC state, the four-route workbench preview, prepared-proof handoff, and a registry verifier that stays disabled while the registry address is unset.
- Desktop and 390 px mobile browser checks show no horizontal overflow or console errors.
- Tab keyboard navigation, ARIA relationships, stale verification invalidation, payload field allowlisting, and Pages test gating are implemented.
- The release `latest` link is live and contains two assets with checked sizes.
- GitHub Verify completed successfully for final handoff commit `0ac01b8`; Deploy companion last ran successfully for web commit `1f27790`. The deployed Pages HTML returns HTTP 200 with the IDE-first title and no old manual-practice metadata.

## Release evidence

| Area | Evidence | Status |
| --- | --- | --- |
| Extension TypeScript | `npm run check` | Pass |
| Extension tests | 13/13 across domain, Monad, and path privacy | Pass |
| Extension package | `pureflow-0.1.0.vsix`, 679,470 bytes | Pass |
| Contract | production build; 4/4 Solidity tests + 8/8 Safe/verification tooling tests | Pass |
| Deployment preparation | 915-byte creation code; Hardhat/Foundry creation and 887-byte runtime equality; unrelated-receipt negative check | Pass |
| Web | TypeScript, 6/6 proof tests, production Vite build | Pass |
| Browser | desktop/mobile, live chain `10143`, proof handoff, keyboard tabs, zero console errors | Pass |
| Portable builder | clean build in 142.4 s using VSCodium `1.126.04524` | Pass |
| Installed portable | branding, theme, launcher, executable, extension version, `limited` trust, six restricted settings | Pass |
| Portable archive | 239,233,919 bytes; 5,775 entries; launcher present | Pass |
| Portable SHA-256 | `651239343DAC42CD8D919EF78E115DE79E14983BB212F6208EC8D5C143FE13A5` | Pass |
| Public release | `v0.1.0`, ZIP + VSIX, `/releases/latest` HTTP 200 | Pass |
| GitHub Actions / Pages | Verify succeeded for `0ac01b8`; Deploy companion succeeded for `1f27790`; deployed IDE-first HTML checked | Pass |
| Agent wallet funding | 1 Testnet MON on `0xe0D9466626be495C8ECC339E6866f72E9dad06C9` (balance read 2026-07-20: 1e18 wei) | Pass |
| Onchain registry | Safe + bytecode-matched deploy; address configured in web/extension defaults | Pass |
| Demo video | no public URL | Blocked (owner) |

The IDE-first GUI was exercised through the accessibility tree in an earlier portable build: native editor region, PureFlow view, Workspace/Mentor/Focus/Monad routes, Restricted Mode visibility, and live Monad block were present. The fresh security-hardened portable was rebuilt and its installed manifest/bundle were inspected, but a new pixel capture and full 240/320/420 px plus 200% GUI matrix remain release-polish follow-ups.

## Historical Spark state

The Spark deadline was 2026-07-19. The earlier blocker table in this file became stale after `RepRegistry` was deployed and verified on 2026-07-20. The live registry and Safe addresses at the top of this document supersede any older “Safe missing,” “deployment pending,” or “registry unset” entry in Git history.

The repository contains no verified evidence that the owner submitted the final form, uploaded the required demo video, or completed a real user-wallet proof. Those remain historical v0.1 submission facts, not v0.3 R&D blockers.

## Current v0.3 blockers and owner actions

| Input | Impact | Resolution |
| --- | --- | --- |
| The first live adapter is selected but no accessible Codex CLI is configured for this checkout | ADR-006 selects Codex App Server over local stdio, but the Microsoft Store packaged executable discovered here returns `Access denied` when launched from the repository shell | Keep replay R&D independent; the live spike must preflight a separately accessible, exact-version user-installed Codex CLI and fail closed when unavailable |
| Untrusted-code sandbox backend is not selected | R7 corpus and human pilots cannot execute third-party or arbitrary participant code; R0–R4.5 can validate only finite reviewed fixture states, controller-owned repair, and catalog probes | After the fixture slice, select and verify a Windows-capable backend in a separate ADR; never fall back to direct execution |
| Technical patch corpus is not assembled | Automatic episode-generation rate cannot be measured | Collect at least 30 consented or open-source test-backed TypeScript patches for R7 |
| Human participants are not recruited | Takeover and delayed-transfer claims cannot be tested | Complete the technical gate, then recruit for the preregistered pilot |
| Default-branch Jules scheduler awaits explicit merge approval | Scheduled/manual continuation is not installed on `main`; draft PR #8 remains isolated and the enable variable stays off | Owner explicitly says `merge #8`; then merge through protected `main`, remove the temporary infrastructure branch, and run one guarded canary through the protected R&D branch |

No external input blocks the repository-owned fixture R0–R4.5 mechanism in `docs/v0.3/AGENT_EXECUTION.md`. It cannot execute or judge arbitrary human/agent code and must not be represented as a general-project takeover product.

## Recent polish (this pass)

- Focus / Mentor / Workspace copy reframed as knowledge restoration (not LeetCode).
- Documentation opens via Simple Browser when available; external browser remains a secondary action.
- Coach configure presets for Groq / OpenAI / custom; key stays in SecretStorage.
- Portable settings + keybindings + broader AI launcher disables; builder copies keybindings and deeper product.json naming.
- Web companion canvas pixel field, “Keep your coding muscles” judge story, contrast vs showcase toys, honest rules; no fake verified states.
- Commitment hash includes self-reported practice policy flags.
- `docs/IDEAS_BACKLOG.md` for owner follow-ups + competitive notes.
- Companion brand commit `9b961bf`.

## Next ordered actions

1. Integrate R4: one compiled recovery episode and deterministic Evidence Judge.
2. Pass R4.5: one bounded, catalog-only Explain-to-Break Pulse with replay/error fail-closed tests.
3. Run the 30-patch recovery-plus-probe technical corpus audit before expanding the product surface.
4. Add the local readiness ledger and minimal cockpit only after the vertical slice is reliable.
5. Run the preregistered delayed-transfer pilot before making any skill-retention claim.

## Recent milestone commits

| Commit | Outcome |
| --- | --- |
| `626be60` | Native IDE host, bounded mentor context, theme, Monad RPC/Inspector/Doctor |
| `83e51c6` | Compact Workspace/Mentor/Focus/Monad sidebar |
| `7bfda0b` | Native project starters and portable branding |
| `d53e6c2` | Restricted Mode, path privacy, builder fail-closed behavior, fresh portable hardening |
| `1f27790` | Live Monad companion, prepared-proof protocol, browser UX, web tests and CI |
| `7bcc05c` | Safe-governed deployment, exact runtime validation, canonical source-verification payload |
| `a964032` | Honest registry-pending copy aligned with the Safe/source-verification flow |

## Handoff checklist

1. Read `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `docs/END_GOAL.md`, and `docs/DECISIONS.md`.
2. Run `git status` and preserve unrelated work.
3. Read the latest `docs/BUILD_LOG.md` entries and Git log before assuming a check ran.
4. Treat this verification matrix as evidence with a date, not a permanent claim.
5. Check the blockers before attempting wallet or deployment work.
6. Append `docs/BUILD_LOG.md` and update this file after every material milestone, blocker, public URL, deployment, receipt, or runtime result.

### Recent Implementations (Jules)
- **Documentation side-by-side mode**: Updated the VSCodium `simpleBrowser.show` invocation to accept `vscode.ViewColumn.Beside`, helping developers read docs alongside their code without losing context.
- **Focus Safety Gate**: Hooked into `view.ts` messages `openSource` and `search` to prompt users to type what they recall before docs or AI hints are exposed if a Focus Rep is active.
