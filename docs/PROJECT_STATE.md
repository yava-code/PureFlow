# Project State

Last updated: 2026-07-19

## Current milestone

**IDE-first workbench pivot — in progress.** The earlier Rep workflow, contract, portable distribution, and web companion are functional, but the extension is being restructured so ordinary native IDE work is primary.

## Completed

- Public repository initialized on `main` with regular pushed commits.
- Product concept, design system, architecture notes, Spark alignment, submission draft, and demo script.
- `RepRegistry` Solidity contract with passing Hardhat tests.
- Local Rep domain: start, hypotheses, test evidence, recall, finish, defense, summary, PNG card, and commitment.
- Optional OpenAI-compatible coach endpoint stored through SecretStorage and blocked during active Reps.
- Local documentation catalog plus live Stack Overflow search.
- Reproducible Windows portable VSCodium builder and packaged extension.
- Spark/GitHub Pages companion with read-only commitment verification when a registry address is configured.
- Real portable smoke test of the old Rep flow.
- New IDE-first product contract and visual reference in `docs/design/ide-workspace-concept.png`.

## In progress

- Remove the central `WebviewPanel`; reveal only the Activity Bar `WebviewView`.
- Add native open/create project, terminal, test, source-control, editor selection, and status-bar integration.
- Replace the wide Rep UI with a 240–420 px sidebar containing Workspace, Mentor, Focus, and Monad routes.
- Expand the coach into explicit Explain, Why, Quiz, and Review responses.
- Add PureFlow Mineral theme and distribution branding.
- Add live Monad Testnet health, address/transaction inspection, and Project Doctor.

## Next

- Rebuild and package the extension and portable distribution.
- Update the web companion around the IDE-first product and live chain workbench.
- Add Para wallet handoff after user authentication is available.
- Deploy and verify `RepRegistry` after a user-approved wallet has Testnet MON.
- Persist verified transaction state and deep-link it back to the IDE.
- Refresh README, architecture, Spark alignment, submission, and demo script.
- Run UI comparison against the reference concept and test narrow sidebar widths.

## Known blockers

| Blocker | Impact | Resolution owner |
| --- | --- | --- |
| Agent wallet balance is `0 MON` | Cannot deploy or verify `RepRegistry` | Owner funds an approved Monad Testnet wallet |
| Para CLI is not installed/authenticated | Cannot wire the canonical wallet flow | Owner runs `npm install -g @getpara/cli` and `para login` |
| Registry address is unset | Public verifier must report deployment pending | Deploy, verify, then set build environment/config |

## Verification matrix

| Area | Last result | Must rerun after pivot |
| --- | --- | --- |
| Extension unit tests | Passed before pivot | Yes |
| Extension TypeScript/build | Passed before pivot | Yes |
| Contract tests | 4/4 passed | After contract changes only |
| Web production build | Passed before pivot | Yes |
| Portable VSCodium smoke | Old full-page Rep flow passed | Yes, with native editor/sidebar UX |
| GitHub Pages deploy | Workflow enabled | Confirm live result and new build |

## Handoff checklist

1. Read `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, and `docs/END_GOAL.md`.
2. Run `git status` and do not overwrite unrelated work.
3. Read the latest entries in `docs/BUILD_LOG.md` and the recent Git log.
4. Check the blockers above before attempting wallet or deployment work.
5. Update this file when a milestone or blocker changes.
