import { createHash, randomUUID } from "node:crypto";
import type {
  DefenseAnswer,
  HypothesisResult,
  Ownership,
  RepEvent,
  RepState,
  RepStats,
  TestStatus,
} from "./types";

const event = (type: RepEvent["type"], label: string, meta?: RepEvent["meta"]): RepEvent => ({
  id: randomUUID(),
  type,
  at: Date.now(),
  label,
  meta,
});

export function emptyRep(): RepState {
  return {
    id: randomUUID(),
    phase: "idle",
    goal: "",
    durationMinutes: 25,
    outcome: "",
    recallLevel: 0,
    hypotheses: [],
    events: [],
    defenseQuestions: [],
    defenseAnswers: [],
  };
}

export function startRep(goal: string, durationMinutes: number, now = Date.now()): RepState {
  const normalizedGoal = goal.trim();
  if (!normalizedGoal) throw new Error("A Rep needs a concrete goal.");
  if (![25, 90, 480].includes(durationMinutes)) throw new Error("Unsupported Rep duration.");

  return {
    ...emptyRep(),
    phase: "active",
    goal: normalizedGoal,
    durationMinutes,
    startedAt: now,
    events: [{ ...event("rep.started", "Rep started", { durationMinutes }), at: now }],
  };
}

export function addHypothesis(rep: RepState, text: string): RepState {
  requireActive(rep);
  const value = text.trim();
  if (!value) throw new Error("Write the hypothesis you want to test.");
  const hypothesis = { id: randomUUID(), text: value, createdAt: Date.now() };
  return {
    ...rep,
    hypotheses: [...rep.hypotheses, hypothesis],
    events: [...rep.events, event("hypothesis.created", "Hypothesis formed")],
  };
}

export function resolveHypothesis(
  rep: RepState,
  id: string,
  result: HypothesisResult,
): RepState {
  requireActive(rep);
  const exists = rep.hypotheses.some((hypothesis) => hypothesis.id === id && !hypothesis.result);
  if (!exists) throw new Error("That hypothesis is no longer open.");
  const label = result === "confirmed" ? "Hypothesis confirmed" : "Hypothesis rejected";
  return {
    ...rep,
    hypotheses: rep.hypotheses.map((hypothesis) =>
      hypothesis.id === id ? { ...hypothesis, result, resolvedAt: Date.now() } : hypothesis,
    ),
    events: [...rep.events, event("hypothesis.resolved", label, { result })],
  };
}

export function logTest(rep: RepState, status: TestStatus): RepState {
  requireActive(rep);
  return {
    ...rep,
    events: [
      ...rep.events,
      event("test.finished", status === "passed" ? "Tests passed" : "Test failed", { status }),
    ],
  };
}

export function revealRecall(rep: RepState, level: 1 | 2 | 3): RepState {
  requireActive(rep);
  if (level > rep.recallLevel + 1) throw new Error("Reveal the ladder one step at a time.");
  if (level <= rep.recallLevel) return rep;
  const labels = ["", "Hint revealed", "Docs revealed", "Example revealed"];
  return {
    ...rep,
    recallLevel: level,
    events: [...rep.events, event("recall.revealed", labels[level]!, { level })],
  };
}

export function recordDoc(rep: RepState, source: string, title: string): RepState {
  requireActive(rep);
  return {
    ...rep,
    events: [...rep.events, event("doc.opened", `Opened ${source}`, { title, source })],
  };
}

export function recordExternalChange(rep: RepState): RepState {
  requireActive(rep);
  return {
    ...rep,
    events: [...rep.events, event("file.externalChange", "External file change detected")],
  };
}

export function finishRep(
  rep: RepState,
  outcome: string,
  ownership: Ownership,
  now = Date.now(),
): RepState {
  requireActive(rep);
  const value = outcome.trim();
  if (!value) throw new Error("Describe what changed or what you learned.");
  return {
    ...rep,
    phase: "review",
    outcome: value,
    ownership,
    finishedAt: now,
    events: [...rep.events, { ...event("rep.finished", "Rep complete"), at: now }],
  };
}

export function startDefense(rep: RepState, questions: string[]): RepState {
  if (rep.phase !== "review") throw new Error("Finish the Rep before starting defense.");
  const clean = questions.map((question) => question.trim()).filter(Boolean).slice(0, 5);
  if (clean.length < 3) throw new Error("Defense needs at least three questions.");
  return {
    ...rep,
    defenseQuestions: clean,
    events: [...rep.events, event("defense.questioned", "Senior Defense started")],
  };
}

export function answerDefense(rep: RepState, answer: DefenseAnswer): RepState {
  if (rep.phase !== "review" || !rep.defenseQuestions.length) {
    throw new Error("Start Senior Defense before answering.");
  }
  const expected = rep.defenseQuestions[rep.defenseAnswers.length];
  if (!expected || expected !== answer.question) throw new Error("Answer the current question first.");
  if (answer.answer.trim().length < 12) throw new Error("Defend the decision in a complete sentence.");
  const answers = [...rep.defenseAnswers, { ...answer, answer: answer.answer.trim() }];
  return {
    ...rep,
    phase: answers.length === rep.defenseQuestions.length ? "complete" : "review",
    defenseAnswers: answers,
    events: [
      ...rep.events,
      event("defense.answered", `Defense answer ${answers.length}`, {
        selfRated: answer.selfRated,
      }),
    ],
  };
}

export function stats(rep: RepState, now = Date.now()): RepStats {
  const end = rep.finishedAt ?? now;
  const focusedSeconds = rep.startedAt ? Math.max(0, Math.round((end - rep.startedAt) / 1000)) : 0;
  const tests = rep.events.filter((item) => item.type === "test.finished");
  return {
    focusedSeconds,
    testRuns: tests.length,
    passedTests: tests.filter((item) => item.meta?.status === "passed").length,
    debugLoops: rep.events.filter((item) => item.type === "hypothesis.resolved").length,
    sources: new Set(
      rep.events.filter((item) => item.type === "doc.opened").map((item) => item.meta?.source),
    ).size,
    hintsRevealed: rep.events.filter((item) => item.type === "recall.revealed").length,
  };
}

export function summary(rep: RepState): string {
  const value = stats(rep, rep.finishedAt);
  return [
    "PureFlow Rep",
    `Goal: ${rep.goal}`,
    `Outcome: ${rep.outcome}`,
    `Focused: ${formatDuration(value.focusedSeconds)}`,
    `Evidence: ${value.testRuns} test runs · ${value.debugLoops} debug loops · ${value.sources} sources`,
  ].join("\n");
}

export function commitment(rep: RepState): `0x${string}` {
  if (!rep.finishedAt || !rep.ownership) throw new Error("Finish the Rep before attesting it.");
  const value = stats(rep, rep.finishedAt);
  const canonical = JSON.stringify({
    version: 1,
    id: rep.id,
    goal: rep.goal,
    outcome: rep.outcome,
    startedAt: rep.startedAt,
    finishedAt: rep.finishedAt,
    ownership: rep.ownership,
    ...value,
  });
  return `0x${createHash("sha256").update(canonical).digest("hex")}`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function requireActive(rep: RepState): void {
  if (rep.phase !== "active") throw new Error("This action is available only during an active Rep.");
}
