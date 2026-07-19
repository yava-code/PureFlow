# Project State

Last updated: 2026-07-19

## Current milestone

**IDE-first v0.1.0 release published; Safe-governed onchain publication, eligibility confirmation, and the final Spark video remain owner-driven.**

PureFlow now ships as a real portable VSCodium IDE, not a browser editor or local coding challenge. Normal workspace work stays native. The bundled extension adds a compact Workspace/Mentor/Focus/Monad sidebar, explicit bounded mentor actions, project starters, live Monad Testnet reads, and an optional Focus workflow.

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
- GitHub Verify and Deploy companion workflows for `1f27790` completed successfully; the deployed Pages HTML returns HTTP 200 with the IDE-first title and no old manual-practice metadata.

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
| GitHub Actions / Pages | Verify + Deploy companion succeeded for `1f27790`; deployed IDE-first HTML checked | Pass |
| Agent wallet funding | 1 Testnet MON; faucet receipt `0x5c7939c6e0d9798e21a3708ab8ca406a45a76b88092c0236d8895a32315d9af6` succeeded | Pass |
| Onchain registry | no Safe proposal/execution, deployment receipt, bytecode check, or follow-up registry read | Blocked |

The IDE-first GUI was exercised through the accessibility tree in an earlier portable build: native editor region, PureFlow view, Workspace/Mentor/Focus/Monad routes, Restricted Mode visibility, and live Monad block were present. The fresh security-hardened portable was rebuilt and its installed manifest/bundle were inspected, but a new pixel capture and full 240/320/420 px plus 200% GUI matrix remain release-polish follow-ups.

## Spark deadline and required fields

The [official Spark page](https://buildanything.so/hackathons/spark) closes submissions on **2026-07-19 at 23:59 UTC**. Required fields include Name, Description, Problem, Solution, hosted Project URL, public GitHub repository, Monad Mainnet/Testnet category, deployed contract address, and a public demo video no longer than three minutes. A social post URL is required only for the Most Viral Solution prize.

The repository, hosted app, regular commits, real features, and release are ready. Contract address and demo video are not complete and must not be represented as complete. The owner must personally confirm the age and jurisdiction eligibility conditions on the official page; locale and timezone are not evidence of eligibility.

## Known blockers and owner actions

| Blocker | Impact | Resolution owner |
| --- | --- | --- |
| Two public Safe-owner addresses are missing | Cannot create the required 2-of-3 Safe or propose `RepRegistry` deployment | Owner provides two Monad-compatible public addresses; agent uses the installed Monskills Safe workflow |
| Safe approval/execution is pending | An agent cannot unilaterally publish `RepRegistry` | Agent proposes through `propose.sh`; owner reviews, co-signs, executes, and returns the transaction hash |
| Para CLI is not installed/authenticated | Cannot implement the canonical user-wallet publication flow | Owner runs `npm install -g @getpara/cli`, then `para login` |
| Registry address is unset | Companion must show deployment pending; no proof can be publicly verified | Deploy, verify bytecode, then configure the address |
| Demo video URL is missing | Spark submission is incomplete | Owner records/uploads the sub-three-minute demo |
| Eligibility declaration is unchecked | Submission owner eligibility is not established by repository evidence | Owner confirms age 18+ and an eligible jurisdiction against the official rules |

## Next ordered actions

1. Owner confirms Spark age/jurisdiction eligibility and provides two public Monad-compatible Safe-owner addresses.
2. Create and verify the 2-of-3 Testnet Safe, then prepare and propose `RepRegistry` deployment only through the installed Monskills `propose.sh` wrapper.
3. Owner reviews, co-signs, executes, and returns the execution transaction hash; parse the CreateCall log, check deployed bytecode, complete explorer source verification, and configure the registry address.
4. Owner authenticates Para; submit one real proof, wait for receipt/finality, and confirm `attestorOf(commitment)` with a follow-up read.
5. Record the demo using the checked third-party inspection fixtures plus the final PureFlow registry evidence, upload it publicly, and replace pending submission fields.
6. Add a public social post URL only if targeting Most Viral Solution.

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
