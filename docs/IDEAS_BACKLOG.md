# PureFlow ideas backlog

Owner-driven ideas that were **not** implemented in the Spark polish pass. Status markers:

- `owner later` — needs your decision, keys, wallets, or video time
- `post-hackathon` — valuable after submission

Do not treat anything here as shipped. Do not invent fake metrics, verified proofs, or contract addresses to satisfy a form.

---

## 1. Minimal AI influence (local challenge on your code)

| Idea | Status | Notes |
|------|--------|-------|
| Ollama / local OpenAI-compatible coach preset (no cloud) | `post-hackathon` | Document `http://127.0.0.1:11434/v1/chat/completions` once a model is chosen |
| Optional env-var coach key bridge for CI-like shells | `owner later` | Prefer SecretStorage; env is secondary and easy to leak in process lists |
| Hard “no network coach” profile flag for Focus-first machines | `post-hackathon` | Portable settings already reduce AI surface |
| Workspace-local “AI allowed folders” allowlist | `post-hackathon` | Privacy risk if mis-designed |
| Detect and warn on other AI CLIs in PATH | `post-hackathon` | Best-effort only; never claim anti-cheat |

**Groq (answered):** use Configure Coach with Groq’s OpenAI-compatible URL + model + SecretStorage key. Primary path is not a committed `.env`.

---

## 2. Modes as knowledge restoration (not LeetCode)

| Idea | Status | Notes |
|------|--------|-------|
| Forced “write what you remember” gate before docs during Focus | `post-hackathon` | Domain already has `recallLevel`; live UI only has a soft cue |
| Local spaced revisit of past goals (calendar, no scores) | `post-hackathon` | Store only local; never rank skill |
| Architecture-map mode: draw module graph then compare to repo | `post-hackathon` | High design cost |
| Re-own a PR: pick a merged PR, re-explain diff without AI | `post-hackathon` | Needs Git integration polish |
| Remove or archive unmounted full-console UI (`StartRep` / `ActiveRep` / `CompleteRep`) | `owner later` | Dead code confuses agents; keep only if demo film needs it |
| Language-specific restoration prompts (TS, Solidity, Rust) | `post-hackathon` | Keep on real selection, not problem banks |

---

## 3. Documentation UX

| Idea | Status | Notes |
|------|--------|-------|
| Offline curated MDN / Node / TS snippets in sidebar | `post-hackathon` | License review required |
| Cache last N opened doc pages as markdown excerpts | `post-hackathon` | Disk + privacy policy |
| Symbol-aware docs from language server hover | `post-hackathon` | Use LSP, not background repo upload |
| Side-by-side: editor left, Simple Browser right layout command | `owner later` | One command to pin docs beside code |
| Community docs allowlist (only official + Stack Overflow) | already partial | Expand catalog carefully |

---

## 4. Visual identity (pixel field / brand)

| Idea | Status | Notes |
|------|--------|-------|
| Full pixel system on companion + product screenshots | `owner later` | Companion got a mineral pixel field; deepen if brand sticks |
| Custom activity bar / product icon set with pixel accents | `post-hackathon` | Keep IDE chrome quiet |
| Splash / about dialog for portable build | `post-hackathon` | product.json limits apply |
| Motion-only pixel shimmer on Mentor “thinking” rows | `post-hackathon` | Easy to look like AI slop — test with Impeccable |
| Install Impeccable hooks CI for `web/` | `post-hackathon` | Detector already in `.agents/skills/impeccable` |

External anti-slop skills to re-read when redesigning:

