# PureFlow Process Notes

## Discovery and scope

- The supplied hackathon concept defined the working contract: build a VSCodium-based manual-practice environment, not a browser-only mockup.
- The product boundary was clarified after the user challenged an extension-only interpretation. The result is a branded VSCodium distribution whose product logic is a bundled extension, avoiding a costly editor fork while preserving a distinct app identity.
- Spark requires a real Monad component and rejects hardcoded demos. PureFlow will publish only privacy-safe Rep commitments; all learning data and source context remain local.
- The user requested regular Git milestones. The repository was initialized and pushed before implementation, and each vertical slice will be committed separately.

## Design setup

- The supplied direction favored dark green/amber training-console visuals. Impeccable's generated seed shifted the primary toward mineral teal while preserving the calm dark environment and amber hypothesis state.
- The strongest design constraint is avoiding both generic AI terminal aesthetics and wellness gamification. Familiar IDE behavior and accessibility take priority over decorative novelty.

## Monad contract

- A single `RepRegistry` contract was chosen over a token or NFT. Its purpose is a permanent commitment to a privacy-safe local summary, which is the only PureFlow datum that benefits from onchain permanence.
- The globally available `forge` command was discovered to be Laravel Herd rather than Foundry. Contract builds were moved to a project-local Hardhat 3 toolchain and verified with four Solidity tests.
- Official Foundry v1.7.1 was installed separately with the release SHA-256 verified. The encrypted Monskills deployer is `0xe0D9466626be495C8ECC339E6866f72E9dad06C9`; it currently needs Monad Testnet MON from the faucet before deployment.

## Extension vertical slice

- The activity bar is a discoverable entry point, but the primary Training Console opens as an editor-sized webview so the workflow remains readable instead of being squeezed into a narrow sidebar.
- The working state machine covers start, active practice, self-review, defense, and completion. Coach network calls are rejected during the active phase by the extension host, not merely hidden in the UI.
- Knowledge Dock combines a curated local reference pack with live Stack Exchange API results. Rep storage is local JSONL/global storage and excludes code, clipboard data, terminal text, and filenames by default.
- The extension passes strict TypeScript, four domain tests, a production esbuild bundle, and VSIX packaging.
