# `ai-will-challenge-you` launch plan

## Objective

Use the public Agent Skill as a low-cost test of the post-generation ownership interaction and as the first distribution wedge for PureFlow v0.2.

The objective is not to manufacture stars. It is to earn discovery from a sharp problem, a one-command install, a reproducible demo, honest evidence, and useful failure reports.

## Positioning

### Hero

> **Your AI can write it. Can you still own it?**

### Supporting line

> A Claude Code and Codex skill that turns agent-written changes into short, evidence-backed understanding challenges without asking you to rewrite the code.

### Category

**Post-generation engineering ownership**, not:

- anti-vibe coding;
- a learning course;
- a pre-code planning interview;
- another generic AI reviewer;
- an AI-use detector;
- manual coding enforcement.

### CTA

> Try it on one real agent-written change and report where the challenge was wrong, shallow, redundant, or annoying.

This CTA produces eval cases. “Please star” produces little product evidence.

## Repository package

The public repository should contain:

- one canonical standard skill under `skills/ai-will-challenge-you/`;
- Codex `agents/openai.yaml` metadata;
- Claude Code plugin and marketplace manifests;
- one-command `skills.sh` installation;
- direct Claude and Codex installation paths;
- research with limitations;
- clearly labeled design targets;
- trigger and behavior eval cases;
- deterministic structural validation and CI;
- MIT license, security policy, contributing guide, issue form, and PR template.

Do not duplicate the skill into committed `.claude/skills` and `.agents/skills` folders. Installation paths are not source-of-truth folders.

## GitHub discovery setup

### Description

```text
Let agents write the code. Stay able to explain, predict, and take over. A portable skill for Claude Code and Codex.
```

### Topics

Use focused, accurate topics:

```text
agent-skills
claude-code
codex
ai-coding
developer-tools
software-engineering
code-review
human-in-the-loop
vibe-coding
socratic-learning
```

GitHub permits up to 20 topics and uses them for repository discovery. Topic names must use lowercase letters, numbers, and hyphens.

### Social preview brief

Prepare a 1280×640 PNG under 1 MB:

- near-black solid background;
- large line: `YOUR AI CAN WRITE IT.`;
- contrasting line: `CAN YOU STILL OWN IT?`;
- small evidence chain: `behavior → boundary → invariant → evidence`;
- one restrained teal accent;
- repository name and `Claude Code + Codex`;
- no robot stock art, fake terminal screenshot, gradient text, or fake metric.

GitHub recommends at least 640×320 and 1280×640 for best display. Upload the final asset in repository Settings; committing an image alone does not set the social preview.

### Community surface

- Keep CI green before the first public post.
- Publish `v0.1.0` only after installation works from the public URL.
- Enable Discussions after the first users need a place for design conversations.
- Use Issues for reproducible failure cases.
- Add a 20–30 second GIF only when it demonstrates the real workflow, not a staged mock.

## Distribution sequence

### Stage 1 — Reproducible release

1. Push `main`.
2. Set description and topics.
3. Confirm public README images, badges, and internal links.
4. Run the public `npx skills add yava-code/ai-will-challenge-you --list` path.
5. Install through the Claude marketplace on a clean environment.
6. Install through Codex's skill installer on a clean environment.
7. Tag `v0.1.0` and publish release notes with known limitations.
8. Confirm the public CI run.

### Stage 2 — Real demo

Record one agent implementing a meaningful change, then show:

1. verified delivery;
2. five-line Change Model;
3. one counterfactual;
4. evidence reveal;
5. `skip` and Autopilot behavior.

The demo should show zero manual code and one real test/symbol anchor.

### Stage 3 — Problem-first launch

Share a short founder story:

- “I did not stop using agents.”
- “I stopped believing that a green test suite and a generated summary meant I owned the system.”
- “This skill lets the agent finish, then spends 90 seconds on one failure boundary.”
- include the real demo and install command;
- ask for adversarial examples and feedback.

