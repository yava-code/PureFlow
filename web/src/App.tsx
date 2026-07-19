import { FormEvent, useState } from "react";
import { explorerUrl, registryAddress, verifyCommitment, type Verification } from "./contract";

const repoUrl = "https://github.com/yava-code/PureFlow";
const releaseUrl = `${repoUrl}/releases/latest`;

const phases = [
  {
    name: "Before",
    note: "AI prepares the Rep",
    file: "rep.md",
    code: [
      "# Rep: cache invalidation",
      "",
      "Goal: isolate the stale response",
      "Constraint: no generated patch",
      "Evidence: failing then green test",
    ],
  },
  {
    name: "Pure Mode",
    note: "You work without generation",
    file: "src/cache.ts",
    code: [
      "export async function load(key: string) {",
      "  const cached = cache.get(key);",
      "  if (cached && cached.until > Date.now()) {",
      "    return cached.value;",
      "  }",
      "  return refresh(key);",
      "}",
    ],
  },
  {
    name: "After",
    note: "AI challenges the change",
    file: "defense.md",
    code: [
      "# Senior Defense",
      "",
      "- What invariant did you restore?",
      "- Which test proves it?",
      "- What edge case remains?",
      "- When would you revisit the design?",
    ],
  },
];

export function App() {
  const [phase, setPhase] = useState(1);
  const [commitment, setCommitment] = useState("");
  const [verification, setVerification] = useState<Verification>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setVerification(undefined);
    try {
      setVerification(await verifyCommitment(commitment.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Monad RPC could not verify this commitment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PureFlow home"><Mark /> <span>PureFlow</span></a>
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href={repoUrl}>Source</a>
          <a className="header-action" href={releaseUrl}>Get PureFlow</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <h1>Keep the work<br />in your hands.</h1>
            <p>PureFlow is manual practice mode for modern developers. AI prepares before, leaves during, and challenges after. You write. You decide. You ship.</p>
            <div className="hero-actions">
              <a className="primary-action" href={releaseUrl}><DownloadIcon /> Download for Windows</a>
              <a className="secondary-action" href={repoUrl}><CodeIcon /> View source</a>
            </div>
          </div>

          <div className="product-preview" aria-label="Interactive PureFlow workflow preview">
            <div className="phase-tabs" role="tablist" aria-label="PureFlow phases">
              {phases.map((item, index) => (
                <button
                  key={item.name}
                  role="tab"
                  aria-selected={phase === index}
                  className={phase === index ? "is-active" : ""}
                  onClick={() => setPhase(index)}
                >
                  <PhaseIcon index={index} />
                  <span><strong>{item.name}</strong><small>{item.note}</small></span>
                </button>
              ))}
            </div>
            <div className="editor-surface">
              <div className="file-rail" aria-hidden="true">
                <span>rep.md</span><span>context.md</span><span>plan.md</span><span>tests.md</span>
                <strong>src/</strong><span className="nested">cache.ts</span><span className="nested">utils.ts</span>
              </div>
              <div className="code-pane">
                <div className="code-tab">{phases[phase]!.file} <span>×</span></div>
                <pre aria-live="polite">{phases[phase]!.code.map((line, index) => <code key={`${phase}-${index}`}><i>{index + 1}</i>{line || " "}</code>)}</pre>
              </div>
            </div>
            <div className="preview-timeline">
              <strong>Active Rep timeline</strong>
              <div className="timeline-rail">
                <span className="done" /><i /><span className="active" /><i /><span className="pending" />
              </div>
              <div className="timeline-labels">
                <div><strong>Prepared</strong><small>AI framed the Rep</small></div>
                <div><strong>Pure Mode</strong><small>You are practicing</small></div>
                <div><strong>Challenge pending</strong><small>Available when ready</small></div>
              </div>
            </div>
            <div className="pure-note"><span /> You’re in Pure Mode. No generation. No suggestions.</div>
          </div>
        </section>

        <section className="verify-band" aria-labelledby="verify-title">
          <div className="verify-copy">
            <h2 id="verify-title">Verify a Rep</h2>
            <p>Verify a commitment by its hash. RepRegistry on Monad Testnet stores only commitments and public aggregates. Your code and filenames stay on your machine.</p>
          </div>
          <div className="verify-tool">
            <form onSubmit={verify}>
              <label htmlFor="commitment">Commitment hash</label>
              <div className="verify-controls">
                <input
                  id="commitment"
                  value={commitment}
                  onChange={(event) => setCommitment(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                />
                <span className="network"><i /> Monad Testnet</span>
                <button type="submit" disabled={loading || !commitment.trim()}>{loading ? "Reading RPC…" : "Verify commitment"}</button>
              </div>
            </form>
            <VerificationResult verification={verification} error={error} />
          </div>
        </section>

        <section id="how" className="process" aria-label="How PureFlow works">
          <ProcessItem icon={<DocumentIcon />} title="Prepare a focused Rep">AI helps define the goal, scope, constraints, sources, and done criteria before you start.</ProcessItem>
          <ArrowIcon />
          <ProcessItem icon={<PracticeIcon />} title="Practice without generation">You write, test, debug, and read source material. The model is outside the loop.</ProcessItem>
          <ArrowIcon />
          <ProcessItem icon={<DefenseIcon />} title="Defend the change">AI asks for invariants, evidence, and tradeoffs before it reveals review findings.</ProcessItem>
        </section>

        <section className="open-source">
          <div className="open-source-copy">
            <h2>Open source. Private by design.</h2>
            <p>PureFlow is useful without an account or a chain. Your work stays local; only a commitment is written onchain when you choose.</p>
          </div>
          <a className="source-link" href={repoUrl}><GitHubIcon /><span><strong>GitHub</strong><small>Source, issues, and releases</small></span></a>
          <a className="source-link" href={explorerUrl}><RegistryIcon /><span><strong>RepRegistry</strong><small>{registryAddress ? shortAddress(registryAddress) : "Monad Testnet deployment pending"}</small></span></a>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><Mark /> <span>PureFlow</span></a>
        <p>AI makes us faster today. PureFlow helps us stay strong enough to review what it writes tomorrow.</p>
        <a href={repoUrl}>MIT licensed</a>
      </footer>
    </div>
  );
}

function VerificationResult({ verification, error }: { verification?: Verification; error: string }) {
  if (error) {
    return <div className="verify-result is-error" role="alert"><SearchIcon /><div><strong>Verification did not complete.</strong><p>{error}</p></div></div>;
  }
  if (verification) {
    return (
      <div className={`verify-result ${verification.registered ? "is-verified" : "is-missing"}`} role="status">
        {verification.registered ? <CheckIcon /> : <SearchIcon />}
        <div>
          <strong>{verification.registered ? "Commitment verified on Monad Testnet." : "No attestation found for this commitment."}</strong>
          <p>{verification.registered ? `Attested by ${shortAddress(verification.attestor)}.` : "The RPC returned the zero address from the public registry."}</p>
        </div>
      </div>
    );
  }
  return <div className="verify-result"><SearchIcon /><div><strong>Enter a commitment hash to verify.</strong><p>Verification reads the public RepRegistry through Monad Testnet RPC. No code, filenames, or session contents are revealed.</p></div></div>;
}

function ProcessItem({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <article>{icon}<div><h2>{title}</h2><p>{children}</p></div></article>;
}

function Mark() {
  return <svg className="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M24.7 7.2A11 11 0 0 0 7.2 9.7M7.3 24.8a11 11 0 0 0 17.5-2.5M7.2 9.7v-5M24.8 22.3v5" /></svg>;
}

function PhaseIcon({ index }: { index: number }) {
  if (index === 0) return <DocumentIcon />;
  if (index === 1) return <Mark />;
  return <DefenseIcon />;
}

function DownloadIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" /></svg>; }
function CodeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5" /></svg>; }
function DocumentIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 3h11l6 6v20H8zM19 3v7h6M12 16h9M12 21h9" /></svg>; }
function PracticeIcon() { return <svg viewBox="0 0 40 32" aria-hidden="true"><path d="m14 4-11 12 11 12M26 4l11 12-11 12M23 2l-6 28" /></svg>; }
function DefenseIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 5h24v17H14l-6 5v-5H4zM10 13h.1M16 13h.1M22 13h.1" /></svg>; }
function ArrowIcon() { return <svg className="process-arrow" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" /><path d="m12 16 8 0m-3-4 4 4-4 4" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="13" r="8" /><path d="m19 19 8 8" /></svg>; }
function CheckIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" /><path d="m9 16 5 5 9-11" /></svg>; }
function GitHubIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-4 25v-3c-3 .7-4-1-5-2m14 5v-4c0-2-1-3-2-3 4 0 7-2 7-7 0-2-1-3-2-4 0-1 0-3-1-4 0 0-2 0-5 2-3-1-6 0-6 0-3-2-5-2-5-2-1 1-1 3-1 4-1 1-2 2-2 4 0 5 3 7 7 7-1 1-2 2-2 4v3" /></svg>; }
function RegistryIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 12 6-12 6L4 9zM4 15l12 6 12-6M4 21l12 6 12-6" /></svg>; }

function shortAddress(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

