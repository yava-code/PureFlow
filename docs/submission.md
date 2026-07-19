# Spark submission packet

## Form fields (copy into BuildAnything)

- **Project name:** PureFlow
- **Description:** A daily VSCodium IDE that keeps coding muscles sharp: native project work first, optional no-AI Focus Reps on real code, explicit mentoring, and live Monad Testnet tools with privacy-safe commitments.
- **Problem:** I ship faster with AI, but I slowly stop owning the system: less architecture sense, weaker debugging hypotheses, and less ability to explain my own code. I do not want a LeetCode site or a forced course — I want my real IDE back as deliberate practice.
- **Solution:** PureFlow is a portable VSCodium product (not an empty fork): normal editor/Explorer/terminal/Git stay primary. Mentor help is explicit and bounded. Optional Focus Reps reclaim fluency on my real repo with AI offline. Monad tools read live Testnet state and prepare privacy-safe commitments — never fake verified success.
- **Category:** Monad Testnet
- **Project URL:** https://yava-code.github.io/PureFlow/
- **Github repo:** https://github.com/yava-code/PureFlow
- **Windows release:** https://github.com/yava-code/PureFlow/releases/tag/v0.1.0
- **Contract address:** **pending** Safe creation (needs two owner public addresses) + `propose.sh` execution + bytecode verify — do not invent
- **Demo video:** **pending** owner recording (see `docs/SUBMIT_NOW.md` and `docs/demo-script.md`)
- **Post URL:** optional; required only for Most Viral Solution

## Operator checklist

| Item | Status |
|------|--------|
| Solo | Yes |
| Public GitHub | Yes |
| Hosted companion | Yes — Pages |
| Live features (no fake verified) | Yes |
| Contract address on Monad | **Blocked on owner Safe addresses + approve** |
| Demo video URL | **Blocked on owner recording** |
| Age/jurisdiction eligibility | **Owner on form** |

## Short description

PureFlow is a developer-first VSCodium distribution for normal repositories. The native editor, Explorer, terminal, tests, debugger, and Git remain the workspace. A compact sidebar adds explicit mentoring, documentation, optional Focus Reps, and live Monad Testnet inspection without turning the IDE into a tutorial, chat tab, or wallet dashboard.

## Full description

PureFlow is built for developers who ship with AI but refuse to lose the reasoning that makes them effective. Open an existing folder or create an empty, TypeScript, or Monad + Hardhat project, then work through normal VSCodium surfaces. When context is useful, select code and explicitly ask PureFlow to map control flow, rebuild design intent, quiz what you still know, open documentation in the IDE, or review your reasoning. A deterministic local guide works without an endpoint and is labeled honestly; a configured coach (Groq or any OpenAI-compatible endpoint via SecretStorage) is called only on demand and remains blocked during an active Focus Rep.

The Monad workbench reads live Testnet data from the extension host. It reports chain ID, latest/safe/finalized blocks, gas price and latency, inspects addresses and transactions, links to the official explorer, and runs a bounded read-only Project Doctor for Hardhat, Foundry, Solidity, viem, wagmi, and Testnet configuration.

Focus Rep is optional deliberate practice rather than the application shell. A completed Rep can prepare a privacy-safe commitment for `RepRegistry`; code, filenames, goals, hypotheses, notes, and answers stay local. The contract stores commitment ownership and per-wallet count; its event emits self-reported duration/test/debug/ownership counters plus the chain timestamp. Until Safe-governed deployment and a real receipt exist, the product labels proofs **Prepared, not published**. No demo state is hardcoded as successful.

## Social post (optional viral track)

I built PureFlow for the part of AI-assisted development nobody benchmarks: whether I can still read, debug, test, and explain the code myself.

PureFlow is a developer-first VSCodium distribution, not a local LeetCode tab. Open a real repository and keep the native editor, terminal, tests, debugger, and Git. When you want help, ask explicitly from selected code. When you want deliberate practice, start an optional Focus Rep.

Live companion: https://yava-code.github.io/PureFlow/
Open source: https://github.com/yava-code/PureFlow

#SparkHackathon #Monad #OpenSource #DevTools

## Final checklist

- [x] Public source repository with a readable, regular commit history
- [x] IDE-first extension with native workspace commands and compact sidebar
- [x] Explicit selection/current-function mentor and local guide
- [x] PureFlow Mineral theme and reproducible Windows builder
- [x] Live Testnet health, address/transaction inspection, and Project Doctor
- [x] `RepRegistry` contract and passing tests
- [x] Public GitHub Pages companion
- [x] Honest privacy and attestation limits
- [x] Portable release published
- [ ] **Owner:** two public Safe owner addresses → create Safe → approve `RepRegistry` deploy → contract address
- [ ] **Owner:** demo video ≤3 min public URL
- [ ] **Owner:** submit form + eligibility declaration

Step-by-step in Russian: [`docs/SUBMIT_NOW.md`](SUBMIT_NOW.md).