### Stage 4 — Direct validation

Invite 8–12 agent-heavy developers who have already described the problem. Ask them to use the skill on a current branch, not a toy exercise. Do not ask for stars or positive feedback. Ask:

- Was the challenge worth the interruption?
- Was it answerable from evidence?
- Did it reveal a wrong mental model?
- Would Autopilot, Ownership, or Takeover be the default?
- What did it miss?

### Stage 5 — Directories and communities

After the public URL and demo work:

- install through [`skills.sh`](https://www.skills.sh/docs) so the repository becomes discoverable through real CLI activity;
- submit to curated Agent Skill lists only after real users and eval evidence exist;
- use Show HN only when visitors can install and reproduce the demo;
- use Product Hunt later, when the PureFlow IDE or a strong interactive demo exists;
- post to relevant Claude Code, Codex, and agent-development communities with the failure mode and technical mechanism, not cross-posted hype copy.

Never automate stars, use fake accounts, reward engagement, ask coordinated groups to upvote, or misrepresent install events as active users.

## Ready-to-adapt launch copy

### Short post

```text
I am not quitting vibe coding. That would be like quitting calculators.

The problem is that agents can now change a system faster than I can keep a model of it. “Read the 2,000-line diff” is not a workflow, and asking the same AI to summarize itself is not ownership.

AI Will Challenge You lets Claude Code or Codex finish the implementation, then asks one evidence-backed question about the changed boundary, invariant, or failure mode. No manual rewrite. Always skippable.

npx skills add yava-code/ai-will-challenge-you

Try it on a real change and tell me where the challenge is wrong or annoying.
```

### Show HN title

```text
Show HN: AI Will Challenge You – keep agent-written systems understandable
```

### First comment outline

1. Personal problem and why abandoning agents is irrational.
2. Exact mechanism: deliver → Change Model → predict → evidence.
3. What v0.1 cannot prove.
4. Research motivation with limitations.
5. Install command and request for failure cases.

Do not ask anyone to upvote. Hacker News guidelines prohibit soliciting votes.

## Launch metrics

Separate discovery from product value.

### Discovery

- unique repository visitors;
- README-to-install conversion where measurable;
- real `skills.sh` install events, labeled as install events rather than unique active users;
- issue/discussion conversion;
- repeat contributors;
- organic references from outside the owner account.

### Product signal

- qualified runs where a substantial code change exists;
- percentage that voluntarily enters Ownership or Takeover;
- skip rate and reason;
- median active handoff time;
- challenge failure reports per 100 qualified runs;
- claims without adequate evidence;
- 24-hour prediction and cold-agent handoff outcomes in consented research.

### Anti-metrics

Do not optimize for:

- stars disconnected from installs or use;
- raw impressions;
- number of questions asked;
- time trapped in the handoff;
- a developer score;
- unverifiable “skills preserved” testimonials.

## First-week cadence

| Day | Action | Evidence expected |
| --- | --- | --- |
| 0 | Public push, CI, metadata, installation smoke tests | Clean installs and URLs |
| 1 | Publish the real 30-second demo | Reproducible workflow |
| 2–3 | Five direct user trials | Wrong/annoying challenge cases |
| 4 | Release the smallest prompt corrections | Before/after forward tests |
| 5–7 | Community post and directory submission | New users outside the founder network |

Release small, substantive fixes as `v0.1.x`. Do not manufacture commit volume or changelog entries.

## Sources

- [GitHub: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [GitHub: Social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- [GitHub: Repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- [GitHub: Community profile](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)
- [GitHub: Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
- [Agent Skills specification](https://agentskills.io/specification)
- [OpenAI: Build skills](https://developers.openai.com/codex/skills)
- [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [skills.sh documentation](https://www.skills.sh/docs)
- [Hacker News guidelines](https://news.ycombinator.com/newsguidelines.html)
