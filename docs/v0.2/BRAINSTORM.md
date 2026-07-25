# PureFlow v0.2 brainstorm

This is a divergence document, not a shipping promise. Ideas are ranked by thesis fit, evidence quality, user friction, and implementation cost.

## Selection lens

Prefer an idea when it:

1. preserves or increases agent autonomy;
2. helps a human predict, locate, decide, diagnose, or direct;
3. can be anchored to repository or runtime evidence;
4. works on real project changes rather than generic exercises;
5. is useful even when the user skips the challenge;
6. avoids surveillance and global scores.

## Now — prove the mechanism

| Idea | Why it matters | Evidence source | Cost |
| --- | --- | --- | --- |
| Automatic Mission Contract | Removes “where do I start?” while exposing consequential assumptions | Repo instructions, tests, user prompt | Medium |
| Decision Flight Recorder | Makes agent work reconstructable without hidden reasoning | Tool events, Git, tests | Medium |
| Semantic Review Units | Compresses large diffs into behavioral changes | TS graph plus LLM clustering | Medium |
| Claim–Evidence Ledger | Prevents fluent summary from posing as proof | Tests, compiler, graph, traces | Medium |
| Blind Disagreement Review | Surfaces only meaningful conflict with implementer claims | Base/head and separated reviewer | Medium |
| Predict before reveal | Exercises the current mental model in seconds | Evidence-backed scenario | Low |
| Architecture Pins | Lets the human steer boundaries without writing code | User directive plus graph policy | Low |
| Slop Sweeper | Automates cleanup while preserving behavior | Tests and semantic delta | Medium |
| One-click `Show failure` | Converts an abstract risk into a trace or sandbox run | Test/trace/fault fixture | Medium |
| Cold-agent handoff | Tests whether the human can direct without builder context | Fresh session outcome | Medium |

## Next — compound understanding

### Change and architecture automation

- **Contract timeline:** show when an API, event, schema, or type changed across runs.
- **Data-flow delta:** trace which sources, transformations, stores, and sinks changed.
- **Permission-flow delta:** highlight new auth, secret, filesystem, network, or wallet boundaries.
- **State-machine extraction:** derive states and transitions for async workflows and compare base/head.
- **Blast-radius preview:** simulate which modules, tests, deployments, and consumers an alternative affects.
- **Architecture pin compiler:** turn map annotations into agent constraints and reviewer checks.
- **Repository constitution:** compile `AGENTS.md`, ADRs, linters, tests, and schemas into sourced policies.
- **Plan divergence watch:** show when implementation deviates from the Mission Contract and why.
- **Decision replay:** revisit the moment an alternative was rejected and direct a new branch.
- **Dependency necessity check:** require evidence for a new package when a local capability exists.

### Evidence automation

- **Claim-to-test router:** spawn a test agent only for claims with weak executable evidence.
- **Trace-on-demand:** run one representative scenario and animate the changed boundary.
- **Evidence invalidation:** mark claims stale when dependent symbols, tests, or configs change.
- **Negative-evidence search:** actively look for inputs that contradict a material claim.
- **Test honesty checker:** detect assertions that do not observe the behavior named by a claim.
- **Rollback rehearsal:** apply the rollback boundary in a worktree and prove expected restoration.
- **Production evidence import:** attach logs or traces explicitly selected by the user.
- **Migration replay:** run schema migrations twice, backward, and against representative old data.
- **Config matrix sampler:** test the smallest set of configurations that crosses changed branches.

### Human-model automation

- **What changed since I last knew this module?** Compare the last confirmed snapshot with head.
- **Failure-mode atlas:** retain real incidents and controlled failures by boundary, not as a quiz catalog.
- **Counterfactual explorer:** choose an alternative and see architecture/risk deltas before agents rebuild it.
- **Adjacent-task generator:** create one realistic next change that tests transfer, then let a cold agent execute it.
- **Voice handoff:** a 90-second spoken brief converted into a fresh-agent Mission Contract.
- **Confidence calibration:** privately compare predicted outcome with trace; never expose a score.
- **Evidence bookmarks:** save the three anchors a developer considers essential for future operation.
- **Stale-area inbox:** notify only when a previously confirmed boundary changes again.
- **Incident backfill:** turn a real outage into a missing claim, invariant, and future regression scenario.
- **Architecture archaeology:** reconstruct why a boundary exists from Git, ADRs, issues, and tests.

### Agent automation

