# Research and Landscape Review

## Scope and standard of evidence

This review asks one question: what mechanism could let autonomous coding remain fast while preserving a developer's ability to take over their own project?

The evidence base is incomplete. There is no long-term randomized study of professional developers using agent swarms plus project-derived practice. The architecture therefore combines:

- primary human-automation research;
- cognitive and procedural learning research;
- early coding-specific studies;
- documented capabilities of current products;
- adjacent operational-training precedents.

Product pages establish what a tool claims or documents, not that it improves learning. Research from driving, process control, or education supplies mechanisms, not automatic proof of transfer to software engineering.

### Landscape method

The public-product review was run on 2026-07-25, refreshed on 2026-07-26, and received a mechanism-focused research refresh on 2026-07-31. It used official documentation or first-party product pages where available. Search families included:

```text
AI coding IDE developer skill retention
AI coding learning mode code comprehension
AI coding takeover readiness
project-specific debugging training fault injection
parallel AI coding agents worktrees IDE
agent-first IDE ACP
code provenance AI agent intent per line
software incident GameDay developer training
```

Products were included if they were a mainstream autonomous coding system, explicitly marketed developer learning/comprehension, generated practice from a repository, injected faults, mapped code provenance, or orchestrated parallel coding agents. For each, the review recorded only documented mechanisms and whether public material described the five-part PureFlow combination. Search results and private features can change; this is a dated prior-art screen, not a patent search.

## 1. Human automation: the out-of-the-loop problem

### Ironies of automation

Lisanne Bainbridge's [“Ironies of Automation”](https://doi.org/10.1016/0005-1098(83)90046-8) argued that reliable automation can leave people responsible for the rare, abnormal situations while removing the routine activity through which they maintain the knowledge needed to handle them.

This maps closely to agentic coding: the agent handles normal construction and repair; the developer is suddenly valuable when the system is ambiguous, failing, or outside the agent's model.

### Control affects takeover

