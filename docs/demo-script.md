# Three-minute demo script

## Before recording

- Build the latest VSIX and portable distribution; do not use the earlier full-page Training Console build.
- Open a small normal TypeScript repository with a test task and Git initialized.
- Use the checked Monad Testnet fixtures below; do not paste private wallet data.
- Confirm the RPC status is live. If it is unavailable, show the error honestly rather than substituting cached numbers.
- Do not attempt attestation publish or verification until `RepRegistry` has a verified Testnet address and the wallet flow is configured.

Checked on 2026-07-19 from finalized block `46339905`:

- third-party inspection fixture, **not PureFlow's `RepRegistry`**: `0xa2b0067002df61df015c11b2cf0be4f34fc41cf8` (2,227 bytes of code at `safe`);
- successful transaction: `0x20c7f773bfaf3b60edd05443955d6168959d76cd8e4f5aa56a1a8fea041b41b0`;
- receipt evidence: status `0x1`, gas used `224930`, four logs;
- explorer: <https://testnet.monadscan.com/tx/0x20c7f773bfaf3b60edd05443955d6168959d76cd8e4f5aa56a1a8fea041b41b0>.

## 0:00–0:25 — A normal IDE first

Launch `PureFlow.cmd` and open the repository.

Say: “PureFlow is a separate VSCodium distribution for daily development, not a browser IDE and not a coding exercise tab. The normal editor, Explorer, terminal, tests, debugger, and Git stay in charge.”

Edit one line, open the integrated terminal from PureFlow, and run the native test task. Briefly show the PureFlow Mineral theme and compact sidebar; keep the code editor visible.

## 0:25–0:55 — Workspace-native actions

Open the **Workspace** route. Point out the current project, relative file, language, selection, and Git branch. Open Source Control through the sidebar to show that PureFlow delegates to the native surface.

Mention that **Create Project** can scaffold an empty folder, strict Node + TypeScript project, or Monad + Hardhat starter, then opens it as a normal workspace.

## 0:55–1:30 — Help only when requested

Select a small function in the editor. Right-click → **PureFlow → Why Is This Code Written This Way?** Show the sidebar moving to Mentor while the editor remains open.

Say: “This action sends only the explicit selection, relative file identity, language, and line range. PureFlow never uploads the repository in the background. With no coach configured, the result is clearly labeled local guide.”

Show **Quiz me** or **Quiz current function**, then search for one API symbol in Documentation. Do not imply the local guide is a model response.

## 1:30–2:15 — Real Monad developer tools

Open **Monad**. Refresh Testnet health and show chain ID `10143`, latest/safe/finalized blocks, RPC latency, and gas price.

Inspect the prepared real address or transaction hash. Point out balance/nonce/bytecode for an address, or receipt status/finality/gas/logs for a transaction, then open the official explorer link.

Run **Monad Project Doctor** against a Monad project or starter. Show detected Hardhat/Foundry/Solidity/viem/wagmi signals and whether Testnet configuration was found.

Say: “These are live, read-only RPC and local project results. No wallet is needed to use the workbench.”

## 2:15–2:45 — Focus is optional

Open `demo/cache-lab` or return to the prepared failing test. Switch to **Focus** and start a short Rep only now.

Record the hypothesis that the cache-expiry comparison is inverted, run the native test task, mark its outcome yourself, fix the comparison manually, and mark the next outcome. Point out that configured AI calls are blocked while the Rep is active and that PureFlow records user-declared workflow events rather than keystrokes, clipboard contents, terminal history, or parsed test-runner output.

If time is tight, stop after showing the hypothesis and test evidence. The product has already been demonstrated without requiring a Rep.

## 2:45–3:00 — Honest close

Show the proof section labeled **Prepared, not published**.

Say: “A completed Rep can prepare a privacy-safe payload. The URL is structurally validated but is not authenticated, signed, or published. The registry is not deployed yet, so I am not showing a fake onchain success. PureFlow is useful as an IDE today; after wallet setup, a real receipt and contract read will unlock public verification.”

End on the repository and public companion URLs.
