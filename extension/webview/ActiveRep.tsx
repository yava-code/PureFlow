import { FormEvent, useEffect, useRef, useState } from "react";
import type { ClientState, KnowledgeResult } from "../src/types";
import {
  Button,
  ExternalIcon,
  InfoIcon,
  LockIcon,
  PlayIcon,
  SearchIcon,
  SectionTitle,
  StatStrip,
  Timeline,
} from "./components";

interface ActiveRepProps {
  state: ClientState;
  remaining: string;
  results: KnowledgeResult[];
  query: string;
  loading: boolean;
  finishing: boolean;
  onFinishMode(value: boolean): void;
  onQuery(value: string): void;
  send(message: unknown): void;
}

export function ActiveRep({
  state,
  remaining,
  results,
  query,
  loading,
  finishing,
  onFinishMode,
  onQuery,
  send,
}: ActiveRepProps) {
  const { rep } = state;
  const [hypothesis, setHypothesis] = useState("");
  const [recall, setRecall] = useState("");

  const addHypothesis = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "addHypothesis", text: hypothesis });
    setHypothesis("");
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "search", query });
  };

  return (
    <>
      <header className="app-header active-header">
        <HeaderBrand />
        <div className="mode"><span /> Pure Mode</div>
        <div className="timer" aria-label={`${remaining} remaining`}>
          <strong>{remaining}</strong>
          <span>remaining</span>
        </div>
        <Button onClick={() => onFinishMode(true)}>Finish Rep</Button>
      </header>

      <main className="console active-console">
        {finishing && <FinishRep send={send} onCancel={() => onFinishMode(false)} />}

        <section className="goal-band" aria-labelledby="goal-title">
          <div>
            <span className="quiet-label">Session goal</span>
            <h1 id="goal-title">{rep.goal}</h1>
          </div>
          <div className="offline-note"><InfoIcon /> AI is offline during this Rep</div>
        </section>

        <section className="console-section">
          <SectionTitle>Session timeline</SectionTitle>
          <Timeline events={rep.events} startedAt={rep.startedAt} />
        </section>

        <section className="console-section debug-section">
          <SectionTitle
            action={<Button variant="quiet" onClick={() => send({ type: "runTests" })}><PlayIcon /> Run workspace test task</Button>}
          >
            Debug Notebook
          </SectionTitle>
          <form className="hypothesis-form" onSubmit={addHypothesis}>
            <label htmlFor="hypothesis">Current hypothesis</label>
            <div className="input-action">
              <textarea
                id="hypothesis"
                value={hypothesis}
                onChange={(event) => setHypothesis(event.target.value)}
                placeholder="The behavior fails because…"
                rows={2}
              />
              <Button variant="amber" type="submit" disabled={!hypothesis.trim()}>Record hypothesis</Button>
            </div>
          </form>
          {rep.hypotheses.some((item) => !item.result) && (
            <div className="open-hypotheses">
              {rep.hypotheses.filter((item) => !item.result).map((item) => (
                <div key={item.id}>
                  <p>{item.text}</p>
                  <div>
                    <Button variant="quiet" onClick={() => send({ type: "resolveHypothesis", id: item.id, result: "confirmed" })}>Confirmed</Button>
                    <Button variant="quiet" onClick={() => send({ type: "resolveHypothesis", id: item.id, result: "rejected" })}>Rejected</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="test-evidence">
            <span>Record the result after the test task finishes:</span>
            <Button variant="quiet" onClick={() => send({ type: "logTest", status: "failed" })}>Test failed</Button>
            <Button variant="quiet" onClick={() => send({ type: "logTest", status: "passed" })}>Tests passed</Button>
          </div>
        </section>

        <section className="console-section knowledge-section">
          <SectionTitle>Knowledge Dock</SectionTitle>
          <form className="search-form" onSubmit={search}>
            <SearchIcon />
            <input
              aria-label="Search official docs and Stack Overflow"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search a symbol or API"
            />
            <Button variant="quiet" type="submit">Search</Button>
          </form>
          <div className="source-list" aria-live="polite" aria-busy={loading}>
            {loading && [0, 1, 2].map((item) => <div className="source-skeleton" key={item} />)}
            {!loading && results.map((result) => (
              <button
                key={result.id}
                className="source-row"
                onClick={() => send({ type: "openSource", source: result })}
              >
                <span className={`source-mark source-${result.kind}`}>{sourceInitial(result)}</span>
                <span className="source-copy">
                  <strong>{result.title}</strong>
                  <small>{result.detail}{result.version ? ` · ${result.version}` : ""}</small>
                </span>
                <ExternalIcon />
              </button>
            ))}
            {!loading && !results.length && (
              <div className="empty-state">No exact local match. Try the API name without punctuation.</div>
            )}
          </div>
        </section>

        <section className="console-section recall-section">
          <SectionTitle>Recall Ladder</SectionTitle>
          <p className="section-intro">Write what you remember first. Reveal only as much help as the next attempt needs.</p>
          <textarea
            className="recall-input"
            value={recall}
            onChange={(event) => setRecall(event.target.value)}
            placeholder="Expected signature, behavior, or approach…"
            rows={2}
          />
          <RecallLadder level={rep.recallLevel} hasAttempt={Boolean(recall.trim())} send={send} />
          {rep.recallLevel > 0 && (
            <div className="reveal-content">
              {rep.recallLevel >= 1 && <p><strong>Hint</strong> Find the lifecycle boundary before changing the timeout.</p>}
              {rep.recallLevel >= 2 && <p><strong>Docs</strong> {results[0]?.excerpt ?? "Open the exact API reference in Knowledge Dock."}</p>}
              {rep.recallLevel >= 3 && <pre><code>{`const signal = AbortSignal.timeout(2_000);\nawait fetch(url, { signal });`}</code></pre>}
            </div>
          )}
        </section>

        <section className="console-section stats-section">
          <StatStrip stats={state.stats} />
        </section>
      </main>
    </>
  );
}

function HeaderBrand() {
  return (
    <div className="compact-brand">
      <span className="mini-mark" aria-hidden="true" />
      <strong>PureFlow</strong>
    </div>
  );
}

function FinishRep({ send, onCancel }: { send(message: unknown): void; onCancel(): void }) {
  const panel = useRef<HTMLElement>(null);
  const [outcome, setOutcome] = useState("");
  const [ownership, setOwnership] = useState<1 | 2 | 3>(3);
  useEffect(() => panel.current?.scrollIntoView({ block: "start" }), []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "finishRep", outcome, ownership });
  };
  return (
    <section ref={panel} className="finish-band" aria-labelledby="finish-title">
      <div className="finish-copy">
        <LockIcon />
        <div>
          <h2 id="finish-title">Close the loop in your own words.</h2>
          <p>This explanation stays local unless you explicitly share session notes in Senior Defense.</p>
        </div>
      </div>
      <form onSubmit={submit}>
        <label htmlFor="outcome">What changed or what did you learn?</label>
        <textarea id="outcome" rows={2} value={outcome} onChange={(event) => setOutcome(event.target.value)} />
        <fieldset>
          <legend>How much of this work stayed in your hands?</legend>
          {[1, 2, 3].map((value) => (
            <label key={value}>
              <input type="radio" name="ownership" checked={ownership === value} onChange={() => setOwnership(value as 1 | 2 | 3)} />
              {value === 1 ? "Less" : value === 2 ? "Same" : "More"}
            </label>
          ))}
        </fieldset>
        <div className="finish-actions">
          <Button type="button" variant="quiet" onClick={onCancel}>Keep working</Button>
          <Button type="submit" variant="primary" disabled={!outcome.trim()}>Complete Rep</Button>
        </div>
      </form>
    </section>
  );
}

function RecallLadder({ level, hasAttempt, send }: { level: number; hasAttempt: boolean; send(message: unknown): void }) {
  const steps = [
    { name: "Recall", note: hasAttempt ? "Attempt written" : "Write first" },
    { name: "Hint", note: level >= 1 ? "Revealed" : hasAttempt ? "Available" : "Locked" },
    { name: "Docs", note: level >= 2 ? "Revealed" : level >= 1 ? "Available" : "Locked" },
    { name: "Example", note: level >= 3 ? "Revealed" : level >= 2 ? "Available" : "Locked" },
  ];
  return (
    <ol className="ladder">
      {steps.map((step, index) => {
        const available = index === 0 ? hasAttempt : hasAttempt && index <= level + 1;
        const revealed = index === 0 ? hasAttempt : index <= level;
        return (
          <li key={step.name} className={revealed ? "is-revealed" : available ? "is-available" : "is-locked"}>
            <button
              disabled={!available || revealed || index === 0}
              onClick={() => send({ type: "revealRecall", level: index })}
              aria-label={`${step.name}: ${step.note}`}
            >
              <span>{revealed ? "✓" : index + 1}</span>
              <strong>{step.name}</strong>
              <small>{step.note}</small>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function sourceInitial(result: KnowledgeResult): string {
  if (result.source === "Stack Overflow") return "SO";
  if (result.source.includes("MDN")) return "MDN";
  if (result.source.includes("TypeScript")) return "TS";
  return "N";
}
