# Build Log

This is a concise chronological record of material implementation work and runtime evidence. It is not a substitute for Git history; it captures intent, verification, and blockers that a commit alone may not explain.

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
