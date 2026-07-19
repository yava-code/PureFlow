import { FormEvent, useEffect, useState } from "react";
import type { EditorContext, KnowledgeResult, MentorMode, MentorResponse, WorkspaceSnapshot } from "../src/types";
import { BookIcon, ExternalIcon, MentorIcon, SearchIcon, SparkIcon } from "./SidebarIcons";

interface Props {
  workspace?: WorkspaceSnapshot;
  context?: EditorContext;
  loading: boolean;
  result?: MentorResponse;
  results: KnowledgeResult[];
  docsLoading: boolean;
  query: string;
  coachConfigured: boolean;
  initialMode?: MentorMode;
  mentor(mode: MentorMode, reasoning?: string): void;
  send(message: unknown): void;
}

const actions: Array<{ mode: MentorMode; label: string; detail: string }> = [
  { mode: "explain", label: "Explain", detail: "Control flow and state" },
  { mode: "why", label: "Explain why", detail: "Tradeoffs and intent" },
  { mode: "quiz", label: "Quiz me", detail: "Questions, no answers" },
  { mode: "review", label: "Review reasoning", detail: "Find gaps in my model" },
];

export function MentorDock({
  workspace,
  context,
  loading,
  result,
  results,
  docsLoading,
  query,
  coachConfigured,
  initialMode,
  mentor,
  send,
}: Props) {
  const [reasoning, setReasoning] = useState("");
  const [docsQuery, setDocsQuery] = useState(query);
  const [active, setActive] = useState<MentorMode | undefined>(initialMode);

  useEffect(() => setDocsQuery(query), [query]);
  useEffect(() => {
    if (initialMode) setActive(initialMode);
  }, [initialMode]);

  const run = (mode: MentorMode) => {
    setActive(mode);
    mentor(mode, mode === "review" ? reasoning : undefined);
  };
  const search = (event: FormEvent) => {
    event.preventDefault();
    send({ type: "search", query: docsQuery });
  };
  const canUseContext = Boolean(workspace?.currentFile);
  const hasSelection = Boolean(workspace?.hasSelection || context?.code);

  return (
    <div className="route-page mentor-page">
      <section className="route-title">
        <div className="eyebrow">On-demand help</div>
        <h2>Mentor</h2>
        <p>PureFlow reads only the selection or current function you explicitly send.</p>
      </section>

      <section className="context-band">
        <div className="section-label">Context</div>
        {canUseContext ? (
          <>
            <strong className="truncate" title={workspace?.currentFile || context?.file}>{workspace?.currentFile || context?.file}</strong>
            <div className="context-meta">
              <span>{workspace?.language || context?.language}</span>
              <span>{hasSelection ? workspace?.selectionLines || `${context?.startLine}-${context?.endLine}` : "Current function on request"}</span>
            </div>
          </>
        ) : <p>Open a source file to ask about its code.</p>}
      </section>

      <section className="plain-section">
        <h3>Ask from the editor</h3>
        <div className="mentor-actions">
          {actions.map((action) => (
            <button
              key={action.mode}
              className={active === action.mode ? "is-active" : ""}
              disabled={!canUseContext || (action.mode !== "quiz" && !hasSelection)}
              onClick={() => action.mode === "review" ? setActive("review") : run(action.mode)}
            >
              {action.mode === "quiz" ? <SparkIcon /> : <MentorIcon />}
              <span><strong>{action.label}</strong><small>{action.detail}</small></span>
            </button>
          ))}
        </div>
        {active === "review" && (
          <div className="reasoning-box">
            <label htmlFor="reasoning">What do you think this code is doing, and why?</label>
            <textarea id="reasoning" value={reasoning} onChange={(event) => setReasoning(event.target.value)} placeholder="Write your model before asking for a review…" />
            <button className="button primary" disabled={!reasoning.trim() || !hasSelection} onClick={() => run("review")}>Review my reasoning</button>
          </div>
        )}
      </section>

      {(loading || result) && (
        <section className="mentor-response" aria-live="polite">
          <div className="section-label">Mentor response</div>
          {loading ? <LoadingRows /> : result && (
            <>
              <div className="response-source"><span className={result.source === "configured coach" ? "live-dot" : "local-dot"} />{result.source}</div>
              <h3>{result.title}</h3>
              <p>{result.summary}</p>
              {result.sections.map((section) => (
                <div className="response-section" key={section.title}>
                  <h4>{section.title}</h4>
                  <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      <section className="docs-section">
        <div className="section-label"><BookIcon /> Documentation</div>
        <form className="search-row" onSubmit={search}>
          <SearchIcon />
          <input value={docsQuery} onChange={(event) => setDocsQuery(event.target.value)} placeholder="Search API or symbol" />
          <button type="submit" aria-label="Search documentation">↵</button>
        </form>
        {docsLoading ? <LoadingRows /> : (
          <div className="source-list">
            {results.map((item) => (
              <button key={item.id} onClick={() => send({ type: "openSource", source: item })}>
                <span><strong>{item.title}</strong><small>{item.source} · {item.kind}</small></span>
                <ExternalIcon />
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="route-footnote">
        <span className={coachConfigured ? "live-dot" : "local-dot"} />
        {coachConfigured ? "Configured AI is available only after an explicit action." : "Using the local guide. Configure an OpenAI-compatible coach for deeper analysis."}
        {!coachConfigured && <button onClick={() => send({ type: "configureCoach" })}>Configure</button>}
      </footer>
    </div>
  );
}

function LoadingRows() {
  return <div className="loading-rows" aria-label="Loading"><i /><i /><i /></div>;
}
