# Spark submission packet

## Form fields

- **Project name:** PureFlow
- **Tagline:** Your daily IDE, with AI that waits to be asked.
- **Description:** A daily VSCodium IDE with explicit mentoring, optional Focus Reps, and live Monad developer tools.
- **Problem:** AI-assisted coding can quietly replace the code-reading, debugging, recall, and explanation repetitions developers want to retain.
- **Solution:** PureFlow keeps real work in a native IDE, makes help explicit and bounded, offers optional manual evidence workflows, and adds live Monad inspection plus voluntary public commitments.
- **Category:** Monad Testnet
- **Public app:** <https://yava-code.github.io/PureFlow/>
- **Repository:** <https://github.com/yava-code/PureFlow>
- **Windows release:** <https://github.com/yava-code/PureFlow/releases/tag/v0.1.0>
- **Contract:** `RepRegistry` — address pending owner-address collection, Safe proposal/execution, and bytecode verification
- **Demo video:** add the public URL after recording; keep it under three minutes
- **Post URL:** add the public social URL only if entering the Most Viral Solution prize

## Short description

PureFlow is a developer-first VSCodium distribution for normal repositories. The native editor, Explorer, terminal, tests, debugger, and Git remain the workspace. A compact sidebar adds explicit code mentoring, documentation, optional Focus Reps, and live Monad Testnet inspection without turning the IDE into a tutorial, chat tab, or wallet dashboard.

## Full description

PureFlow is built for developers who want AI assistance without giving up the reasoning that makes them effective. Open an existing folder or create an empty, TypeScript, or Monad + Hardhat project, then work through normal VSCodium surfaces. When context is useful, select code and explicitly ask PureFlow to explain it, explain why it is structured that way, quiz you, find documentation, or review your reasoning. A deterministic local guide works without an endpoint and is labeled honestly; a configured OpenAI-compatible coach is called only on demand and remains blocked during an active Focus Rep.

The Monad workbench reads live Testnet data from the extension host. It reports chain ID, latest/safe/finalized blocks, gas price and latency, inspects addresses and transactions, links to the official explorer, and runs a bounded read-only Project Doctor for Hardhat, Foundry, Solidity, viem, wagmi, and Testnet configuration.

Focus Rep is optional deliberate practice rather than the application shell. A completed Rep can prepare a privacy-safe commitment for `RepRegistry`; code, filenames, goals, hypotheses, notes, and answers stay local. The contract stores commitment ownership and per-wallet count; its event emits self-reported duration/test/debug/ownership counters plus the chain timestamp. The companion treats the handoff as structurally valid but unauthenticated and labels it **Prepared, not published** because the funded agent wallet still lacks the owner-configured Safe, deployment execution, and verified registry address, while the user-controlled Para flow is not authenticated. No demo state is hardcoded as successful.

## What to show reviewers

1. Launch the portable PureFlow VSCodium distribution and open a normal project.
2. Show that the editor, Explorer, terminal, tests, and source control remain native and central.
3. Select a function and invoke **PureFlow → Explain why** or **Quiz me** from the editor context menu.
4. Open the compact sidebar and show Workspace, Mentor, Focus, and Monad as peer routes.
5. Read live Monad Testnet health, inspect a real address or transaction, and run Project Doctor.
6. Open `demo/cache-lab`, fix its failing cache invariant in the native editor, and briefly show Focus Rep as an optional evidence workflow.
7. Explain the prepared proof payload and deployment blocker. Do not claim publish or verification until a real receipt and contract read exist.

## Technical evidence

- Extension strict TypeScript check passes.
- Extension unit suite passes: 13/13 tests across Focus, Monad RPC/inspection/project logic, and path privacy.
- `RepRegistry` Solidity suite passes 4/4; Safe/receipt/bytecode/source-verification tooling passes 8/8 Node tests.
- Hardhat and Foundry produce identical 915-byte creation and 887-byte runtime code; deployment validation rejects any runtime that is not the canonical `RepRegistry` artifact.
- Web proof suite passes 6/6; Pages runs those tests before deployment.
- Windows builder downloads VSCodium, verifies the official archive checksum, fails closed on build/test/package errors, and produced the clean v0.1.0 portable release.
- The public Pages URL responds successfully and the repository has a regular, unsquashed implementation history.
- GitHub release `v0.1.0` provides the portable ZIP and extension-only VSIX; the portable checksum is `651239343DAC42CD8D919EF78E115DE79E14983BB212F6208EC8D5C143FE13A5`.
- The extension contains no PureFlow `WebviewPanel` path; opening the workbench reveals only the Activity Bar view.

## Social post

I built PureFlow for the part of AI-assisted development nobody benchmarks: whether I can still read, debug, test, and explain the code myself.

PureFlow is a developer-first VSCodium distribution, not a local LeetCode tab. Open a real repository and keep the native editor, terminal, tests, debugger, and Git. When you want help, ask explicitly from selected code. When you want deliberate practice, start an optional Focus Rep.

It also includes live Monad Testnet inspection and a privacy-safe proof design that stays honest about what is local, prepared, published, and verified.

Open source: https://github.com/yava-code/PureFlow

Live companion: https://yava-code.github.io/PureFlow/

#SparkHackathon #Monad #OpenSource #DevTools

## Final checklist

- [x] Public source repository with a readable, regular commit history
- [x] IDE-first extension with native workspace commands and compact sidebar
- [x] Explicit selection/current-function mentor and local guide
- [x] PureFlow Mineral theme and reproducible Windows builder
- [x] Live Testnet health, address/transaction inspection, and Project Doctor
- [x] `RepRegistry` contract and passing tests
- [x] Public GitHub Pages companion reachable at the submission URL
- [x] Requested Monskills and Impeccable skills installed and used
- [x] Honest privacy, consent, and attestation limits documented
- [x] Rebuild, package, install, inspect, archive, and publish the security-hardened portable release
- [x] Browser-check the companion at desktop/mobile sizes with live RPC, proof handoff, keyboard navigation, and no console errors
- [ ] Capture a fresh security-hardened portable pixel/200% interaction matrix for post-release polish
- [ ] Owner installs `@getpara/cli` and completes `para login`
- [ ] Owner confirms they are 18+ and reside outside the jurisdictions excluded by the official Spark rules
- [ ] Owner provides two public Monad-compatible wallet addresses for the 2-of-3 Safe; never provide private keys
- [ ] Create and verify the Monad Testnet Safe, propose deployment through the supplied Monskills wrapper, then execute and verify `RepRegistry`
- [ ] Set the final registry address in the extension/companion configuration
- [ ] Verify one real transaction and follow-up contract read
- [ ] Record and upload the sub-three-minute demo
- [ ] Add final contract and video URLs to the Spark form
