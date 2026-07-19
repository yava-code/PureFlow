import { FormEvent, useEffect, useState } from "react";
import type { ClientState, MonadInspection, MonadProjectReport } from "../src/types";
import { CopyIcon, ExternalIcon, MonadIcon, RefreshIcon, SearchIcon } from "./SidebarIcons";

interface Attestation {
  commitment: string;
  focusedSeconds: number;
  testRuns: number;
  debugLoops: number;
  ownership: number;
}

interface Props {
  state: ClientState;
  loading: boolean;
  inspection?: MonadInspection;
  report?: MonadProjectReport;
  attestation?: Attestation;
  send(message: unknown): void;
}

export function MonadDock({ state, loading, inspection, report, attestation, send }: Props) {
  const [target, setTarget] = useState("");
  const health = state.monad;
  useEffect(() => {
    if (!health || health.status === "loading") send({ type: "refreshMonad" });
  }, []);

  const inspect = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "inspectMonad", value: target.trim() });
  };

  return (
    <div className="route-page monad-page">
      <section className="route-title">
        <div className="eyebrow">Live developer tools</div>
        <h2>Monad workbench</h2>
        <p>Inspect Testnet and this project from the IDE. Signing always stays in a user-controlled wallet.</p>
      </section>

      <section className="network-panel">
        <div className="network-title">
          <span className={health?.status === "online" ? "live-dot" : health?.status === "offline" ? "error-dot" : "local-dot"} />
          <div><strong>Monad Testnet</strong><small>{health?.status === "online" ? `Live RPC · ${health.latencyMs} ms` : health?.status === "offline" ? "RPC unavailable" : "Checking RPC…"}</small></div>
          <button aria-label="Refresh network status" onClick={() => send({ type: "refreshMonad" })}><RefreshIcon /></button>
        </div>
        {health?.status === "online" ? (
          <dl className="network-grid">
            <div><dt>Chain ID</dt><dd>{health.chainId}</dd></div>
            <div><dt>Latest</dt><dd>{formatBlock(health.latestBlock)}</dd></div>
            <div><dt>Safe</dt><dd>{formatBlock(health.safeBlock)}</dd></div>
            <div><dt>Finalized</dt><dd>{formatBlock(health.finalizedBlock)}</dd></div>
            <div className="wide"><dt>Gas price</dt><dd>{health.gasPriceGwei ? `${health.gasPriceGwei} gwei` : "—"}</dd></div>
          </dl>
        ) : health?.error ? <p className="network-error">{health.error}</p> : <div className="loading-rows"><i /><i /></div>}
      </section>

      <section className="plain-section">
        <h3>Address or transaction inspector</h3>
        <form className="inspector-form" onSubmit={inspect}>
          <div><SearchIcon /><input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="0x address or transaction hash" spellCheck={false} /></div>
          <button className="button primary" type="submit" disabled={!target.trim() || loading}>{loading ? "Reading RPC…" : "Inspect live"}</button>
        </form>
        {inspection && <InspectionResult value={inspection} send={send} />}
      </section>

      <section className="plain-section project-doctor">
        <div className="heading-row"><h3>Monad Project Doctor</h3><button onClick={() => send({ type: "runMonadDoctor" })}>Run scan</button></div>
        <p>Detect local Hardhat, Foundry, Solidity, viem, and wagmi signals. The scan is read-only.</p>
        {report && (
          <div className="doctor-report">
            <div className="report-kind">Detected: <strong>{report.kind}</strong></div>
            {report.checks.map((check) => (
              <div className={`doctor-check is-${check.status}`} key={`${check.label}-${check.detail}`}>
                <span>{check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "·"}</span>
                <div><strong>{check.label}</strong><small>{check.detail}</small></div>
              </div>
            ))}
            {report.actions.length > 0 && <div className="doctor-actions"><strong>Next actions</strong><ol>{report.actions.map((action) => <li key={action}>{action}</li>)}</ol></div>}
          </div>
        )}
      </section>

      <section className="proof-panel">
        <div className="section-label">Privacy-safe Rep proof</div>
        {attestation ? (
          <>
            <div className="proof-status"><span className="local-dot" /><strong>Prepared, not published</strong></div>
            <code title={attestation.commitment}>{short(attestation.commitment, 12, 10)}</code>
            <dl>
              <div><dt>Focus</dt><dd>{Math.round(attestation.focusedSeconds / 60)}m</dd></div>
              <div><dt>Tests</dt><dd>{attestation.testRuns}</dd></div>
              <div><dt>Debug loops</dt><dd>{attestation.debugLoops}</dd></div>
            </dl>
            <div className="button-stack">
              <button className="button" onClick={() => send({ type: "copyAttestation", payload: attestation })}><CopyIcon /> Copy payload</button>
              <button className="button primary" onClick={() => send({ type: "openAttestation", payload: attestation })}>Continue in wallet companion <ExternalIcon /></button>
            </div>
          </>
        ) : (
          <>
            <div className="proof-empty"><MonadIcon /><div><strong>No proof prepared</strong><p>Complete a Focus Rep, then choose Prepare Monad proof. Code, goals, and filenames stay local.</p></div></div>
            {state.rep.phase !== "idle" && state.rep.phase !== "active" && <button className="button" onClick={() => send({ type: "prepareAttestation" })}>Prepare from last Rep</button>}
          </>
        )}
        {!state.contractAddress && <div className="inline-warning"><strong>Registry deployment pending.</strong><span>A verified state cannot be shown until the contract is funded, deployed, and checked on Testnet.</span></div>}
      </section>

      <footer className="route-footnote">Gas costs use the transaction gas limit, not only the gas consumed. Write actions will estimate tightly and add no more than a 10% buffer.</footer>
    </div>
  );
}

function InspectionResult({ value, send }: { value: MonadInspection; send(message: unknown): void }) {
  return (
    <div className={`inspection-result is-${value.status}`}>
      <div className="inspection-head">
        <div><span className={value.status === "live" ? "live-dot" : value.status === "failed" ? "error-dot" : "local-dot"} /><strong>{value.title}</strong></div>
        <button onClick={() => send({ type: "openExternal", url: value.explorerUrl })}><ExternalIcon /> Explorer</button>
      </div>
      <code title={value.input}>{short(value.input, 14, 10)}</code>
      <dl>{value.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd title={field.value}>{field.value}</dd></div>)}</dl>
    </div>
  );
}

function formatBlock(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "—";
}

function short(value: string, head: number, tail: number) {
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

export type { Attestation };
