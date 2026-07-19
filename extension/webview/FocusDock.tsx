import { FormEvent, useState } from "react";
import type { ClientState, Ownership } from "../src/types";
import { FocusIcon, TestIcon } from "./SidebarIcons";

interface Props {
  state: ClientState;
  remaining: string;
  send(message: unknown): void;
}

export function FocusDock({ state, remaining, send }: Props) {
  const { rep, stats } = state;
  if (rep.phase === "idle") return <StartFocus aiExtensions={state.aiExtensions} send={send} />;
  if (rep.phase === "active") return <ActiveFocus state={state} remaining={remaining} send={send} />;
  return <ReviewFocus state={state} send={send} />;
}

function StartFocus({ aiExtensions, send }: { aiExtensions: string[]; send(message: unknown): void }) {
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState(25);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "startRep", goal, duration });
  };

  return (
    <div className="route-page focus-page">
      <section className="route-title">
        <div className="eyebrow">Optional practice</div>
        <h2>Focus Rep</h2>
        <p>Temporarily turn off generation, form hypotheses, test them, and explain the result. Normal IDE work never requires a Rep.</p>
      </section>
      <form className="focus-start" onSubmit={submit}>
        <label htmlFor="focus-goal">Concrete goal</label>
        <textarea id="focus-goal" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Diagnose why the cache returns stale data" />
        <label htmlFor="focus-duration">Timebox</label>
        <select id="focus-duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
          <option value={25}>25 minutes · focused change</option>
          <option value={90}>90 minutes · deep debugging</option>
          <option value={480}>Workday · long-form practice</option>
        </select>
        {aiExtensions.length > 0 && (
          <div className="inline-warning"><strong>{aiExtensions.length} AI extension{aiExtensions.length === 1 ? "" : "s"} detected.</strong><span>PureFlow will ask before starting; it does not claim to disable them automatically.</span></div>
        )}
        <button className="button primary" type="submit" disabled={!goal.trim()}><FocusIcon /> Start Focus Rep</button>
      </form>
      <section className="plain-section">
        <h3>During a Rep</h3>
        <ul className="quiet-list">
          <li>The configured mentor remains offline.</li>
          <li>Editor, terminal, tests, debugger, and docs remain native.</li>
          <li>Only your explicit evidence becomes part of the Rep summary.</li>
        </ul>
      </section>
    </div>
  );
}

