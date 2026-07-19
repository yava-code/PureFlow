import { useEffect, useMemo, useState } from "react";
import type { ClientState, KnowledgeResult } from "../src/types";
import { ActiveRep } from "./ActiveRep";
import { CompleteRep } from "./CompleteRep";
import { StartRep } from "./StartRep";
import { vscode } from "./vscode";

interface Attestation {
  commitment: string;
  focusedSeconds: number;
  testRuns: number;
  debugLoops: number;
  ownership: number;
}

export function App() {
  const [state, setState] = useState<ClientState>();
  const [results, setResults] = useState<KnowledgeResult[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; message: string }>();
  const [attestation, setAttestation] = useState<Attestation>();
  const send = (message: unknown) => vscode.postMessage(message);

  useEffect(() => {
    const listener = (event: MessageEvent<Record<string, unknown>>) => {
      const message = event.data;
      if (message.type === "state") {
        setState(message.state as ClientState);
        const next = message.state as ClientState;
        if (next.rep.phase !== "active") setFinishing(false);
      }
      if (message.type === "knowledgeLoading") setLoading(true);
      if (message.type === "knowledgeResults") {
        setResults(message.results as KnowledgeResult[]);
        setQuery(String(message.query ?? ""));
        setLoading(false);
      }
      if (message.type === "prefillSearch") setQuery(String(message.query ?? ""));
      if (message.type === "showFinish") setFinishing(true);
      if (message.type === "showStart") setFinishing(false);
      if (message.type === "toast") setNotice({ tone: "ok", message: String(message.message) });
      if (message.type === "error") setNotice({ tone: "error", message: String(message.message) });
      if (message.type === "attestation") setAttestation(message.payload as Attestation);
    };
    window.addEventListener("message", listener);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    if (!state || state.rep.phase !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state?.rep.phase]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(undefined), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const remaining = useMemo(() => {
    if (!state?.rep.startedAt) return "00:00";
    const end = state.rep.startedAt + state.rep.durationMinutes * 60_000;
    const seconds = Math.max(0, Math.ceil((end - now) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [state?.rep.startedAt, state?.rep.durationMinutes, now]);

  if (!state) {
    return <LoadingScreen />;
  }

  return (
    <div className="app-shell">
      {state.rep.phase === "idle" && <StartRep state={state} send={send} />}
      {state.rep.phase === "active" && (
        <ActiveRep
          state={state}
          remaining={remaining}
          results={results}
          query={query}
          loading={loading}
          finishing={finishing}
          onFinishMode={setFinishing}
          onQuery={setQuery}
          send={send}
        />
      )}
      {(state.rep.phase === "review" || state.rep.phase === "complete") && (
        <CompleteRep state={state} attestation={attestation} send={send} />
      )}
      {notice && <div className={`toast toast-${notice.tone}`} role="status">{notice.message}</div>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-label="Loading PureFlow">
      <span className="loading-mark" />
      <div />
      <div />
      <div />
    </main>
  );
}
