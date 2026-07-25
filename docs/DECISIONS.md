# Decision Log

Durable choices live here so future agents can distinguish intentional architecture from unfinished work. New entries are append-only; supersede old decisions instead of silently rewriting their rationale.

## 2026-07-19 — Portable VSCodium plus extension, not a deep source fork

**Decision:** Ship a separate portable PureFlow distribution based on VSCodium, with a bundled extension, theme, defaults, visual naming, and reproducible builder.

**Why:** The product needs its own installable IDE identity, but its core value fits supported extension points. A deep fork would impose continuous editor, Electron, updater, security, and extension-host maintenance before the product has proven a need for unsupported chrome changes.

**Boundary:** We may adjust safe visual `product.json` names in the generated distribution. We do not change application IDs, mutexes, updater URLs, IPC contracts, or core workbench code without a separate reviewed decision.

## 2026-07-19 — IDE-first hierarchy

**Decision:** Native project work is the primary surface. PureFlow lives in the Activity Bar sidebar, editor context menu, command palette, status bar, theme, and web companion. Focus Rep is optional.

**Why:** A full-page training console displaced the editor and made the product feel like local LeetCode. Working developers need the repository and code to remain central.

**Acceptance:** Opening PureFlow must never create a central editor webview or toggle Zen Mode.

## 2026-07-19 — Explicit, bounded mentor context

**Decision:** Mentor calls happen only after a user invokes an action on a selection or current function. The configured endpoint receives relative file identity, language, line range, and at most 16 KB of code. During an active Focus Rep, calls are blocked.

**Why:** This gives useful code-native help while preserving a clear consent and privacy boundary. A deterministic local guide is allowed but must be labeled and must not impersonate an AI analysis.

## 2026-07-19 — Live Monad workbench before wallet features

**Decision:** Build read-only Testnet health, address/transaction inspection, and Project Doctor first. Add attestations only through a user-controlled wallet after the registry is deployed and verified.

**Why:** Read-only tools make PureFlow useful for real Monad development immediately and can be tested without funds. Wallet and contract writes must not be mocked for a hackathon demo.

**Protocol:** Monad Testnet chain ID is 10143 and the default RPC is `https://testnet-rpc.monad.xyz`. RPC calls run in the extension host, use bounded timeouts, and show their last checked state.

## 2026-07-19 — Minimal onchain proof

**Decision:** Keep goals, code, paths, notes, and answers local. `RepRegistry.attest` receives a commitment plus focused seconds, test runs, debug loops, and ownership. Storage keeps only commitment-to-attestor and wallet-to-count mappings; the counters and chain `block.timestamp` are emitted in `RepAttested`. History is derived from those events after deployment.

**Why:** Permanent chain storage is suitable for a voluntarily published proof, not sensitive developer context. The existing event is enough for a verifier and avoids inventing a token or reputation score.

## 2026-07-19 — Para for wallet handoff

**Decision:** Use the Monskills-recommended Para flow for the web companion. Agents do not install the Para CLI or authenticate as the user.

**Why:** Signing must remain user-controlled. The prerequisite is explicit: the owner runs `npm install -g @getpara/cli`, then `para login`; only afterward may an agent run project initialization and diagnostics.

## 2026-07-19 — Safe-governed Monad writes

**Decision:** Follow the installed Monskills wallet policy for every Monad write. Safe creation is the only direct transaction. `RepRegistry` deployment and all later calls are proposed through the supplied `wallet/utils/propose.sh` wrapper, approved by the owner, and verified from the execution receipt plus a follow-up code or contract read.

**Why:** The agent wallet can prepare and co-sign a transaction without unilaterally publishing state. The required 2-of-3 Safe uses two public owner addresses plus the encrypted agent wallet, while private keys remain outside the repository and chat.

**Acceptance:** Never create a custom proposer or broadcast `RepRegistry` directly. Preserve the wrapper's QR/output verbatim, request owner approval, then parse the CreateCall `ContractCreation(address)` log because a Safe deployment receipt has no top-level `contractAddress`.

### Decision: Side-by-side Docs & Focus Recall Gate
*   **Context:** `IDEAS_BACKLOG.md` proposed two improvements: placing the Simple Browser side-by-side with the editor, and a "write what you remember" gate before opening docs during Focus mode.
*   **Decision:** We updated `view.ts` to pass `vscode.ViewColumn.Beside` into `simpleBrowser.show`. We also added `vscode.window.showInputBox` to intercept `search` and `openSource` actions if `store.get().phase === "active"`.
*   **Consequence:** Enhances "recall-first" learning mechanics during Focus without completely blocking access to documentation.

## 2026-07-25 — Proposed v0.2 pivot: autonomy plus operational ownership

**Status:** Proposed on `codex/v0.2-ownership-compiler`; v0.1 remains the released product.

**Decision:** Replace the v0.1 manual/no-AI product core for future v0.2 work. Let agents implement and verify changes autonomously. Put the human in the intent, mental-model, risk, prediction, diagnosis, and direction loop rather than the keystroke or raw-diff loop.

**Why:** Requiring manual code discards the leverage users want, while asking them to read every generated line does not scale with agent throughput. The product should preserve the ability to predict behavior, locate responsibility, debug failure, evaluate trade-offs, and direct a fresh agent.

**Boundaries:** Ownership checks remain voluntary and never block ordinary development or merges. PureFlow must not infer understanding from keystrokes, answer length, time, self-rating, or a universal score. Claims require structural or executable evidence; LLM explanations remain inference.

**Validation:** The pivot is a product hypothesis until delayed takeover measures beat a passive AI summary with acceptable delivery overhead. See `prd.md` and `docs/v0.2/RND_PLAN.md`.

## 2026-07-25 — Proposed runtime strategy: reuse execution, own the control plane

**Status:** Proposed pending a five-day integration spike.

**Decision:** Keep the VSCodium distribution and extension. Reuse a pinned headless agent SDK behind a PureFlow-owned `AgentDriver`, add Codex/ACP adapters incrementally, and fork only a thin runtime layer if a required event cannot be exposed upstream. Do not build a complete agent engine or maintain a deep editor fork.

**Why:** File editing, shell execution, checkpoints, model routing, MCP, and swarm orchestration are necessary commodity capabilities. PureFlow's differentiating work is the event/evidence ledger, deterministic semantic delta, claim compiler, independent challenger, and local ownership model.

**Acceptance:** Adopt a runtime only if the spike proves worktree isolation, streamed tool/file/test provenance, cancellation, restart reconstruction, redaction, subagent relationships, and adapter-level contract tests. See `docs/v0.2/ADR-001-agent-runtime.md`.