- **Risk-based swarm router:** spawn security, migration, concurrency, or performance reviewers only when relevant.
- **Marginal-evidence stop:** stop generating more reviews when new evidence no longer changes claim state.
- **Agent contradiction resolver:** compare incompatible implementation proposals against Mission Contract evidence.
- **Concurrent-run conflict radar:** detect semantic conflicts before worktree merge, not only text conflicts.
- **Automatic branch salvage:** preserve useful verified units from a failed run and discard unsupported edits.
- **Cost/latency allocator:** spend reviewer tokens on high-impact, low-evidence seams.
- **Independent implementation sampling:** for irreversible decisions, compare two isolated solutions at the semantic level.
- **Autonomous simplification tournament:** keep the smallest solution that preserves acceptance evidence.
- **Failure replay repair:** give a repair agent the evidence package, not the builder transcript.

## Later — platform opportunities

- GitHub PR comment that contains semantic units and evidence links without developer grading.
- CI gate for unsupported high-risk claims, never for personal challenge answers.
- Portable `pureflow handoff --base <ref> --head <ref>` CLI.
- ACP import for agent runs executed outside PureFlow with an explicit weaker-provenance label.
- Language adapters for Python, Rust, Go, Solidity, Java, and C# selected by usage data.
- Cross-repository contract map for services owned by the same user or team.
- Local model option for claim drafting and private code.
- Shareable read-only handoff bundle with source redaction.
- Team-owned architecture pins and service invariants.
- IDE debugger integration that converts a stopped frame into an evidence anchor.
- Production incident integration with explicit, narrow log selection.
- Signed extension/runtime attestation for regulated environments.

## Public-skill ideas

The `ai-will-challenge-you` skill can preview a subset without pretending to be the IDE:

- compact `Change Model` after a substantial task;
- fact/inference/unknown labels;
- one prediction before explanation;
- one counterfactual tied to a test or symbol;
- optional modes: Autopilot, Ownership, Deep takeover;
- cold-agent briefing template;
- PR semantic handoff;
- no manual coding, no generic quiz, no score.

## Product moments worth designing

### New feature completed overnight

The user opens PureFlow and sees four behavior units, one changed public contract, two new dependencies, one unsupported reliability claim, and a single scenario worth predicting.

### Agent wants a hard-to-reverse decision

PureFlow shows two architecture graphs, the default choice, cost of reversal, and which invariant changes. The user chooses or delegates; the swarm continues.

### Production failure

PureFlow maps the trace to a claim that was marked partially supported, shows the last agent decision touching the boundary, and starts a fresh repair agent from evidence rather than from the original chat.

### User skipped every handoff for a week

No shame or lockout. The Map shows which boundaries changed since last confirmation and offers one high-value takeover session.

### Team review

The reviewer sees disagreements, missing evidence, and contract drift. They never see a colleague's private answers or an “AI percentage.”

## Anti-ideas and graveyard

| Idea | Why reject it |
| --- | --- |
| Require the user to type 10–20% of the code | Mechanical authorship is not operational ownership and destroys velocity |
| Random syntax quizzes | Weak connection to the current system and easy to game |
| Read every AI diff | Does not scale with agent throughput |
| “I understand” checkbox | No behavioral evidence |
| AI-generated skill score | False precision and surveillance risk |
| Keystroke, paste, or AI-use detector | Measures tool use, not understanding |
| Same-agent self-review only | Correlated rationale and post-hoc confirmation |
| Store chain of thought | Privacy risk and not a trustworthy evidence source |
| Block merge on personal quiz | Coercive, easy to game, and unrelated to code evidence |
| Put all code/reasoning onchain | Privacy, permanence, cost, and no product necessity |
| Full swarm dashboard before the handoff works | Orchestration UI is crowded; the ownership mechanism is the wedge |
| General course catalog | Competes with learning products and leaves real project ownership unsolved |
| Deep VSCodium fork | Large maintenance burden unrelated to the thesis |

## Ranking candidates after the vertical slice

Score each idea from 1–5 on:

- `ownership_value` — improves prediction, diagnosis, decision, or direction;
- `evidence_strength` — can be grounded without LLM self-assertion;
- `autonomy_fit` — preserves agent speed;
- `frequency` — appears often in real agent-heavy work;
- `implementation_leverage` — reuses current graph/ledger/runtime;
- `friction_risk` — reverse-scored user burden.

Do not prioritize by demo spectacle or how many AI agents can be shown on screen.
