# Spark Alignment

PureFlow starts with a practical developer problem: AI can accelerate delivery while quietly reducing the repetitions that maintain code reading, debugging, recall, and ownership. The answer is not another exercise site. It is a normal IDE where help waits to be asked, deliberate practice is optional, and Monad tooling is useful during real project work.

## Why the project fits

- **Working developer tool:** the native VSCodium editor, Explorer, terminal, tests, debugger, and Git remain primary. PureFlow adds a compact sidebar and code-native commands rather than a browser coding mockup.
- **Explicit AI boundary:** Explain, Why, Quiz, and Review operate on an explicit selection or bounded current function. The extension host blocks configured coach calls during a Focus Rep.
- **Useful Monad integration:** the IDE reads real Testnet chain health, safe/finalized state, gas data, addresses, transactions, and local project readiness. These tools are useful before the attestation contract is deployed.
- **Appropriate onchain scope:** an optional `RepRegistry` stores commitment ownership and per-wallet count, while its event emits self-reported aggregate counters and the chain timestamp. Private developer context remains local, and no token or reputation score is invented to satisfy the track.
- **Open and reproducible:** the repository contains the extension, theme, Windows distribution builder, web companion, contract tests, demo fixture, submission material, and a visible sequence of implementation commits.

## Reviewer path

The three-minute demo leads with the product reviewers can use now:

1. launch the branded portable VSCodium distribution and open a normal repository;
2. edit and test through native IDE surfaces;
3. invoke a mentor or documentation action from selected code;
4. inspect live Monad Testnet state and run Project Doctor;
5. show Focus Rep as an optional workflow, not the application shell.

The demo must not publish or verify an attestation until the registry has a verified Testnet address and the user-controlled wallet flow is configured. Until then, the product shows **Prepared, not published** and explains the blocker.

## Monad implementation

Implemented now:

- a timeout-bounded JSON-RPC client that rejects the wrong chain and expects Testnet chain ID `10143`;
- latest, safe, and finalized blocks, RPC latency, gas price, address and transaction inspection, and official explorer links;
- a read-only Project Doctor for Hardhat, Foundry, Solidity, viem, wagmi, and Testnet configuration;
- `RepRegistry` with four passing Hardhat tests;
- local privacy-safe commitment preparation and explicit web-companion handoff;
- a public GitHub Pages companion at <https://yava-code.github.io/PureFlow/>.

Still blocked:

- the encrypted agent wallet is funded, but the Monskills-governed 2-of-3 Safe still needs two public owner addresses before a deployment can be proposed;
- the canonical Para wallet integration requires the owner to install the CLI and complete `para login`;
- public proof verification cannot be demonstrated until the registry address is configured and a real transaction is confirmed.

## Submission fields

- **Name:** PureFlow
- **Description:** A daily VSCodium IDE with explicit mentoring, optional manual Focus Reps, and live Monad developer tools.
- **Problem:** AI-assisted coding can reduce the code-reading, debugging, recall, and explanation repetitions that working developers want to retain.
- **Solution:** Keep ordinary work in a native IDE, make assistance explicit and bounded, offer optional manual evidence workflows, and use Monad for live developer inspection plus voluntary public commitments.
- **Category:** Monad Testnet
- **Public app:** <https://yava-code.github.io/PureFlow/>
- **Repository:** <https://github.com/yava-code/PureFlow>
- **Windows release:** <https://github.com/yava-code/PureFlow/releases/tag/v0.1.0>
- **Contract address:** pending Safe owner configuration, proposal/execution, and verification
- **Demo video:** pending recording from [the honest three-minute script](demo-script.md)
- **Post URL:** optional for the base submission; required if entering the Most Viral Solution prize

## Official rule check

The [official Spark page](https://buildanything.so/hackathons/spark) lists the submission deadline as **2026-07-19 23:59 UTC** and requires Name, Description, Problem, Solution, hosted Project URL, public GitHub repository, Monad Mainnet/Testnet category, deployed contract address, and a publicly visible demo video of no more than three minutes. It says the judging agent checks for pre-hackathon work, static placeholder data, and suspicious commits. The page also rejects generic tutorial projects, opaque one-commit submissions, overflowing AI-slop UI, and fake success states.

PureFlow addresses those checks with an unsquashed milestone history, a public release, live RPC reads, responsive browser evidence, documented setup, and explicit pending states. It is not submission-complete until the contract address and video URL exist.

The project owner must also personally confirm the eligibility conditions on the official page: age 18 or older and residence outside the excluded jurisdictions. This repository records that as an unchecked owner declaration and does not infer eligibility from locale, timezone, or source history.

## Honest limits

PureFlow is voluntary developer infrastructure, not anti-cheat or employee surveillance. A future onchain record can prove only that a wallet published a particular commitment and counters. It cannot prove how the developer worked, who wrote every line, or whether a session improved skill.

The hackathon provides a deadline, integration target, and public demo format. The post-hackathon product remains a daily open-source IDE even when Focus and Monad features are unused.