- [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (also Spark resource)
- [Leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill)
- [Nutlope/hallmark](https://github.com/nutlope/hallmark)
- Anthropic `frontend-design` skill

---

## 5. Blockchain / practice rules on Monad

| Idea | Status | Notes |
|------|--------|-------|
| Create 2-of-3 Safe + deploy `RepRegistry` + source verify | `owner later` | Needs two public owner addresses + your co-sign |
| One real attest + receipt + `attestorOf` follow-up read | `owner later` | Only then label **verified** |
| Para wallet publication flow on companion | `owner later` | `npm i -g @getpara/cli` + `para login` by owner |
| Onchain policy registry (rules version hash, not goals) | `post-hackathon` | Keep code/goals offchain |
| Optional “mentor blocked during rep” flag in event (self-reported) | `post-hackathon` | Still not proof of AI absence |
| Indexer feed of public attestations (Envio) | `post-hackathon` | Monskills indexer skill |
| Mainnet only if product needs public permanence | `post-hackathon` | Spark Testnet is enough if contract is real |

---

## 6. Distribution depth (not empty fork + extension)

| Idea | Status | Notes |
|------|--------|-------|
| macOS / Linux portable builders | `post-hackathon` | Same product rules |
| Signed Windows releases | `post-hackathon` | Owner cert |
| Deeper product.json identity (applicationName, win32* names) | `owner later` | Smoke-test each field against upstream |
| Bundled language packs / recommended non-AI extensions list | `post-hackathon` | Keep recommendations off by default |
| Custom first-run walkthrough page (native markdown) | `post-hackathon` | Not a full-page webview shell |
| Separate “Focus-first” vs “Daily IDE” profiles | `post-hackathon` | Two settings sets |

---

## 7. Honesty / no fake numbers

| Idea | Status | Notes |
|------|--------|-------|
| Public verification matrix auto-updated by CI from live RPC | `post-hackathon` | Must fail closed |
| Demo video with third-party fixtures only (no staged success) | `owner later` | See `docs/demo-script.md` |
| Submission form filled only with proven URLs | `owner later` | Contract address empty until deploy |

---

## 8. Global goal (architecture + ownership under AI pressure)

| Idea | Status | Notes |
|------|--------|-------|
| Local “ownership journal” (private notes, no scores) | `post-hackathon` | Export markdown only |
| Architecture review checklist templates per stack | `post-hackathon` | User-authored, not a course |
| Team policy: optional shared commitment schema | `post-hackathon` | Org-owned keys, not surveillance |
| Research write-up: skill atrophy + deliberate practice (blog) | `owner later` | Helps Spark story + viral track |

---

## Spark owner checklist (not agent-completable)

1. Confirm age 18+ and eligible jurisdiction on the official form.
2. Provide two Monad-compatible public Safe owner addresses (never private keys).
3. Co-sign / execute Safe deployment of `RepRegistry`; return execution tx hash.
4. Configure registry address after bytecode check + explorer verification.
5. Record ≤3 min public demo video; paste URL.
6. Optional: social post URL for Most Viral track.

---

## Competitive notes (BuildAnything showcase, 2026-07-19)

Typical Spark/showcase noise: games, walls, mints, meme factories, IQ quizzes, running apps.
**PureFlow differentiator for judges:** personal problem is skill atrophy under AI — product is a real daily IDE + optional Focus, not a browser toy. Onchain is voluntary privacy-safe commitments with honest pending/prepared labels.

Design agent rules used (Impeccable / Spark anti-slop):

- Unique identity; fit viewport; no generic AI SaaS cream/Inter/gradient-text hero metrics
- Live RPC only for chain numbers; never fake verified
- Companion may use committed pixel atmosphere; IDE chrome stays calm mineral
- Numbered sequence only when it is a real process (Focus loop)

## Implemented in the polish pass (do not re-do blindly)

- Focus / Mentor copy reframed as knowledge restoration
- Docs prefer in-IDE Simple Browser
- Coach configure presets (Groq / OpenAI-compatible / custom)
- Deeper portable settings + keybindings
- Companion canvas pixel field + problem/contrast/loop story
- Honest onchain practice-rules copy + commitment policy fields
- Naming: Focus Rep instead of Pure Mode in live paths
