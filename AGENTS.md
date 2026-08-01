# PureFlow Agent Handoff

This file is the first stop for any AI or human continuing the project. Read it together with `PRODUCT.md`, `DESIGN.md`, `docs/END_GOAL.md`, and `docs/PROJECT_STATE.md` before changing architecture or UI.

## v0.3 R&D branch authority

On `codex/shadow-cockpit-rnd`, also read `prd.md` and every file under `docs/v0.3/`. Those documents define the current product hypothesis: autonomous coding remains first-class, while a parallel readiness plane compiles live agent work into executable human control episodes. They supersede the v0.1 Mentor/Focus product thesis and any post-run question/gate proposal for new v0.3 work.

This branch contains an architecture and falsifiable execution plan, not an implemented Experience Compiler, Takeover Twin, readiness model, or autonomous agent plane. Preserve the released v0.1 code as a baseline until an explicitly accepted vertical slice replaces or extracts it. Do not describe target metrics as measured results.

For v0.3 work:

- do not implement another quiz, explanation layer, comprehension score, or manual-code quota as the product core;
- keep production agents off the human-practice critical path by default;
- require executable evidence for recovery and transfer claims;
- keep readiness evidence local, project-scoped, time-stamped, and deletable;
- adapt an existing coding-agent runtime before building a generic agent loop;
- stop at the research gates in `docs/v0.3/EXPERIMENTS.md` and `docs/v0.3/AGENT_EXECUTION.md`.
- integrate v0.3 work only into `codex/shadow-cockpit-rnd`; it is the sole persistent coding branch. When its ruleset requires PRs, Codex uses a short-lived `codex/*` head and Jules uses a short-lived `jules-*` head with base `codex/shadow-cockpit-rnd`, then deletes the head after merge. Never merge into or push `main` without explicit owner approval.
- Jules automation is limited to the guarded R0–R4 queue in `docs/v0.3/JULES_LOOP.md`. It may edit `extension/**` and honest milestone evidence in `docs/PROJECT_STATE.md` / `docs/BUILD_LOG.md`; it must not edit workflows, this file, `prd.md`, normative `docs/v0.3/**`, or start R5–R8.

The remaining product description below documents released v0.1 behavior and remains true for the current runtime until v0.3 code is implemented.

## Product in one sentence

PureFlow is a developer-first VSCodium distribution: normal project work stays in the native IDE, while a compact sidebar provides explicit AI mentoring, documentation, optional Focus Reps, and live read-only Monad tools.

## Non-negotiable product rules

- The editor, Explorer, terminal, debugger, tasks, and source control are primary.
- PureFlow must never open a full-page training webview in the editor area.
- A developer can open any folder and work normally without starting a Rep.
- Mentor calls are explicit. Outbound context is limited to bounded code plus a sanitized workspace-relative label or basename; never upload background files, absolute paths, terminal history, clipboard data, or an entire repository.
- During an active Focus Rep, configured AI calls remain disabled.
- Restricted Mode support is deliberately limited: local and read-only tools remain available, configured coach calls stay disabled, workspace-defined network settings are ignored, and native VSCodium trust restrictions still apply.
- Monad values labeled `live` require a successful RPC read. Proofs labeled `published` or `verified` require a real receipt and follow-up registry read. Never hardcode success.
- The IDE never stores a wallet private key. Writes hand off to a user-controlled wallet in the web companion.
- Monad writes follow the installed Monskills wallet policy: only Safe creation may be sent directly. Contract deployments and calls must use the supplied `propose.sh` wrapper, preserve its output verbatim, and wait for owner approval.
- Goals, code, filenames, and session notes stay offchain. Only a commitment and self-reported public aggregate counters may be attested.
- Preserve upstream VSCodium behavior. Prefer distribution settings, a theme, commands, and a bundled extension over maintaining a source fork.

## Code style

- Write direct, idiomatic TypeScript and React.
- Comment only non-obvious reasons, not each line.
- Prefer compact names and small modules to speculative abstractions.
- Do not add fake fallbacks that look like a successful AI or chain result.
- Keep secrets in VS Code SecretStorage or environment variables; never commit them.

## Repository map

- `extension/` — VSCodium extension host, sidebar webview, theme, tests, and VSIX packaging.
- `distribution/` — reproducible Windows portable VSCodium builder and default settings.
- `web/` — Spark/GitHub Pages companion for public verification and future wallet handoff.
- `contracts/` — privacy-safe `RepRegistry`, Hardhat/Foundry compiler profiles, tests, and Safe deployment/verification tooling.
- `demo/` — intentionally broken cache fixture used in a manual Focus Rep demo.
- `docs/design/` — visual concepts and any captured runtime screenshots.
- `docs/PROJECT_STATE.md` — current implementation ledger and blockers.
- `docs/DECISIONS.md` — durable architecture and product decisions.
- `docs/BUILD_LOG.md` — chronological implementation log.

## Development commands

```powershell
cd extension
npm install
npm run check
npm test
npm run build
npm run package

cd ..\web
npm install
npm test
npm run build

cd ..\contracts
npm install
npm test
```

Build the portable Windows distribution from the repository root:

```powershell
$pureflowOutput = ".\release\portable-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
powershell -ExecutionPolicy Bypass -File .\distribution\build-windows.ps1 -OutputRoot $pureflowOutput
```

Use a fresh output root for each smoke build; the builder deliberately refuses to overwrite an existing portable distribution.

## Git discipline

Make coherent commits after architecture, host integration, sidebar UX, Monad work, and verification. Run relevant checks before each commit. Released v0.1 work historically landed on `main`; branch-specific authority above overrides that history for v0.3. Do not rewrite or squash public history, merge a research branch, or push `main` unless the owner explicitly asks.

## Current external blockers

- The encrypted agent wallet `0xe0D9466626be495C8ECC339E6866f72E9dad06C9` has 1 Testnet MON from confirmed faucet transaction `0x5c7939c6e0d9798e21a3708ab8ca406a45a76b88092c0236d8895a32315d9af6`; do not treat funding as the current blocker or expose its private key.
- No Monad Testnet Safe is configured. Ask the owner for two public wallet addresses, then use the installed Monskills Safe creation script to create a 2-of-3 Safe with those addresses and the encrypted agent wallet. Never ask for private keys.
- After the Safe exists, prepare `RepRegistry` bytecode locally and invoke only `.agents/skills/monskill/wallet/utils/propose.sh`. Show its output unchanged, ask the user to approve, and wait for the execution transaction hash before read-only receipt/code verification.
- Para wallet integration requires the owner to run `npm install -g @getpara/cli` and `para login`; agents must not perform login for the user.
- Until Safe execution and a follow-up registry read are proven, label proofs `Prepared, not published` and keep all verification states honest.

Update `docs/PROJECT_STATE.md` and append `docs/BUILD_LOG.md` whenever a milestone, blocker, public URL, deployment, or verification result changes.
