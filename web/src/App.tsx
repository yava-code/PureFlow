import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  explorerUrl,
  getNetworkStatus,
  registryAddress,
  verifyCommitment,
  type NetworkStatus,
  type Verification,
} from "./contract";
import { PixelField } from "./PixelField";
import { payloadText, readAttestationHash, type AttestationHash, type PreparedAttestation } from "./proof";

const repoUrl = "https://github.com/yava-code/PureFlow";
const releaseUrl = `${repoUrl}/releases/latest`;

type Route = "workspace" | "mentor" | "focus" | "monad";
type NetworkState =
  | { kind: "loading" }
  | { kind: "ready"; value: NetworkStatus }
  | { kind: "error"; message: string };

const routes: { id: Route; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "mentor", label: "Mentor" },
  { id: "focus", label: "Focus" },
  { id: "monad", label: "Monad" },
];

const muscles = [
  {
    title: "Architecture in your head",
    text: "Break a vague task into decisions without asking a model to plan the whole system first.",
  },
  {
    title: "Read before rewrite",
    text: "Navigate a real repo, hold invariants, and predict behavior before you run or regenerate.",
  },
  {
    title: "Hypothesis debugging",
    text: "Name why something fails, prove it with tests or the debugger, reject the bad theory.",
  },
  {
    title: "Explain ownership",
    text: "Defend tradeoffs in your own words after the work — not only accept a generated patch.",
  },
];

const loopSteps = [
  { title: "Retrieve", text: "Write what you still remember before opening docs or calling a model." },
  { title: "Hypothesize", text: "State the failure mode on this file — your code, not a puzzle bank." },
  { title: "Verify", text: "Native tests, debugger, and sources you choose. Evidence is yours." },
  { title: "Defend", text: "Answer questions on invariants and tradeoffs. Then optionally prepare a Monad commitment." },
];

const notThat = [
  {
    title: "Not another vibe dApp",
    text: "Showcase is full of games, walls, and mint pages. PureFlow is a daily IDE you can open on a real repository.",
  },
  {
    title: "Not local LeetCode",
    text: "No ranked problems. Practice is optional Focus on the folder you already own.",
  },
  {
    title: "Not vaporware chain",
    text: "Live RPC reads now. Prepared proofs stay prepared until a real receipt and registry read exist.",
  },
];

