import { FormEvent, useState } from "react";
import type { ClientState } from "../src/types";
import { Button, Choice, InfoIcon, LockIcon, Logo } from "./components";

export function StartRep({ state, send }: { state: ClientState; send(message: unknown): void }) {
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState(25);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "startRep", goal, duration });
  };

  return (
    <main className="start-screen">
      <header className="start-header">
        <Logo />
        <span>The manual practice mode for modern developers.</span>
      </header>

      <section className="start-workspace">
        <div className="start-intro">
          <h1>Keep the work in your hands.</h1>
          <p>A Rep is one focused session where you read, write, test, and debug without handing the implementation to an agent.</p>
        </div>

        <form className="start-form" onSubmit={submit}>
          <label htmlFor="goal">What do you want to understand or do yourself?</label>
          <textarea
            id="goal"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Fix the flaky cache invalidation test"
            rows={3}
            autoFocus
          />

          <fieldset className="duration-field">
            <legend>Choose a timebox</legend>
            <div className="choice-row">
              {[
                [25, "25 min", "Focused Rep"],
                [90, "90 min", "Deep Rep"],
                [480, "Full day", "Challenge"],
              ].map(([value, label, note]) => (
                <Choice key={value} type="button" active={duration === value} onClick={() => setDuration(value as number)}>
                  <strong>{label}</strong>
                  <span>{note}</span>
                </Choice>
              ))}
            </div>
          </fieldset>

          {state.aiExtensions.length > 0 && (
            <div className="shield-warning" role="status">
              <InfoIcon />
              <div>
                <strong>Comfort Shield needs attention</strong>
                <p>{state.aiExtensions.length} known AI extension{state.aiExtensions.length === 1 ? " is" : "s are"} installed in this profile. PureFlow will ask before starting.</p>
              </div>
            </div>
          )}

          <div className="start-action">
            <div><LockIcon /> Session events stay on this device.</div>
            <Button variant="primary" type="submit" disabled={!goal.trim()}>Start Pure Mode</Button>
          </div>
        </form>

        <footer className="mode-boundary">
          <div><span>Before</span><strong>AI may prepare</strong></div>
          <i aria-hidden="true" />
          <div className="is-current"><span>During</span><strong>You practice</strong></div>
          <i aria-hidden="true" />
          <div><span>After</span><strong>AI may challenge</strong></div>
        </footer>
      </section>
    </main>
  );
}

