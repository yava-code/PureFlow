import type { ClientState, MentorMode, SidebarRoute, WorkspaceSnapshot } from "../src/types";
import { BranchIcon, FocusIcon, MentorIcon, MonadIcon, TerminalIcon, TestIcon, WorkspaceIcon } from "./SidebarIcons";

interface Props {
  state: ClientState;
  workspace?: WorkspaceSnapshot;
  navigate(route: SidebarRoute): void;
  mentor(mode: MentorMode): void;
  send(message: unknown): void;
}

export function WorkspaceHome({ state, workspace, navigate, mentor, send }: Props) {
  if (!workspace?.hasWorkspace) {
    return (
      <div className="route-page">
        <section className="empty-workspace">
          <WorkspaceIcon />
          <h2>Open a project</h2>
          <p>PureFlow works around normal folders, editors, terminals, tests, and source control.</p>
          <button className="button primary" onClick={() => send({ type: "openProject" })}>Open folder</button>
          <button className="button" onClick={() => send({ type: "createProject" })}>Create project</button>
        </section>
        <section className="plain-section">
          <h3>Nothing is locked behind practice</h3>
          <p>Open any existing repository and use VSCodium normally. Mentor, Focus, and Monad tools remain optional.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="route-page">
      <section className="project-summary">
        <div className="eyebrow">Workspace</div>
        <h2 title={workspace.name}>{workspace.name}</h2>
        <div className="project-meta">
          <span><BranchIcon /> {workspace.gitBranch || "No Git branch"}{workspace.dirty ? " · modified" : ""}</span>
          <span>{workspace.folders.length} folder{workspace.folders.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      <section className="context-band">
        <div className="section-label">Current editor</div>
        {workspace.currentFile ? (
          <>
            <strong className="truncate" title={workspace.currentFile}>{workspace.currentFile}</strong>
            <div className="context-meta">
              <span>{workspace.language || "Plain text"}</span>
              <span>{workspace.hasSelection ? workspace.selectionLines || "Selection" : "No selection"}</span>
            </div>
          </>
        ) : <p>Open a file to use contextual tools.</p>}
      </section>

      <section className="plain-section">
        <h3>Context tools</h3>
        <div className="action-stack">
          <button onClick={() => mentor("why")} disabled={!workspace.hasSelection}><MentorIcon /><span>Explain why</span><kbd>⌃⌥Y</kbd></button>
          <button onClick={() => mentor("quiz")} disabled={!workspace.currentFile}><FocusIcon /><span>{workspace.hasSelection ? "Quiz this selection" : "Quiz current function"}</span></button>
          <button onClick={() => send({ type: "searchSelection" })} disabled={!workspace.currentFile}><span className="codicon-fallback">⌕</span><span>Find documentation</span></button>
          <button onClick={() => mentor("review")} disabled={!workspace.hasSelection}><span className="codicon-fallback">‹›</span><span>Review my reasoning</span></button>
        </div>
      </section>

      <section className="plain-section">
        <h3>Native workspace</h3>
        <div className="quick-grid">
          <button onClick={() => send({ type: "openTerminal" })}><TerminalIcon /><span>Terminal</span></button>
          <button onClick={() => send({ type: "runTests" })}><TestIcon /><span>Tests</span></button>
          <button onClick={() => send({ type: "openSourceControl" })}><BranchIcon /><span>Source control</span></button>
          <button onClick={() => send({ type: "openProject" })}><WorkspaceIcon /><span>Change folder</span></button>
        </div>
      </section>

      <section className="status-list">
        <button onClick={() => navigate("mentor")}>
          <MentorIcon />
          <span><strong>Mentor</strong><small>{state.coachConfigured ? "Configured coach · on request" : "Local guide · add a coach anytime"}</small></span>
          <i>›</i>
        </button>
        <button onClick={() => navigate("focus")}>
          <FocusIcon />
          <span><strong>Focus Rep</strong><small>{state.rep.phase === "active" ? state.rep.goal : "Optional deliberate practice"}</small></span>
          <i>›</i>
        </button>
        <button onClick={() => navigate("monad")}>
          <MonadIcon />
          <span><strong>Monad workbench</strong><small>{state.monad?.status === "online" ? `Testnet · block ${state.monad.latestBlock?.toLocaleString()}` : "Inspect projects and live chain data"}</small></span>
          <i>›</i>
        </button>
      </section>
    </div>
  );
}