export function App() {
  const [route, setRoute] = useState<Route>("workspace");
  const [network, setNetwork] = useState<NetworkState>({ kind: "loading" });
  const [proof, setProof] = useState<AttestationHash>(() => readAttestationHash(window.location.hash));
  const [commitment, setCommitment] = useState(() => proof.kind === "prepared" ? proof.payload.commitment : "");
  const [verification, setVerification] = useState<Verification>();
  const [verifyError, setVerifyError] = useState("");
  const [loading, setLoading] = useState(false);
  const verifyRequest = useRef(0);

  const updateCommitment = useCallback((value: string) => {
    verifyRequest.current += 1;
    setCommitment(value);
    setVerification(undefined);
    setVerifyError("");
    setLoading(false);
  }, []);

  const refreshNetwork = useCallback(async () => {
    setNetwork({ kind: "loading" });
    try {
      setNetwork({ kind: "ready", value: await getNetworkStatus() });
    } catch (cause) {
      setNetwork({
        kind: "error",
        message: cause instanceof Error ? cause.message : "Monad Testnet RPC is unavailable.",
      });
    }
  }, []);

  useEffect(() => {
    void refreshNetwork();
    const timer = window.setInterval(() => void refreshNetwork(), 30_000);
    return () => window.clearInterval(timer);
  }, [refreshNetwork]);

  useEffect(() => {
    const sync = () => {
      const next = readAttestationHash(window.location.hash);
      setProof(next);
      if (next.kind === "prepared") updateCommitment(next.payload.commitment);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [updateCommitment]);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    const request = ++verifyRequest.current;
    setLoading(true);
    setVerifyError("");
    setVerification(undefined);
    try {
      const result = await verifyCommitment(commitment.trim());
      if (request === verifyRequest.current) setVerification(result);
    } catch (cause) {
      if (request === verifyRequest.current) {
        setVerifyError(cause instanceof Error ? cause.message : "Monad RPC could not verify this commitment.");
      }
    } finally {
      if (request === verifyRequest.current) setLoading(false);
    }
  };

  return (
    <div className="site-shell">
      <PixelField />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PureFlow home">
          <PixelMark /> <span>PureFlow</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#problem">Problem</a>
          <a href="#product">Product</a>
          <a href="#rules">Rules</a>
          <a href="#monad">Monad</a>
          <a className="header-action" href={releaseUrl}>Get PureFlow</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="hero-kicker">Personal problem · Monad Testnet · Spark</p>
            <h1>Keep your coding muscles.</h1>
            <p className="hero-lead">
              AI accelerates delivery. It also skips the reps that keep architecture, reading, debugging, and ownership sharp.
              PureFlow is a real VSCodium IDE where help waits to be asked — and optional Focus Reps put the thinking back on you.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href={releaseUrl}><DownloadIcon /> Download for Windows</a>
              <a className="secondary-action" href={repoUrl}><CodeIcon /> Public source</a>
              <a className="ghost-action" href="#problem">Why this exists</a>
            </div>
            <ul className="native-list" aria-label="Native IDE surfaces">
              <li>Explorer</li>
              <li>Editor</li>
              <li>Terminal</li>
              <li>Debugger</li>
              <li>Git</li>
              <li>Tests</li>
            </ul>
          </div>

          <div className="hero-stage">
            <div className="pixel-frame">
              <span className="pixel-corner tl" />
              <span className="pixel-corner tr" />
              <span className="pixel-corner bl" />
              <span className="pixel-corner br" />
              <SidebarPreview route={route} network={network} onRoute={setRoute} />
            </div>
            <p className="stage-caption">Interactive sidebar preview · live Monad block when RPC is up</p>
          </div>
        </section>

        <section id="problem" className="problem-band" aria-labelledby="problem-title">
          <div className="problem-intro">
            <p className="section-tag">The personal problem</p>
            <h2 id="problem-title">I ship faster with AI — and slowly stop owning the system.</h2>
            <p>
              The pain is not “AI exists.” The pain is skipping decomp, reading, hypothesis, and explanation until
              the codebase feels foreign and every fix starts as another prompt. PureFlow exists so that, on purpose,
              I can still do those reps on my own projects.
            </p>
          </div>
          <div className="muscle-grid">
            {muscles.map((item) => (
              <article key={item.title} className="muscle-card">
                <div className="pixel-chip" aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="contrast-band" aria-labelledby="contrast-title">
          <div className="contrast-head">
            <p className="section-tag">Against the feed</p>
            <h2 id="contrast-title">Built for a different class of personal problem.</h2>
            <p>
              BuildAnything showcase is dense with games, walls, mints, and one-click demos.
              Elegant for Spark means practical impact: open a real folder, keep fluency, stay honest onchain.
            </p>
          </div>
          <div className="contrast-grid">
            {notThat.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="product" className="loop-band" aria-labelledby="loop-title">
          <div className="loop-intro">
            <p className="section-tag">How it works</p>
            <h2 id="loop-title">Daily IDE first. Restoration when you choose.</h2>
            <p>
              AI can still help as Mentor on an explicit selection. During Focus, generation stays out of the loop —
              coach is offline, native tools stay. That is the original product formula: remove generation, not access to knowledge.
            </p>
          </div>
          <ol className="loop-track">
            {loopSteps.map((step, index) => (
              <li key={step.title}>
                <span className="loop-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="product-split">
            <article>
              <h3>Mentor</h3>
              <p>Map flow, rebuild design story, quiz what you still know, open docs in the IDE, review your model. Groq or any OpenAI-compatible coach via SecretStorage — or local guide with no key.</p>
            </article>
            <article>
              <h3>Focus Rep</h3>
              <p>Optional timebox on real code. Hypotheses, self-marked tests, defense. Not required to edit. Not a course player.</p>
            </article>
            <article>
              <h3>Monad</h3>
              <p>Live Testnet health, address/tx inspect, Project Doctor. Privacy-safe commitment prep for voluntary public attestations.</p>
            </article>
          </div>
        </section>

        <NetworkBand network={network} onRefresh={refreshNetwork} />

        <PreparedProof proof={proof} />

        <section id="rules" className="rules-band" aria-labelledby="rules-title">
          <div className="rules-copy">
            <p className="section-tag">Onchain practice rules</p>
            <h2 id="rules-title">Monad holds commitments — not skill scores.</h2>
            <p>
              Judges click twice. PureFlow never shows a hardcoded verified toast.
              Until Safe deployment and a real receipt exist, labels stay prepared.
            </p>
          </div>
          <div className="rules-columns">
            <div>
              <h3>Can prove</h3>
              <ul>
                <li>A wallet attested a commitment hash and self-reported counters</li>
                <li>Transaction finality after a real Testnet receipt</li>
                <li>Local policy flags inside the hash (mentor blocked during Focus; code offchain)</li>
              </ul>
            </div>
            <div>
              <h3>Cannot prove</h3>
              <ul>
                <li>Skill, seniority, or that ability improved</li>
                <li>Authorship of every line or absolute AI absence</li>
                <li>Goals, code, filenames, or session notes</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="verify-band" aria-labelledby="verify-title">
          <div className="verify-copy">
            <p className="section-tag">Public verifier</p>
            <h2 id="verify-title">Verify a commitment</h2>
            <p>
              Reads <code>attestorOf(commitment)</code> on Monad Testnet when the registry address is configured.
              No code or goals leave this lookup.
            </p>
          </div>
          <div className="verify-tool">
            <form onSubmit={verify}>
              <label htmlFor="commitment">32-byte commitment</label>
              <div className="verify-controls">
                <input
                  id="commitment"
                  value={commitment}
                  onChange={(event) => updateCommitment(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                />
                <span className="network-label"><i /> Monad Testnet</span>
                <button type="submit" disabled={loading || !commitment.trim() || !registryAddress}>
                  {loading ? "Reading RPC…" : registryAddress ? "Verify commitment" : "Registry pending"}
                </button>
              </div>
            </form>
            <VerificationResult verification={verification} error={verifyError} />
          </div>
        </section>

        <section className="cta-band" aria-labelledby="cta-title">
          <div>
            <p className="section-tag">Try the product</p>
            <h2 id="cta-title">Install the portable IDE. Open any folder.</h2>
            <p>Windows portable profile ships PureFlow Mineral, keybindings, AI-surface defaults, and the extension. Extension-only VSIX also available.</p>
          </div>
          <div className="cta-actions">
            <a className="primary-action" href={releaseUrl}><DownloadIcon /> Latest release</a>
            <a className="secondary-action" href={repoUrl}><GitHubIcon /> GitHub</a>
            <a className="secondary-action" href={explorerUrl}><RegistryIcon /> Explorer</a>
          </div>
        </section>

        <section className="open-source">
          <div className="open-source-copy">
            <h2>Open source. Private by design.</h2>
            <p>
              Works without an account or a chain. Wallet publication is optional handoff after Safe-governed registry deploy.
              No private keys in the IDE.
            </p>
          </div>
          <a className="source-link" href={repoUrl}>
            <GitHubIcon />
            <span><strong>Repository</strong><small>yava-code/PureFlow</small></span>
          </a>
          <a className="source-link" href={explorerUrl}>
            <RegistryIcon />
            <span>
              <strong>RepRegistry</strong>
              <small>{registryAddress ? shortAddress(registryAddress) : "Deployment pending — honest empty state"}</small>
            </span>
          </a>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><PixelMark /> <span>PureFlow</span></a>
        <p>Keep your coding muscles. AI waits to be asked.</p>
        <a href={repoUrl}>MIT</a>
      </footer>
    </div>
  );
}

function SidebarPreview({ route, network, onRoute }: { route: Route; network: NetworkState; onRoute: (route: Route) => void }) {
  const moveRoute = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? routes.length - 1
        : event.key === "ArrowRight"
          ? (index + 1) % routes.length
          : event.key === "ArrowLeft"
            ? (index - 1 + routes.length) % routes.length
            : -1;
    if (next < 0) return;
    event.preventDefault();
    onRoute(routes[next]!.id);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[next]?.focus();
  };

  return (
    <div className="sidebar-preview" aria-label="Interactive PureFlow sidebar preview">
      <div className="sidebar-title">
        <PixelMark />
        <div><strong>PureFlow</strong><small>pureflow · src/monad/rpc.ts</small></div>
        <span className="live-dot" title="Sidebar ready" />
      </div>
      <div className="route-strip" role="tablist" aria-label="PureFlow sidebar routes">
        {routes.map((item, index) => (
          <button
            key={item.id}
            id={`pureflow-tab-${item.id}`}
            role="tab"
            aria-controls={`pureflow-panel-${item.id}`}
            aria-selected={route === item.id}
            tabIndex={route === item.id ? 0 : -1}
            onClick={() => onRoute(item.id)}
            onKeyDown={(event) => moveRoute(event, index)}
          >
            <RouteIcon route={item.id} /><span>{item.label}</span>
          </button>
        ))}
      </div>
      <div
        id={`pureflow-panel-${route}`}
        className="preview-content"
        role="tabpanel"
        aria-labelledby={`pureflow-tab-${route}`}
        aria-live="polite"
      >
        {route === "workspace" && <WorkspacePreview />}
        {route === "mentor" && <MentorPreview />}
        {route === "focus" && <FocusPreview />}
        {route === "monad" && <MonadPreview network={network} />}
      </div>
      <div className="sidebar-status">
        <span>PureFlow · Ready</span>
        <span>
          Monad · {network.kind === "ready" ? `#${network.value.latestBlock}` : network.kind === "loading" ? "reading…" : "unavailable"}
        </span>
      </div>
    </div>
  );
}

function WorkspacePreview() {
  return <>
    <div className="preview-heading"><div><small>Current workspace</small><h2>pureflow</h2></div><span className="state-label">Ready</span></div>
    <dl className="context-lines">
      <div><dt>File</dt><dd>src/monad/rpc.ts</dd></div>
      <div><dt>Language</dt><dd>TypeScript</dd></div>
      <div><dt>Branch</dt><dd>main</dd></div>
    </dl>
    <div className="native-actions" aria-label="Native workspace actions">
      <span>Open folder</span><span>New project</span><span>Terminal</span><span>Run tasks</span>
    </div>
    <div className="quiet-note"><strong>Native first</strong><p>Project work stays in VSCodium. PureFlow does not replace Explorer or the editor.</p></div>
  </>;
}

function MentorPreview() {
  return <>
    <div className="preview-heading"><div><small>Explicit selection</small><h2>src/cache.ts · 12–24</h2></div><span className="state-label">14 lines</span></div>
    <div className="mentor-actions"><span>Explain</span><span className="active">Why</span><span>Quiz</span><span>Docs</span></div>
    <div className="mentor-answer">
      <small>Rebuild the story</small>
      <p>Expiry belongs beside the cache read: validity is an invariant of returning a value, not a later cleanup job.</p>
      <small>Probe</small>
      <p>Which test proves stale values never cross this boundary?</p>
    </div>
    <p className="privacy-line"><LockIcon /> Only the selection you send is shared.</p>
  </>;
}

function FocusPreview() {
  return <>
    <div className="preview-heading"><div><small>Optional Focus</small><h2>No Rep running</h2></div><span className="state-label">Off</span></div>
    <div className="focus-summary">
      <PixelMark />
      <div>
        <strong>Reclaim fluency on real code.</strong>
        <p>Retrieve → hypothesize → verify → defend. AI mentoring offline until you finish.</p>
      </div>
    </div>
    <dl className="context-lines">
      <div><dt>AI</dt><dd>Blocked in active Focus</dd></div>
      <div><dt>Evidence</dt><dd>Tests · loops · sources</dd></div>
      <div><dt>Chain</dt><dd>Prepared, not published</dd></div>
    </dl>
  </>;
}

function MonadPreview({ network }: { network: NetworkState }) {
  return <>
    <div className="preview-heading">
      <div><small>Read-only RPC</small><h2>Monad Testnet</h2></div>
      <span className={`state-label ${network.kind === "error" ? "warn" : ""}`}>
        {network.kind === "ready" ? "Live" : network.kind === "loading" ? "Reading" : "Unavailable"}
      </span>
    </div>
    {network.kind === "ready" ? (
      <dl className="monad-mini">
        <div><dt>Chain</dt><dd>{network.value.chainId}</dd></div>
        <div><dt>Latest</dt><dd>{network.value.latestBlock.toLocaleString()}</dd></div>
        <div><dt>Safe</dt><dd>{network.value.safeBlock.toLocaleString()}</dd></div>
        <div><dt>Latency</dt><dd>{network.value.latencyMs} ms</dd></div>
      </dl>
    ) : (
      <p className="rpc-message">
        {network.kind === "error" ? network.message : "Reading chain and fee data from public RPC…"}
      </p>
    )}
    <div className="quiet-note"><strong>No key in IDE</strong><p>Inspect address/tx and scan project readiness without a wallet secret.</p></div>
  </>;
}

function NetworkBand({ network, onRefresh }: { network: NetworkState; onRefresh: () => Promise<void> }) {
  return (
    <section id="monad" className="network-band" aria-labelledby="network-title">
      <div className="network-heading">
        <div>
          <p className="section-tag">Live, not mocked</p>
          <h2 id="network-title">Monad Testnet RPC</h2>
          <p>Public status. Failures stay failures. No cached success.</p>
        </div>
        <button onClick={() => void onRefresh()} disabled={network.kind === "loading"}>
          <RefreshIcon /> {network.kind === "loading" ? "Reading…" : "Refresh"}
        </button>
      </div>
      {network.kind === "ready" ? (
        <dl className="network-values" aria-live="polite">
          <NetworkValue label="Chain ID" value={String(network.value.chainId)} />
          <NetworkValue label="Latest" value={network.value.latestBlock.toLocaleString()} />
          <NetworkValue label="Safe" value={network.value.safeBlock.toLocaleString()} />
          <NetworkValue label="Finalized" value={network.value.finalizedBlock.toLocaleString()} />
          <NetworkValue label="RPC latency" value={`${network.value.latencyMs} ms`} />
          <NetworkValue label="Gas price" value={`${network.value.gasPriceGwei} gwei`} />
        </dl>
      ) : (
        <div className={`network-message ${network.kind === "error" ? "is-error" : ""}`} role="status">
          <span className="status-symbol" />
          <div>
            <strong>{network.kind === "loading" ? "Reading Monad Testnet RPC…" : "Live status unavailable."}</strong>
            {network.kind === "error" && <p>{network.message}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function NetworkValue({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function PreparedProof({ proof }: { proof: AttestationHash }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [proof]);
  if (proof.kind === "none") return null;
  if (proof.kind === "invalid") {
    return (
      <section className="proof-band proof-invalid" aria-labelledby="proof-title">
        <div><h2 id="proof-title">Prepared proof rejected</h2><p>{proof.error}</p></div>
        <strong>Nothing was published.</strong>
      </section>
    );
  }
  const copy = async () => {
    await navigator.clipboard.writeText(payloadText(proof.payload));
    setCopied(true);
  };
  return (
    <section className="proof-band" aria-labelledby="proof-title">
      <div className="proof-heading">
        <div>
          <h2 id="proof-title">Prepared, not published</h2>
          <p>Structurally valid, unauthenticated handoff for Monad Testnet. This page did not sign or broadcast a transaction.</p>
        </div>
        <span className="prepared-state"><i /> v{proof.payload.version}</span>
      </div>
      <dl className="proof-values">
        <ProofValue label="Commitment" value={shortAddress(proof.payload.commitment)} title={proof.payload.commitment} />
        <ProofValue label="Focused" value={formatDuration(proof.payload.focusedSeconds)} />
        <ProofValue label="Test runs" value={String(proof.payload.testRuns)} />
        <ProofValue label="Debug loops" value={String(proof.payload.debugLoops)} />
        <ProofValue label="Ownership" value={ownershipLabel(proof.payload)} />
        <ProofValue label="Chain ID" value={String(proof.payload.chainId)} />
      </dl>
      <div className="proof-actions">
        <button onClick={() => void copy()}><CopyIcon /> {copied ? "Payload copied" : "Copy payload"}</button>
        <p>Wallet publish waits on Safe-deployed RepRegistry and Para. No private key is accepted here.</p>
      </div>
    </section>
  );
}

function ProofValue({ label, value, title }: { label: string; value: string; title?: string }) {
  return <div><dt>{label}</dt><dd title={title}>{value}</dd></div>;
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
          <p>{verification.registered ? `Attested by ${shortAddress(verification.attestor)}.` : "The public registry returned the zero address."}</p>
        </div>
      </div>
    );
  }
  if (!registryAddress) {
    return (
      <div className="verify-result is-pending">
        <RegistryIcon />
        <div>
          <strong>Registry deployment pending.</strong>
          <p>Verifier is wired for live RPC; this build has no configured address and will not invent a result.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="verify-result">
      <SearchIcon />
      <div>
        <strong>Enter a commitment hash to verify.</strong>
        <p>Lookup only checks whether a wallet attested this commitment.</p>
      </div>
    </div>
  );
}

function PixelMark() {
  return (
    <svg className="mark pixel-mark" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="1" width="2" height="2" fill="currentColor" opacity="0.45" />
      <rect x="4" y="1" width="2" height="2" fill="currentColor" opacity="0.75" />
      <rect x="7" y="1" width="2" height="2" fill="currentColor" />
      <rect x="1" y="4" width="2" height="2" fill="currentColor" opacity="0.75" />
      <rect x="4" y="4" width="2" height="2" fill="currentColor" />
      <rect x="10" y="4" width="2" height="2" fill="currentColor" opacity="0.55" />
      <rect x="1" y="7" width="2" height="2" fill="currentColor" />
      <rect x="7" y="7" width="2" height="2" fill="currentColor" opacity="0.8" />
      <rect x="10" y="7" width="2" height="2" fill="currentColor" />
      <rect x="13" y="7" width="2" height="2" fill="currentColor" opacity="0.4" />
      <rect x="4" y="10" width="2" height="2" fill="currentColor" opacity="0.7" />
      <rect x="7" y="10" width="2" height="2" fill="currentColor" />
      <rect x="10" y="10" width="2" height="2" fill="currentColor" opacity="0.85" />
      <rect x="7" y="13" width="2" height="2" fill="currentColor" opacity="0.55" />
      <rect x="10" y="13" width="2" height="2" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

function RouteIcon({ route }: { route: Route }) {
  if (route === "workspace") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v11H3z" /></svg>;
  if (route === "mentor") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v13H9l-4 3v-3H4zM8 9h8M8 13h5" /></svg>;
  if (route === "focus") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4zM4 12l8 4 8-4M4 17l8 4 8-4" /></svg>;
}

function DownloadIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" /></svg>; }
function CodeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>; }
function RefreshIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M18 12a6 6 0 0 0-10-4L4 12m16 0-4 4a6 6 0 0 1-10-4" /></svg>; }
function CopyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="1" /><path d="M16 8V4H5v12h3" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="13" r="8" /><path d="m19 19 8 8" /></svg>; }
function CheckIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" /><path d="m9 16 5 5 9-11" /></svg>; }
function GitHubIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" /><path d="M10 25v-3c-3 .5-4-1-5-2M22 25v-3c0-1.5-1-2.5-2-3 3 0 6-1.8 6-5.5 0-1.4-.5-2.7-1.5-3.6.2-1 .1-2-.3-3-1.5 0-2.9.6-4 1.5a11 11 0 0 0-8.4 0C10.6 6.6 9.3 6 7.8 6c-.4 1-.5 2-.3 3A5 5 0 0 0 6 12.5C6 16.2 9 18 12 19c-1 .5-2 1.5-2 3v3" /></svg>; }
function RegistryIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 3 12 6-12 6L4 9zM4 15l12 6 12-6M4 21l12 6 12-6" /></svg>; }

function ownershipLabel(payload: PreparedAttestation) {
  return payload.ownership === 1 ? "Less" : payload.ownership === 2 ? "Same" : "More";
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function shortAddress(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}
