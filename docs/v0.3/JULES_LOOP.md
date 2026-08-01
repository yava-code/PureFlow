# Jules R&D Loop

## Purpose

Jules may implement the already-audited fixture-only R0–R4 plan in [its own short-lived Ubuntu VM](https://jules.google/docs/environment/). GitHub Actions only dispatches and verifies the work. Jules does not choose product direction, change normative contracts, start the real-code sandbox phase, or write directly to `main`.

The loop is a finite queue with event and scheduled wake-ups:

```text
push to codex/shadow-cockpit-rnd or the default-branch 13/43-minute wake-up
→ preflight: no active Jules session and no open PR to the branch
→ select the first missing merged marker in R0 → R1 → R2 → R3 → R4
→ create exactly one Jules AUTO_CREATE_PR session for that workstream
→ Jules opens a PR to codex/shadow-cockpit-rnd
→ Linux + Windows extension CI, contract CI, and web CI
→ R&D path and size policy
→ human review and manual merge
→ next wake-up starts the next gated slice; after merged R4, dispatch stops
```

An active session, any open PR to the R&D branch, a terminal session with no merged marker, failed CI, an unexpected queue marker, an out-of-scope path, a symlink/gitlink/binary, more than 80 files, more than 2 MB of resulting files, or more than 2,500 changed lines stops the chain. A failed or completed-without-PR workstream therefore requires inspection instead of being relaunched forever. There is no parallel agent pile-up.

## Controls

The repository secret is:

- `JULES_API_KEY` — already configured by the owner; never print or copy it.

The repository variables have different roles:

- `JULES_RND_LOOP_ENABLED=true` is the dispatch switch. Missing or any value other than `true` prevents new sessions.
- `JULES_RND_REQUIRE_PLAN_APPROVAL=false` is a speed setting, not a kill switch. Missing or `true` means the Jules plan requires explicit approval; leave it that way for canaries.

There is deliberately no auto-merge control in this R&D slice. Jules can add or weaken its own new tests, so ordinary project CI is not an independent semantic verifier. Every R0–R4 PR remains a manual merge until a separate immutable, task-specific acceptance harness exists.

## Required activation order

1. Push `codex/shadow-cockpit-rnd` and verify its upstream points to the same remote branch.
2. Protect `main` and `codex/shadow-cockpit-rnd`: pull requests required, force pushes and deletion blocked, normal CI required.
3. Review and merge the separate infrastructure PR that installs this dispatcher on the default branch. Scheduled and manual workflows run only from the default branch; the R&D copy alone receives only its branch-push event.
4. Confirm the Jules GitHub App can access `yava-code/PureFlow`.
5. Set only `JULES_RND_LOOP_ENABLED=true`; leave plan approval on.
6. Rerun the initial branch-push workflow or invoke the default-branch workflow, then inspect the first Jules PR. Its base must be `codex/shadow-cockpit-rnd`, its title must start with `[PureFlow v0.3 R0]`, and its changes must remain within R0 and the allowed paths.
7. Merge the canary manually after checks.
8. After two or three clean canaries, optionally set `JULES_RND_REQUIRE_PLAN_APPROVAL=false`. PR review and merge remain manual.

Set `JULES_RND_LOOP_ENABLED=false` to stop new sessions. An open PR blocks dispatch. Closing a PR does not re-arm its workstream: the exact terminal Jules session remains a fail-closed marker and the next wake-up stops for inspection. Retrying requires an explicit controller change; deleting or renaming state is never automatic. Disabling the workflow or rotating the API key is the hard stop.

The twice-hourly default-branch schedule is a recovery clock; preflight makes each wake-up a no-op while a session or PR is active. After R4 merges, set `JULES_RND_LOOP_ENABLED=false` and disable or remove the scheduled infrastructure workflow so GitHub does not retain 48 no-op runs per day.

## Scope Jules may implement

- R0 first.
- After R0 passes: one of R1, R2, or R3 per PR.
- R4 only after R1, R2, and R3 pass.
- `extension/**` plus honest evidence updates in `docs/PROJECT_STATE.md` and `docs/BUILD_LOG.md`.

Jules must stop before R5–R8, UI expansion, a live external-agent adapter, ADR-003, corpus execution, or arbitrary human/agent code. Those require the explicit gates in [`AGENT_EXECUTION.md`](AGENT_EXECUTION.md).

## Why the clock is only a wake-up

The official Jules API creates asynchronous sessions and documents no idempotency key. A blind cron can start a second session before the first has produced a PR, while retrying a successful-but-disconnected `POST` can create duplicates. This workflow paginates the connected sources and sessions, verifies that the target branch is visible to Jules, queries GitHub PR provenance, sends the create request once without retry, and advances only after the preceding workstream has a same-repository `jules-*` PR with a controller-issued policy status. Duplicate, skipped, or unverified markers fail closed. The schedule wakes a finite state machine; it does not continuously generate branches.

Official references: [Jules API](https://developers.google.com/jules/api), [Sessions](https://jules.google/docs/api/reference/sessions), and [Google's Jules Action](https://github.com/google-labs-code/jules-action).