Endsley and Kiris studied an automated navigation task in [“The Out-of-the-Loop Performance Problem and Level of Control in Automation”](https://doi.org/10.1518/001872095779064555). Automation shifted participants toward passive processing, reduced situation awareness, and slowed decision making after failure; retaining more control moderated the effect.

The result is not about programming, but it supports a critical design choice: passive monitoring is not equivalent to periodically exercising control.

### Automation has stages

Parasuraman, Sheridan, and Wickens separate automation into information acquisition, information analysis, decision/action selection, and implementation in [“A Model for Types and Levels of Human Interaction with Automation”](https://doi.org/10.1109/3468.844354).

Coding agents now cover all four. The product cannot solve the resulting problem by returning only information after implementation.

### Routine gains can hide failure costs

The [Onnasch et al. meta-analysis](https://doi.org/10.1177/0018720813501549) synthesized 18 experiments. Higher automation generally improved routine performance and reduced workload, while situation awareness and failure performance worsened. Effects varied by automation stage and task.

This supports the central trade-off but does not determine the correct IDE interaction.

## 2. Learning: active operation is different from reading

### Generation and self-explanation

The classic [generation-effect experiments](https://doi.org/10.1037/0278-7393.4.6.592) found better memory for self-generated material than for read material across several verbal tasks. Chi and colleagues' [self-explanation study](https://doi.org/10.1207/s15516709cog1302_1) linked successful worked-example learning with learners generating principled explanations and monitoring their own understanding.

These studies justify pre-reveal generation and explanation after a mismatch. They do not show that typing code is inherently superior to directing or debugging it.

### Retrieval practice

Roediger and Karpicke found better delayed retention after retrieval practice than repeated study in [a 2006 experiment](https://doi.org/10.1111/j.1467-9280.2006.01693.x), even while repeated study increased confidence.

This is evidence that questions can help. It is also a reason not to equate confidence or familiarity with ability. Retrieval remains one component, not the product thesis.

### Error management and transfer

The [Keith and Frese meta-analysis](https://doi.org/10.1037/0021-9010.93.1.59) covered 24 studies with 2,183 participants. Error-management training showed positive overall effects and stronger effects on transfer measures, including adaptive transfer to structurally changed tasks.

The relevant mechanism is active exploration, error, feedback, and recovery. Software-specific effect sizes still need to be measured.

### Procedural refreshers

Frank and Kluge ran [three randomized process-control studies](https://link.springer.com/article/10.1007/s41449-018-00136-9) with 240 participants. After initial training, groups received practice, skill testing, symbolic rehearsal, or no refresher; later they performed without help. Refreshers reduced errors, with practical repetition especially effective, and the classical testing effect did not replicate for these dynamic procedures.

This is one of the clearest arguments against making a verbal quiz the core of a dynamic takeover product. The task was simulated process control with student participants, not software development.

### Illusion of understanding

The [illusion of explanatory depth](https://doi.org/10.1207/S15516709COG2605_1) describes how people can rate their understanding of mechanisms higher until required to produce a detailed explanation. This makes self-report and passive agreement poor primary measures.

## 3. Coding-specific evidence

### Anthropic skill-formation RCT

Anthropic reports a randomized study of 52 mostly junior developers in [“How AI Impacts Skill Formation”](https://arxiv.org/abs/2601.20245) and its [research summary](https://www.anthropic.com/research/AI-assistance-coding-skills). Participants learned an unfamiliar Python library while completing a task. The AI group scored 50% versus 67% for the no-AI group on an immediate mastery assessment; the largest reported gap was debugging. The measured task-speed difference was small and not statistically significant.

Limitations matter: the sample was small, the assessment was immediate, the task was narrow, and the study does not establish long-term professional skill decay.

### Agent sessions and expertise

Anthropic's observational analysis of roughly 400,000 sessions, [“What Claude Code Teaches Us About Developer Expertise”](https://www.anthropic.com/research/claude-code-expertise), classified decisions in transcripts. It reports that humans retained more planning decisions while Claude handled most execution decisions, and sessions classified as more expert recovered from trouble more successfully.

This is classifier-derived and correlational. It motivates preserving execution and recovery experience; it does not prove the proposed intervention.

### Code review is not a scalable substitute

An experiment with professional developers in [“Code Review of Changesets”](https://doi.org/10.1007/s10664-022-10123-8) found difficulty comprehending changes, with task size affecting whether detailed guidance helped. A separate small observational study reported review effectiveness degrading more than linearly with change size in [IET Software](https://doi.org/10.1049/iet-sen.2020.0134).

These studies do not evaluate modern agent swarms directly. They do reinforce that “just read every diff” is not a credible scaling strategy.

### Explanations can amplify false confidence

A 2026 controlled experiment with 86 Python programmers, [“Programmers Are Poor and Overconfident Judges of LLM-Generated Assertions”](https://arxiv.org/abs/2607.08885), reported 74% accuracy when judging correct assertions but 49% for incorrect assertions despite similar confidence. Natural-language explanations provided no overall accuracy benefit; low-quality explanations reduced accuracy while increasing confidence.

The study concerns generated postconditions rather than full agent patches, so it does not directly validate PureFlow. It does falsify the assumption that another plausible explanation is a sufficient review or teaching mechanism. Control Pulses therefore end in executable evidence, not model agreement.

### Cognitive forcing reduces overreliance but can damage the experience

Buçinca, Malaya, and Gajos compared three cognitive-forcing designs with simple explanation interfaces and a no-AI baseline in [an experiment with 199 participants](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca2021trust.shtml). The forcing designs reduced overreliance on incorrect AI advice, but participants rated the most effective interventions least favorably, and benefits varied with motivation for effortful thinking.

This is a warning against a compulsory checkpoint after every agent action. PureFlow should spend a user-selected attention budget only at causally important seams, let production continue, and measure voluntary return rather than assuming that more friction is better.

### Adaptive support is a separate optimization problem

A 2026 TOCHI paper, [“Offline Reinforcement Learning for Adaptive Support in AI-Assisted Decision-Making”](https://discovery.ucl.ac.uk/id/eprint/10226721/), learned support policies across two experiments with 316 and 964 participants. Accuracy-optimized policies improved joint decision accuracy; learning-optimized policies improved learning only at times. The authors explicitly treat task performance and human skill improvement as different objectives.

The direct implication is architectural: the future Autonomy Router must not optimize clicks, completion, or software throughput alone. A learned policy is a later possibility only after PureFlow has enough behavioral and delayed-transfer data, a predeclared multi-objective loss, and an interpretable deterministic baseline. R0–R8 keep the router transparent and rule-based.

### Throughput is real value worth preserving

Three randomized field experiments covering 4,867 developers reported a noisy but combined [26.08% increase in completed tasks](https://doi.org/10.1287/mnsc.2025.00535) from access to AI code-completion assistance, with larger adoption and gains among less experienced developers. Code completion is not an autonomous swarm, and completed tasks are not a skill measure. The result still supports treating automation speed as product value rather than deliberately removing the tool developers now rely on.

## 4. Current product landscape

### Mainstream AI coding systems

| Product | Documented mechanism | Gap relative to this thesis |
| --- | --- | --- |
| [Claude Code Learning output style](https://code.claude.com/docs/en/output-styles) | Shares insights and asks the developer to implement small strategic `TODO(human)` sections | Manual contribution, not a parallel executable takeover loop or delayed transfer test |
| [Cursor agents](https://cursor.com/blog/agent-best-practices) and [worktrees](https://cursor.com/changelog/04-24-26) | Plans, diff review, agent review, asynchronous subagents, isolated branches | No documented project-scoped human readiness model or fault-recovery curriculum |
| [Cursor Shadow Workspace](https://www.cursor.com/blog/shadow-workspace) | Hidden environment where the AI can apply edits and receive lint/LSP feedback | It trains and validates the AI, not the human; the name is therefore unavailable to PureFlow |
| [OpenAI Codex](https://openai.com/index/introducing-codex/) | Parallel cloud agents in isolated sandboxes that edit, run, test, and propose changes | Transparency and review, but no documented skill-retention plane |
| [Kiro Specs](https://kiro.dev/docs/cli/v3/specs/) and [Hooks](https://kiro.dev/docs/cli/hooks/) | Requirements, design, tasks, autonomous execution, and event-driven verification | Process and agent-completion control, not behavioral human takeover evidence |
| [GitHub Copilot coding agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent) | Cloud environment, plans, branches, tests, review, and custom agents | No documented project-derived human control episodes |
| [Devin session tools](https://docs.devin.ai/work-with-devin/devin-session-tools) | Observe, inspect diffs, interact, or manually take over a session | Takeover is reactive; no regular readiness practice or delayed transfer model |
| [Windsurf worktrees](https://docs.windsurf.com/windsurf/cascade/worktrees) | Parallel isolated Cascade tasks with merge-back | Worktrees serve autonomous generation, not human skill continuity |
| [OpenCode agents](https://opencode.ai/docs/agents/) | Plan/build agents, permissions, and subagents | No documented learning or takeover-evidence layer |
| [Band](https://getband.app/docs/getting-started/) | Agent-first IDE with worktree workspaces, editor, terminals, browsers, and parallel agent sessions | No documented project-derived human control or delayed readiness loop |
| [Hyperlane](https://hyperlaneide.com/) | VS Code-engine IDE for orchestrating parallel CLI/ACP agents | No documented executable human skill-continuity plane |
| [Herd](https://joinherd.ai/) | Desktop orchestration and monitoring for many parallel coding agents | No documented takeover practice or behavioral human model |
| [StarkIDE](https://www.starkide.com/) | Native IDE for multiple agent sessions, worktrees, code map, and review | Maps/reviews agent output but does not document delayed human recovery evidence |
| [Blame](https://blame.so/) | Agentic IDE emphasizing controlled, model-routed workflows | Control policies are not documented as project-derived skill practice or takeover verification |

The table describes public documentation reviewed in July 2026. Absence from public docs is not proof that no internal or unreleased implementation exists.

### Direct neighbors

| Product or project | Useful overlap | Why it is not the same product |
| --- | --- | --- |
| [Atrophy](https://github.com/ashutosh-rath02/atrophy) | Local unaided drills, per-axis ratings, confidence bands, weekly streak, AI-on gap, and opt-in leaderboard | Generic exercises measure a useful baseline but do not establish ownership of the developer's current agent-built project |
| [Comprende](https://www.comprende.dev/) | Markets generation pauses, comprehension questions, and function/file/session scores | This is the discarded gate-and-score architecture; public docs did not substantiate a working executable system at review time |
| [Learning Opportunities](https://github.com/DrCatHicks/learning-opportunities) | Project-local prediction, generation, retrieval, and spaced-repetition exercises | A skill-development layer, not an autonomous build plane coupled to deterministic takeover twins |
| [learn-codebase](https://github.com/ktaletsk/learn-codebase) | Socratic tutor, active recall, and a persistent learning journal | Codebase study rather than concurrent production and control transfer |
| [CodeTrain](https://codetrain.ai/) | Local hands-on lessons generated from a codebase with a skill profile | Training product; it does not document a production swarm continuing while readiness evidence feeds future delegation |
| [CodeTeach](https://codeteach.codes/) | Interactive repository course, coding tasks, and spaced repetition | Course generation rather than live task-derived takeover operation |
| [Buggr](https://buggr.dev/) | Injects bugs into a branch of a real repository for human debugging | Separate debugging game; no per-agent-run semantic seam selection, production lane, or longitudinal autonomy router |
| [CodeSee](https://docs.codesee.io/docs/getting-started) | Maps code and dependencies | Improves orientation but does not exercise or verify action under failure |
| [PlayerZero Sim-1](https://playerzero.ai/research/sim-1) | Semantic dependencies, generated scenarios, and simulation traces | Uses simulation to reason about the software; it does not document training the human operator |

The existence of these products invalidates any novelty claim based on questions, active recall, codebase lessons, dependency maps, or bug injection alone.

Atrophy is especially useful as a product boundary. PureFlow may borrow spaced retrieval, uncertainty widening, and voluntary continuity, but not treat a generic Elo or leaderboard as project readiness. Random function questions, streaks, and public individual rankings are already available elsewhere and are easy to game.

An observational natural experiment on GitHub contribution streaks, [“How Gamification Affects Software Developers”](https://arxiv.org/abs/2006.02371), found that removing the streak counter changed contribution behavior. This supports streaks as a strong engagement lever and warns that developers will optimize the displayed proxy. PureFlow therefore limits any streak to weekly participation and keeps it separate from capability evidence.

### Integration substrate refresh — 2026-07-31

The first adapter should reuse an agent runtime, but its event model must not become PureFlow's architecture.

- [Codex App Server](https://learn.chatgpt.com/docs/app-server) is the strongest first local rich-client boundary: it documents JSONL-over-stdio, exact-version schema generation, thread and turn control, authoritative command/file-change item completion, approvals, steering, and interruption.
- [Agent Client Protocol](https://agentclientprotocol.com/updates) is the strongest second portability boundary. Its current lifecycle and [typed session updates](https://agentclientprotocol.github.io/typescript-sdk/types/SessionUpdate.html) cover tools, plans, permissions, and usage, but ACP is a protocol rather than an agent runtime.
- The [Cline SDK](https://docs.cline.bot/sdk/overview) exposes the same open-source harness used by its IDE and CLI plus [runtime/tool events](https://docs.cline.bot/sdk/events). It is a credible fallback runtime if a narrower App Server adapter cannot yield enough evidence.
- [OpenCode's server](https://opencode.ai/docs/server/) exposes an OpenAPI document and an event stream with a typed SDK. Its embedded v2 SDK is not yet the stable public boundary, so it remains a later adapter candidate.
- [Claude Managed Agents](https://platform.claude.com/docs/en/managed-agents/events-and-streaming) has a rich persisted event stream, steering, interruption, tool calls, and subagent threads, but it is hosted beta infrastructure rather than a local IDE integration surface.

This comparison leads to ADR-006: spike Codex App Server first over local stdio, then test ACP as the portability layer. Every adapter normalizes into the same Flight Recorder contract and drops raw reasoning, absolute paths, credentials, and vendor-only fields before storage.

The research refresh also found a naming collision. OpenAI now uses [Chronicle](https://learn.chatgpt.com/docs/customization/chronicle) for screen-derived Codex memory. ADR-005 therefore renames PureFlow's observable run ledger to **Flight Recorder** before R1 data or a public wire format ships.

### Representation and traceability prior art — 2026-08-01

The artifact-accountability problem has credible neighbors, so PureFlow cannot claim novelty from adding an intent graph alone.

- Microsoft Research's [Programming with Representations](https://www.microsoft.com/en-us/research/project/pwr/) puts a domain-specific representation between natural-language intent and generated code. Its published goal includes reducing the coding expertise needed to validate the result. This supports the value of an intermediate representation, but its direction is different from PureFlow's goal of preserving professional control in arbitrary existing repositories.
- [ReqToCode](https://arxiv.org/abs/2603.13999) embeds bidirectional requirement links in code and validates them during the build. It shows why traceability should fail visibly as artifacts evolve rather than live in detached documentation. It does not supply live agent-event provenance or behavioral evidence that a human can take over.
- Necula's [Proof-Carrying Code](https://doi.org/10.1145/263699.263712) lets a consumer validate that untrusted code satisfies a defined safety policy. PureFlow must not borrow the word “proof” for ordinary tests, traces, or agent claims; its proposed evidence-carrying generation is an explicitly weaker accountability mechanism.
- Code summaries and code-to-text representations may improve navigation, but model-generated prose can share the generator's original error. A reverse account needs structural and executable authority plus an honest unsupported state.

ADR-008 therefore narrows the contribution to a combined mechanism: total changed-line reconciliation, untrusted agent claim references, executable evidence joins, visible attribution debt, and a separate Operator Model that only human actions can refresh. That combination remains a hypothesis until held-out expert attribution and delayed-transfer studies pass.

## 5. Adjacent precedent: operational drills

Reliability engineering already treats human response as something to exercise:

- [Gremlin GameDays](https://www.gremlin.com/gameday) organize hypothesis-driven fault scenarios and response practice.
- [AWS guidance](https://docs.aws.amazon.com/wellarchitected/2023-04-10/framework/sec_incident_response_run_game_days.html) recommends simulated incident-response events and distinguishes discussion-based tabletop exercises.
- Google's [Wheel of Misfortune](https://cloud.google.com/blog/products/management-tools/shrinking-the-time-to-mitigate-production-incidents) uses scenario practice for incident mitigation.

These are important precedents for takeover muscle. They are periodic team events, commonly manual and operational. PureFlow's proposed contribution is to compile a short developer control episode automatically from each relevant agent change and connect the evidence to future delegation.

## 6. Differentiation statement

In the reviewed public landscape, no system was found that documents all six properties together:

1. the production agent swarm continues without waiting for training;
2. every changed line reconciles to a bounded semantic unit and an honest attribution state;
3. a semantic compiler selects a causal seam from the current real change;
4. the human receives a concurrent executable fault or counterfactual twin;
5. tests and runtime evidence judge the action rather than an LLM response alone;
6. delayed adjacent transfer updates a module-scoped readiness model that influences future delegation.

This is meaningful differentiation within the reviewed landscape, not proof of absolute global or patent novelty.

The defensible product core is therefore the combination:

> bidirectional Intent Ledger + semantic scenario compiler + attention scheduler + executable evidence judge + longitudinal takeover model

If PureFlow collapses back to explanations, questions, code tours, manual `TODO`s, or isolated bug games, it enters an already occupied category.

## 7. Research implications

The evidence suggests, but does not yet prove, the following design hypotheses:

- a full prediction–intervention–consequence loop should transfer better than post-hoc explanation alone;
- procedural, executable refreshers should be favored over verbal quizzes for takeover skills;
- practice should be sampled from real high-value project seams, not allocated by line count;
- delayed adjacent performance is a more credible outcome than immediate comprehension;
- parallelizing practice with production can preserve speed, but only if the experience remains short and voluntary;
- readiness claims must be scoped, time-stamped, and tied to observable behavior.

These hypotheses define the experiments in [`EXPERIMENTS.md`](EXPERIMENTS.md).