function ActiveFocus({ state, remaining, send }: Props) {
  const [hypothesis, setHypothesis] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [ownership, setOwnership] = useState<Ownership>(2);
  const add = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "addHypothesis", text: hypothesis });
    setHypothesis("");
  };

  return (
    <div className="route-page focus-page">
      <section className="active-focus-head">
        <div><span className="live-dot" /> Focus active</div>
        <strong>{remaining}</strong>
        <h2>{state.rep.goal}</h2>
        <p>AI mentor is offline. Use source, tests, debugger, and explicit evidence.</p>
      </section>

      <section className="focus-stats">
        <div><strong>{state.stats.testRuns}</strong><span>test runs</span></div>
        <div><strong>{state.stats.debugLoops}</strong><span>debug loops</span></div>
        <div><strong>{state.stats.sources}</strong><span>sources</span></div>
      </section>

      <section className="plain-section">
        <h3>Hypotheses</h3>
        <form className="inline-form" onSubmit={add}>
          <input value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} placeholder="I think this fails because…" />
          <button type="submit" disabled={!hypothesis.trim()}>Add</button>
        </form>
        <div className="hypothesis-list">
          {state.rep.hypotheses.length === 0 && <p>No hypothesis recorded yet.</p>}
          {state.rep.hypotheses.map((item) => (
            <div key={item.id} className={item.result ? `is-${item.result}` : ""}>
              <span>{item.text}</span>
              {item.result ? <small>{item.result}</small> : (
                <span className="row-actions">
                  <button onClick={() => send({ type: "resolveHypothesis", id: item.id, result: "confirmed" })}>Confirm</button>
                  <button onClick={() => send({ type: "resolveHypothesis", id: item.id, result: "rejected" })}>Reject</button>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="plain-section">
        <h3>Test evidence</h3>
        <div className="test-actions">
          <button onClick={() => send({ type: "runTests" })}><TestIcon /> Run native tests</button>
          <button onClick={() => send({ type: "logTest", status: "passed" })}>✓ Passed</button>
          <button onClick={() => send({ type: "logTest", status: "failed" })}>× Failed</button>
        </div>
      </section>

      {!finishing ? (
        <button className="button" onClick={() => setFinishing(true)}>Finish Rep…</button>
      ) : (
        <section className="finish-panel">
          <h3>Finish with evidence</h3>
          <label htmlFor="focus-outcome">What changed or what did you learn?</label>
          <textarea id="focus-outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)} />
          <label htmlFor="focus-ownership">How well could you explain it?</label>
          <select id="focus-ownership" value={ownership} onChange={(event) => setOwnership(Number(event.target.value) as Ownership)}>
            <option value={1}>I need to revisit parts</option>
            <option value={2}>I can explain the main decisions</option>
            <option value={3}>I can defend tradeoffs and edge cases</option>
          </select>
          <div className="button-row">
            <button className="button" onClick={() => setFinishing(false)}>Cancel</button>
            <button className="button primary" disabled={!outcome.trim()} onClick={() => send({ type: "finishRep", outcome, ownership })}>Complete Rep</button>
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewFocus({ state, send }: { state: ClientState; send(message: unknown): void }) {
  const { rep, stats } = state;
  const question = rep.defenseQuestions[rep.defenseAnswers.length];
  const [answer, setAnswer] = useState("");
  const [selfRated, setSelfRated] = useState<1 | 2 | 3>(2);

  return (
    <div className="route-page focus-page">
      <section className="route-title">
        <div className="eyebrow">Rep complete</div>
        <h2>{rep.goal}</h2>
        <p>{rep.outcome}</p>
      </section>
      <section className="focus-stats">
        <div><strong>{Math.max(1, Math.round(stats.focusedSeconds / 60))}m</strong><span>focused</span></div>
        <div><strong>{stats.testRuns}</strong><span>tests</span></div>
        <div><strong>{stats.debugLoops}</strong><span>loops</span></div>
      </section>

      {rep.phase === "review" && !rep.defenseQuestions.length && (
        <section className="plain-section">
          <h3>Senior defense</h3>
          <p>Ask the configured coach—or the local question set—to challenge invariants, evidence, and tradeoffs.</p>
          <button className="button primary" onClick={() => send({ type: "startDefense", share: { notes: true, tests: true, diff: false } })}>Start defense</button>
        </section>
      )}

      {question && (
        <section className="finish-panel">
          <div className="section-label">Question {rep.defenseAnswers.length + 1} of {rep.defenseQuestions.length}</div>
          <h3>{question}</h3>
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Defend your decision in a complete sentence…" />
          <select value={selfRated} onChange={(event) => setSelfRated(Number(event.target.value) as 1 | 2 | 3)}>
            <option value={1}>Uncertain</option>
            <option value={2}>Reasonably confident</option>
            <option value={3}>Can defend it clearly</option>
          </select>
          <button className="button primary" disabled={answer.trim().length < 12} onClick={() => {
            send({ type: "answerDefense", question, answer, selfRated });
            setAnswer("");
          }}>Submit answer</button>
        </section>
      )}

      {rep.phase === "complete" && (
        <div className="inline-success"><FocusIcon /><span><strong>Defense complete</strong><small>{rep.defenseAnswers.length} answers recorded locally</small></span></div>
      )}

      <section className="plain-section">
        <h3>Share only what you choose</h3>
        <p>The summary contains no code or filenames. An onchain proof is prepared locally and is not “published” until a real wallet receipt is verified.</p>
        <div className="button-stack">
          <button className="button" onClick={() => send({ type: "copySummary" })}>Copy privacy-safe summary</button>
          <button className="button" onClick={() => send({ type: "prepareAttestation" })}>Prepare Monad proof</button>
          <button className="button quiet" onClick={() => send({ type: "newRep" })}>Start another Rep</button>
        </div>
      </section>
    </div>
  );
}
