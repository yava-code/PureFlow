import { describe, expect, it } from "vitest";
import {
  addHypothesis,
  answerDefense,
  commitment,
  finishRep,
  logTest,
  resolveHypothesis,
  revealRecall,
  startDefense,
  startRep,
  stats,
  summary,
} from "../src/domain";

describe("Rep workflow", () => {
  it("keeps a complete evidence trail through defense", () => {
    const startedAt = 1_750_000_000_000;
    let rep = startRep("Fix cache invalidation", 25, startedAt);
    rep = addHypothesis(rep, "The request timeout owns the cache lifetime");
    const hypothesis = rep.hypotheses[0]!;
    rep = logTest(rep, "failed");
    rep = resolveHypothesis(rep, hypothesis.id, "confirmed");
    rep = revealRecall(rep, 1);
    rep = logTest(rep, "passed");
    rep = finishRep(rep, "Separated request timeout from cache lifetime", 3, startedAt + 1_518_000);
    rep = startDefense(rep, ["Question one?", "Question two?", "Question three?"]);
    for (const question of rep.defenseQuestions) {
      rep = answerDefense(rep, {
        question,
        answer: "The invariant is defended with a targeted regression test.",
        selfRated: 3,
      });
    }

    expect(rep.phase).toBe("complete");
    expect(stats(rep)).toMatchObject({
      focusedSeconds: 1518,
      testRuns: 2,
      passedTests: 1,
      debugLoops: 1,
      hintsRevealed: 1,
    });
    expect(summary(rep)).not.toContain("src/");
    expect(commitment(rep)).toMatch(/^0x[\da-f]{64}$/);
  });

  it("does not allow skipping Recall Ladder levels", () => {
    const rep = startRep("Understand AbortSignal.timeout", 25);
    expect(() => revealRecall(rep, 2)).toThrow("one step at a time");
  });

  it("rejects finishing without a self-explanation", () => {
    const rep = startRep("Trace a request", 25);
    expect(() => finishRep(rep, "", 2)).toThrow("Describe what changed");
  });

  it("keeps the coach outside an active Rep in the state machine", () => {
    const rep = startRep("Manual refactor", 25);
    expect(() => startDefense(rep, ["One?", "Two?", "Three?"])).toThrow("Finish the Rep");
  });
});

