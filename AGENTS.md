# PureFlow Agent Handoff

This file is the first stop for any AI or human continuing the project. Read it together with `PRODUCT.md`, `DESIGN.md`, `docs/END_GOAL.md`, and `docs/PROJECT_STATE.md` before changing architecture or UI.

## Product in one sentence

PureFlow is a developer-first VSCodium distribution: normal project work stays in the native IDE, while a compact sidebar provides explicit AI mentoring, documentation, optional Focus Reps, and verified Monad tools.

## Non-negotiable product rules

- The editor, Explorer, terminal, debugger, tasks, and source control are primary.
- PureFlow must never open a full-page training webview in the editor area.
- A developer can open any folder and work normally without starting a Rep.
- Mentor calls are explicit. Never upload background files, absolute paths, terminal history, clipboard data, or an entire repository.
- During an active Focus Rep, configured AI calls remain disabled.
- Monad values shown as live or verified must come from RPC or a receipt. Never hardcode success.
- The IDE never stores a wallet private key. Writes hand off to a user-controlled wallet in the web companion.
- Goals, code, filenames, and session notes stay offchain. Only a commitment and public aggregate counters may be attested.
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
- `contracts/` — privacy-safe `RepRegistry` contract and Hardhat tests.
- `demo/` — intentionally broken cache fixture used in a manual Focus Rep demo.
- `docs/design/` — visual concepts and runtime screenshots.
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
npm run build

cd ..\contracts
npm install
npm test
```

Build the portable Windows distribution from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\distribution\build-windows.ps1
```

## Git discipline

The hackathon asks for visible, regular progress. Make coherent commits after architecture, host integration, sidebar UX, Monad work, and verification. Run relevant checks before each commit and push `main` to `https://github.com/yava-code/PureFlow.git`. Do not rewrite or squash the public history unless the owner explicitly asks.

## Current external blockers

- The Monad Testnet registry is not deployed because the available agent wallet has no testnet MON.
- Para wallet integration requires the owner to run `npm install -g @getpara/cli` and `para login`; agents must not perform login for the user.
- Until both are resolved, label proofs `Prepared, not published` and keep all verification states honest.

Update `docs/PROJECT_STATE.md` and append `docs/BUILD_LOG.md` whenever a milestone, blocker, public URL, deployment, or verification result changes.
