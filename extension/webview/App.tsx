import { useEffect, useMemo, useState } from "react";
import type {
  ClientState,
  EditorContext,
  KnowledgeResult,
  MentorMode,
  MentorResponse,
  MonadHealth,
  MonadInspection,
  MonadProjectReport,
  SidebarRoute,
  WorkspaceSnapshot,
} from "../src/types";
import { Mark } from "./components";
import { FocusDock } from "./FocusDock";
import { MentorDock } from "./MentorDock";
import { Attestation, MonadDock } from "./MonadDock";
import { FocusIcon, MentorIcon, MonadIcon, WorkspaceIcon } from "./SidebarIcons";
import { vscode } from "./vscode";
import { WorkspaceHome } from "./WorkspaceHome";

interface SavedUi {
  route?: SidebarRoute;
}

const routes: Array<{ id: SidebarRoute; label: string; icon: React.ReactNode }> = [
  { id: "workspace", label: "Workspace", icon: <WorkspaceIcon /> },
  { id: "mentor", label: "Mentor", icon: <MentorIcon /> },
  { id: "focus", label: "Focus", icon: <FocusIcon /> },
  { id: "monad", label: "Monad", icon: <MonadIcon /> },
];

export function App() {
  const saved = vscode.getState() as SavedUi | undefined;
  const [state, setState] = useState<ClientState>();
  const [route, setRoute] = useState<SidebarRoute>(saved?.route ?? "workspace");
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>();
  const [context, setContext] = useState<EditorContext>();
  const [results, setResults] = useState<KnowledgeResult[]>([]);
  const [query, setQuery] = useState("");
  const [docsLoading, setDocsLoading] = useState(true);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorResult, setMentorResult] = useState<MentorResponse>();
  const [mentorMode, setMentorMode] = useState<MentorMode>();
  const [monadLoading, setMonadLoading] = useState(false);
  const [inspection, setInspection] = useState<MonadInspection>();
  const [projectReport, setProjectReport] = useState<MonadProjectReport>();
  const [attestation, setAttestation] = useState<Attestation>();
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; message: string }>();
  const [now, setNow] = useState(Date.now());
  const send = (message: unknown) => vscode.postMessage(message);

  useEffect(() => {
    const listener = (event: MessageEvent<Record<string, unknown>>) => {
      const message = event.data;
      if (message.type === "state") {
        const next = message.state as ClientState;
        setState(next);
        if (next.workspace) setWorkspace(next.workspace);
        if (next.editor) setContext(next.editor);
        if (next.monad) setState((current) => current ? { ...current, monad: next.monad } : next);
      }
      if (message.type === "workspaceState") setWorkspace(message.workspace as WorkspaceSnapshot);
      if (message.type === "route") changeRoute(message.route as SidebarRoute, false);
      if (message.type === "mentorContext") {
        const nextMode = message.mode as MentorMode;
        const nextContext = message.context as EditorContext;
        setContext(nextContext);
        setMentorMode(nextMode);
        changeRoute("mentor", false);
        setMentorLoading(true);
        setMentorResult(undefined);
        send({ type: "mentor", mode: nextMode, context: nextContext });
      }
      if (message.type === "mentorLoading") {
        setMentorLoading(true);
        setMentorResult(undefined);
      }
      if (message.type === "mentorResult") {
        setMentorLoading(false);
        setMentorResult(message.result as MentorResponse);
      }
      if (message.type === "knowledgeLoading") setDocsLoading(true);
      if (message.type === "knowledgeResults") {
        setResults(message.results as KnowledgeResult[]);
        setQuery(String(message.query ?? ""));
        setDocsLoading(false);
      }
      if (message.type === "prefillSearch") {
        setQuery(String(message.query ?? ""));
        changeRoute("mentor", false);
      }
      if (message.type === "monadLoading") setMonadLoading(true);
      if (message.type === "monadHealth") {
        const monad = message.health as MonadHealth;
        setState((current) => current ? { ...current, monad } : current);
      }
      if (message.type === "monadInspection") {
        setMonadLoading(false);
        setInspection(message.inspection as MonadInspection);
      }
      if (message.type === "monadProject") setProjectReport(message.report as MonadProjectReport);
      if (message.type === "attestation") {
        setAttestation(message.payload as Attestation);
        changeRoute("monad", false);
      }
      if (message.type === "toast") setNotice({ tone: "ok", message: String(message.message) });
      if (message.type === "error") {
        setMentorLoading(false);
        setMonadLoading(false);
        setNotice({ tone: "error", message: String(message.message) });
      }
    };
    window.addEventListener("message", listener);
    send({ type: "ready" });
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    if (state?.rep.phase !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state?.rep.phase]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(undefined), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const changeRoute = (next: SidebarRoute, notify = true) => {
    setRoute(next);
    vscode.setState({ route: next } satisfies SavedUi);
    if (notify) send({ type: "route", route: next });
  };
  const mentor = (mode: MentorMode, reasoning?: string) => {
    changeRoute("mentor");
    setMentorMode(mode);
    setMentorLoading(true);
    setMentorResult(undefined);
    send({ type: "mentor", mode, reasoning });
  };
  const remaining = useMemo(() => {
    if (!state?.rep.startedAt) return "00:00";
    const end = state.rep.startedAt + state.rep.durationMinutes * 60_000;
    const seconds = Math.max(0, Math.ceil((end - now) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }, [state?.rep.startedAt, state?.rep.durationMinutes, now]);

  if (!state) return <LoadingScreen />;

  return (
    <div className="app-shell">
      <header className="workbench-head">
        <div className="workbench-brand"><Mark size={24} /><span>PureFlow</span></div>
        <div className="workbench-context">
          <strong title={workspace?.name}>{workspace?.name || "No project"}</strong>
          <small title={workspace?.currentFile}>{workspace?.currentFile || "Open a folder to begin"}</small>
        </div>
        <span className={state.rep.phase === "active" ? "focus-indicator" : state.monad?.status === "online" ? "live-dot" : "local-dot"} title={state.rep.phase === "active" ? "Focus Rep active" : "PureFlow ready"} />
      </header>

      <nav className="route-tabs" aria-label="PureFlow tools">
        {routes.map((item) => (
          <button key={item.id} className={route === item.id ? "is-active" : ""} aria-current={route === item.id ? "page" : undefined} onClick={() => changeRoute(item.id)}>
            {item.icon}<span>{item.label}</span>
            {item.id === "focus" && state.rep.phase === "active" && <i />}
          </button>
        ))}
      </nav>

      <main className="route-host">
        {route === "workspace" && <WorkspaceHome state={state} workspace={workspace} navigate={changeRoute} mentor={mentor} send={send} />}
        {route === "mentor" && (
          <MentorDock
            workspace={workspace}
            context={context}
            loading={mentorLoading}
            result={mentorResult}
            results={results}
            docsLoading={docsLoading}
            query={query}
            coachConfigured={state.coachConfigured}
            initialMode={mentorMode}
            mentor={mentor}
            send={send}
          />
        )}
        {route === "focus" && <FocusDock state={state} remaining={remaining} send={send} />}
        {route === "monad" && <MonadDock state={state} loading={monadLoading} inspection={inspection} report={projectReport} attestation={attestation} send={send} />}
      </main>

      {notice && <div className={`toast toast-${notice.tone}`} role="status">{notice.message}</div>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen" aria-label="Loading PureFlow">
      <Mark size={28} />
      <div className="loading-rows"><i /><i /><i /></div>
    </main>
  );
}
