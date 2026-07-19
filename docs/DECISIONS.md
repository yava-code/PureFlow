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

**Decision:** Keep goals, code, paths, notes, and answers local. `RepRegistry` receives a commitment plus focused seconds, test runs, debug loops, ownership, and completion time. History is derived from contract events after deployment.

**Why:** Permanent chain storage is suitable for a voluntarily published proof, not sensitive developer context. The existing event is enough for a verifier and avoids inventing a token or reputation score.

## 2026-07-19 — Para for wallet handoff

**Decision:** Use the Monskills-recommended Para flow for the web companion. Agents do not install the Para CLI or authenticate as the user.

**Why:** Signing must remain user-controlled. The prerequisite is explicit: the owner runs `npm install -g @getpara/cli`, then `para login`; only afterward may an agent run project initialization and diagnostics.
