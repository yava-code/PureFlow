import { FormEvent, useMemo, useState } from "react";
import type { ClientState } from "../src/types";
import { Button, Check, LockIcon, Logo, Timeline } from "./components";

interface Attestation {
  commitment: string;
  focusedSeconds: number;
  testRuns: number;
  debugLoops: number;
  ownership: number;
}

export function CompleteRep({
  state,
  attestation,
  send,
}: {
  state: ClientState;
  attestation?: Attestation;
  send(message: unknown): void;
}) {
  const { rep, stats } = state;
  const [share, setShare] = useState({ diff: false, tests: false, notes: false });
  const [answer, setAnswer] = useState("");
  const [selfRated, setSelfRated] = useState<1 | 2 | 3>(2);
  const question = rep.defenseQuestions[rep.defenseAnswers.length];
  const complete = rep.phase === "complete";
  const elapsed = formatTime(stats.focusedSeconds);

  const metrics = useMemo(
    () => [
      ["Focused time", elapsed],
      ["Test runs", stats.testRuns],
      ["Debug loops", stats.debugLoops],
      ["Sources", stats.sources],
      ["Hints revealed", stats.hintsRevealed],
    ],
    [elapsed, stats],
  );

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault();
    if (!question) return;
    send({ type: "answerDefense", question, answer, selfRated });
    setAnswer("");
  };

  const exportCard = () => send({ type: "exportPng", data: renderCard(state) });

  return (
    <>
      <header className="app-header complete-header">
        <Logo />
        <div className="complete-status"><span /> {complete ? "Defense complete" : "Rep complete"}</div>
        <div className="elapsed"><ClockIcon /> {elapsed}</div>
        <Button onClick={() => send({ type: "newRep" })}>New Rep</Button>
      </header>

      <main className="complete-console">
        <section className="completion-intro">
          <h1>{complete ? "You defended the work." : "You kept the work in your hands."}</h1>
          <p>{rep.outcome}</p>
        </section>

        <div className="completion-columns">
          <section className="rep-card" id="rep-card" aria-labelledby="rep-card-title">
            <div className="rep-card-heading">
              <h2 id="rep-card-title">Rep Card <span>(private)</span></h2>
              <span>No code or filenames</span>
            </div>
            <div className="rep-goal">
              <small>Goal</small>
              <p>{rep.goal}</p>
            </div>
            <dl className="rep-metrics">
              {metrics.map(([label, value]) => (
                <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <div className="rep-trail">
              <small>Process trail (yours only)</small>
              <Timeline events={rep.events} startedAt={rep.startedAt} />
            </div>
            <div className="rep-actions">
              <Button onClick={() => send({ type: "copySummary" })}>Copy summary</Button>
              <Button onClick={exportCard}>Export card</Button>
            </div>
          </section>

          <section className="defense" aria-labelledby="defense-title">
            <div className="defense-heading">
              <div>
                <h2 id="defense-title">Senior Defense</h2>
                <span>{state.coachConfigured ? "AI coach configured" : "Local senior template"}</span>
              </div>
              <LockIcon />
            </div>

            {!rep.defenseQuestions.length ? (
              <div className="consent-boundary">
                <p className="boundary-copy"><LockIcon /> AI returns only after you choose what to share.</p>
                <div className="share-options">
                  <Check checked={share.diff} onChange={(event) => setShare({ ...share, diff: event.target.checked })} label="Git diff" />
                  <Check checked={share.tests} onChange={(event) => setShare({ ...share, tests: event.target.checked })} label="Test results" />
                  <Check checked={share.notes} onChange={(event) => setShare({ ...share, notes: event.target.checked })} label="Session notes" />
                </div>
                <Button variant="primary" onClick={() => send({ type: "startDefense", share })}>Start defense</Button>
                {!state.coachConfigured && (
                  <button className="text-button" onClick={() => send({ type: "configureCoach" })}>Configure an optional OpenAI-compatible coach</button>
                )}
                <p className="sealed-note"><LockIcon /> Findings remain sealed until you answer.</p>
              </div>
            ) : question ? (
              <form className="defense-question" onSubmit={submitAnswer}>
                <span>Question {rep.defenseAnswers.length + 1} of {rep.defenseQuestions.length}</span>
                <h3>{question}</h3>
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={5}
                  placeholder="Explain the invariant, evidence, and tradeoff in your own words…"
                />
                <fieldset>
                  <legend>How confident is this explanation?</legend>
                  {[1, 2, 3].map((value) => (
                    <label key={value}>
                      <input type="radio" checked={selfRated === value} onChange={() => setSelfRated(value as 1 | 2 | 3)} />
                      {value === 1 ? "Unsure" : value === 2 ? "Mostly" : "Clear"}
                    </label>
                  ))}
                </fieldset>
                <Button variant="primary" type="submit" disabled={answer.trim().length < 12}>Submit answer</Button>
              </form>
            ) : (
              <div className="defense-done">
                <DoneIcon />
                <h3>Defense complete</h3>
                <p>You answered {rep.defenseAnswers.length} questions. The gaps you noticed are useful input for the next Rep.</p>
              </div>
            )}
          </section>
        </div>

        <section className="ownership-check">
          <div>
            <h2>Ownership check-in <span>(self-report)</span></h2>
            <p>Compared with your usual sessions, how much of this work stayed in your hands?</p>
          </div>
          <strong>{rep.ownership === 1 ? "Less" : rep.ownership === 2 ? "Same" : "More"}</strong>
        </section>

        <section className="attestation-band">
          <div>
            <h2>Optional Monad attestation</h2>
            <p>Prepare a permanent commitment from this privacy-safe summary. The goal, outcome, code, and filenames are never sent onchain.</p>
          </div>
          {!attestation ? (
            <Button onClick={() => send({ type: "prepareAttestation" })}>Prepare commitment</Button>
          ) : (
            <div className="commitment-result">
              <code>{shortHash(attestation.commitment)}</code>
              <span>{state.contractAddress ? `Registry ${shortHash(state.contractAddress)}` : "Registry deploy pending"}</span>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function renderCard(state: ClientState): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 800;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "oklch(0.085 0 0)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "oklch(0.28 0.012 200)";
  context.lineWidth = 2;
  context.strokeRect(40, 40, 1320, 720);
  context.fillStyle = "oklch(0.69 0.13 198)";
  context.font = "600 34px system-ui";
  context.fillText("PureFlow", 90, 112);
  context.fillStyle = "oklch(0.93 0.006 200)";
  context.font = "700 54px system-ui";
  context.fillText("Rep complete", 90, 205);
  context.fillStyle = "oklch(0.68 0.012 200)";
  context.font = "24px ui-monospace, monospace";
  wrapText(context, state.rep.goal, 90, 270, 1170, 36, 2);
  const items = [
    ["FOCUSED", formatTime(state.stats.focusedSeconds)],
    ["TEST RUNS", state.stats.testRuns],
    ["DEBUG LOOPS", state.stats.debugLoops],
    ["SOURCES", state.stats.sources],
  ];
  items.forEach(([label, value], index) => {
    const x = 90 + index * 310;
    context.fillStyle = "oklch(0.68 0.012 200)";
    context.font = "18px ui-monospace, monospace";
    context.fillText(String(label), x, 440);
    context.fillStyle = "oklch(0.93 0.006 200)";
    context.font = "600 46px system-ui";
    context.fillText(String(value), x, 500);
  });
  context.fillStyle = "oklch(0.69 0.13 198)";
  context.font = "600 25px system-ui";
  context.fillText("You kept the work in your hands.", 90, 620);
  context.fillStyle = "oklch(0.68 0.012 200)";
  context.font = "20px system-ui";
  context.fillText("Privacy-safe summary · no code or filenames", 90, 690);
  return canvas.toDataURL("image/png");
}

function wrapText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = value.split(/\s+/);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight);
      lines++;
      line = word;
      if (lines >= maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines < maxLines) context.fillText(line, x, y + lines * lineHeight);
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function DoneIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="m14 25 7 7 14-16" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function shortHash(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

