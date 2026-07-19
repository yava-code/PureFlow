# PureFlow Process Notes

These notes explain how the implementation arrived at its current shape. For the active ledger and blockers, read [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md); for durable choices, read [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Discovery and scope

- The project began from a hackathon concept about protecting manual coding practice while using AI.
- The first architecture question was whether to build a browser IDE, an extension, a VSCodium fork, or a separate distribution. A browser IDE was rejected because it would recreate mature editor infrastructure. A deep fork was rejected because the current requirements fit supported VSCodium extension points.
- The chosen delivery is a separate portable PureFlow VSCodium distribution with a bundled extension, theme, defaults, isolated profile, and restrained naming. The extension remains the reusable core.
- Spark is a deadline and integration target, not the product's end goal. Normal project work must be useful without a wallet, contract, or Focus session.
- The user requested regular public commits. Vertical slices are kept as coherent commits on `main` rather than squashed into a single hackathon dump.

## The important product correction

The first working extension opened an editor-sized Training Console and made Focus Rep the application shell. Runtime testing proved the workflow worked, but product review exposed the wrong hierarchy: it felt like local LeetCode inside VSCodium, displaced the repository, and would not serve as a senior developer's daily IDE.

That implementation is historical evidence, not the current direction. The IDE-first correction established these invariants:

- no PureFlow `WebviewPanel` in the editor area;
- no Zen Mode toggle;
- native editor, Explorer, search, terminal, tests, debugger, Git, and extensions remain primary;
- PureFlow appears in one compact Activity Bar `WebviewView`, editor context actions, the command palette, status bar, and theme;
- Workspace, Mentor, Focus, and Monad are peer routes;
- Focus is optional and never gates opening or editing a project.

The generated [`docs/design/ide-workspace-concept.png`](docs/design/ide-workspace-concept.png), `PRODUCT.md`, `DESIGN.md`, and `docs/END_GOAL.md` are the current product contract.

## IDE host integration

- `WorkspaceService` reports the current workspace, relative file, language, selection size, Git branch, and modified state without reading background file contents.
- Open Folder, Terminal, Tests, and Source Control call native VSCodium commands.
- Create Project writes one of three intentionally small starters: empty, Node + TypeScript, or Monad + Hardhat. The starter is then opened as a normal folder.
- The PureFlow Mineral color theme and distribution defaults establish a recognizable workstation without patching core workbench code.
- `pureflow.openOnStartup` reveals the sidebar in the portable profile while leaving the active editor untouched.

## Mentor and documentation boundary

- Explain, Explain why, Quiz me, and Review reasoning are explicit commands available from the editor context menu, command palette, and sidebar.
- The normal boundary is the current selection. Quiz current function may use a bounded document-symbol range after the user invokes it.
- Context uses a relative file label, language, line range, and bounded code. Background files, absolute paths, terminal history, clipboard data, and the full repository are excluded.
- With no model endpoint, PureFlow produces a deterministic response labeled `local guide`. It must never be described as AI analysis.
- Optional OpenAI-compatible credentials remain in VS Code `SecretStorage`; the extension host rejects configured coach calls while a Focus Rep is active.
- Documentation combines a local reference pack with live Stack Exchange search and opens the chosen source externally.

## Focus workflow

- The original Rep domain was preserved as an optional route: start, hypotheses, test evidence, recall, finish, defense, summary, PNG Rep Card, and commitment preparation.
- Tests are run through the workspace's native test task. PureFlow logs the explicit workflow event, not arbitrary terminal output.
- Rep storage is local JSONL/global storage and excludes code, clipboard data, terminal text, and filenames by default.
- A completed Rep is useful locally even if the developer never prepares or publishes a proof.

## Monad implementation

- A token or NFT was rejected. The only permanent datum with a clear onchain purpose is an optional privacy-safe commitment to a local Rep summary.
- `RepRegistry` stores only commitment-to-attestor and wallet-to-count mappings. Focused seconds, test/debug counters, ownership self-report, and the chain timestamp are emitted in `RepAttested`. Four Hardhat tests cover the contract.
- The globally available `forge` command was Laravel Herd rather than Foundry. Contract work therefore uses the repository's Hardhat 3 toolchain; an official Foundry binary was separately installed and checksum-verified for future deployment work.
- The IDE now has useful read-only integration independent of deployment: chain ID validation, latest/safe/finalized blocks, latency and fee state, address/transaction inspection, explorer links, and bounded Project Doctor scanning.
- RPC calls run in the extension host with timeout and response validation. The UI must distinguish unavailable, pending, latest, safe, finalized, failed, prepared, and verified states.
- The encrypted agent wallet `0xe0D9466626be495C8ECC339E6866f72E9dad06C9` received 1 Testnet MON through confirmed faucet transaction `0x5c7939c6e0d9798e21a3708ab8ca406a45a76b88092c0236d8895a32315d9af6`. Funding is no longer the immediate blocker.
- Monskills requires every write except Safe creation to go through its supplied Safe proposer. `RepRegistry` remains undeployed because the required 2-of-3 Safe needs two public owner addresses; no direct deployment, contract address, or receipt is fabricated.
- Release tooling now separates four evidence levels: prepared creation bytecode, owner-approved Safe execution, exact deployed runtime validation, and multi-explorer source verification. A successful receipt alone cannot be mistaken for the expected contract.
- Production Hardhat and Foundry profiles disable the source-dependent metadata hash and now produce identical 915-byte creation and 887-byte runtime code. The verification-request builder checks this equality before exposing standard JSON input and compiler metadata.
- Monskills specifies Para for the web wallet flow. Agents must not install or authenticate the CLI as the owner. The owner must run `npm install -g @getpara/cli` and `para login` before initialization and diagnostics can continue.

## Distribution and public companion

- The Windows builder downloads VSCodium `1.126.04524`, verifies the official archive SHA-256, creates an isolated profile, packages `yava-code.pureflow@0.1.0`, and applies the PureFlow theme/defaults. It now fails closed on npm exit codes and uses a fresh output root. Generated build output is intentionally excluded from Git.
- The IDE-first GUI was exercised through the accessibility tree in an earlier portable. A clean security-hardened portable was then rebuilt in 142.4 seconds and its installed branding, theme, extension, `limited` trust manifest, six restricted settings, launcher, and executable were inspected. A fresh pixel/200% matrix remains polish, not proof of missing packaging.
- GitHub release <https://github.com/yava-code/PureFlow/releases/tag/v0.1.0> contains the portable Windows ZIP and extension-only VSIX. The GitHub Pages companion is reachable at <https://yava-code.github.io/PureFlow/>; it is not an IDE replacement, and its durable roles are public product context, live proof reads after a registry is configured, and explicit user-wallet handoff.
- A wallet sign-in state must never be mocked. Until Para and deployment blockers are cleared, proof UI remains **Prepared, not published** or deployment pending.

## Verification discipline

- Extension strict TypeScript and 13/13 domain/Monad/path-privacy tests passed after the security hardening.
- Contract tests last passed 4/4, and Safe/deployment/source-verification tooling tests passed 8/8.
- Web TypeScript, six proof tests, production build, desktop/mobile layout, live RPC, proof handoff, keyboard navigation, and console checks passed for the release companion.
- Production extension bundle, VSIX packaging, web build, and proportional portable smoke must be rerun after each corresponding material change.
- Live-looking chain values require a successful current RPC response. Published or verified proof claims require a transaction receipt and a follow-up registry read.
- Every material milestone, blocker change, public URL, deployment, or verification result should update `docs/PROJECT_STATE.md` and append `docs/BUILD_LOG.md`.
