import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  explorerUrl,
  getNetworkStatus,
  registryAddress,
  verifyCommitment,
  type NetworkStatus,
  type Verification,
} from "./contract";
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

const capabilities = [
  {
    id: "Workspace",
    title: "Native project work",
    text: "Open or create a folder, then keep using the native editor, Explorer, terminal, debugger, tasks, source control, and extensions.",
    detail: "Normal VSCodium work is the default state.",
  },
  {
    id: "Mentor",
    title: "Restore understanding",
    text: "On an explicit selection: map control flow, rebuild design intent, quiz what you still know, open docs in the IDE, or review your reasoning.",
    detail: "No background repository upload and no silent patching.",
  },
  {
    id: "Focus",
    title: "Reclaim fluency",
    text: "Optional Focus Rep on your real code: retrieve → hypothesize → verify → defend. AI mentoring stays offline while active.",
    detail: "Not a LeetCode catalog. Not required to edit.",
  },
  {
    id: "Monad",
    title: "Live chain + honest proofs",
    text: "Read Testnet health, inspect addresses and transactions, diagnose a project, and prepare a privacy-safe commitment for a wallet handoff.",
    detail: "Live values come from RPC; verified requires a real receipt and registry read.",
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
      <div className="pixel-field" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PureFlow home"><Mark /> <span>PureFlow</span></a>
        <nav aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#rules">Rules</a>
          <a href="#monad">Monad</a>
          <a href={repoUrl}>Source</a>
          <a className="header-action" href={releaseUrl}>Get PureFlow</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="hero-kicker">Spark · personal problem on Monad Testnet</p>
            <h1>Keep the skills AI quietly erodes.</h1>
            <p>
              PureFlow is a developer-first VSCodium distribution for real repositories.
              Work normally in the native IDE; call Mentor when you want to rebuild understanding;
              run an optional Focus Rep when you need no-AI practice on your own code;
              use live Monad tools without fake verified states.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href={releaseUrl}><DownloadIcon /> Download for Windows</a>
              <a className="secondary-action" href={repoUrl}><CodeIcon /> View source</a>
            </div>
            <ul className="native-list" aria-label="Native IDE features preserved">
              <li>Explorer</li><li>Editor</li><li>Terminal</li><li>Debugger</li><li>Source control</li>
            </ul>
          </div>

          <SidebarPreview route={route} network={network} onRoute={setRoute} />
        </section>

        <NetworkBand network={network} onRefresh={refreshNetwork} />

        <PreparedProof proof={proof} />

        <section id="product" className="capabilities" aria-labelledby="capabilities-title">
          <div className="section-intro">
            <h2 id="capabilities-title">Work first. Help when you ask.</h2>
            <p>
              Over-reliance on generation can hollow out architecture sense and debugging fluency.
              PureFlow keeps the IDE primary and makes deliberate relearning optional — never a forced course shell.
            </p>
          </div>
          <div className="capability-list">
            {capabilities.map((item) => (
              <article key={item.id}>
                <span className="capability-id">{item.id}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section id="rules" className="rules-band" aria-labelledby="rules-title">
          <div className="rules-copy">
            <h2 id="rules-title">Onchain practice rules</h2>
            <p>
              Monad holds voluntary, privacy-safe commitments — not skill scores.
              Until the registry is Safe-deployed and a real receipt is verified, proofs stay labeled prepared.
            </p>
          </div>
          <div className="rules-columns">
            <div>
              <h3>Can prove</h3>
              <ul>
                <li>A wallet attested a commitment hash and self-reported counters</li>
                <li>Transaction finality on Monad Testnet after a real receipt</li>
                <li>Policy flags inside the local hash (mentor blocked during Focus; code offchain)</li>
              </ul>
            </div>
            <div>
              <h3>Cannot prove</h3>
              <ul>
                <li>Skill, seniority, or that ability improved</li>
                <li>Authorship of every line or absolute AI absence</li>
                <li>Goals, code, filenames, or session notes (never onchain)</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="verify-band" aria-labelledby="verify-title">
          <div className="verify-copy">
            <h2 id="verify-title">Verify a public commitment</h2>
            <p>The verifier reads <code>attestorOf(commitment)</code> from RepRegistry on Monad Testnet. Code, filenames, goals, and session notes are never part of this lookup.</p>
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

        <section className="open-source">
          <div className="open-source-copy">
            <h2>Open source. Private by design.</h2>
            <p>PureFlow works without an account or a chain. Wallet publication is an explicit, optional handoff and is unavailable until the registry and Para integration are configured.</p>
          </div>
          <a className="source-link" href={repoUrl}><GitHubIcon /><span><strong>GitHub</strong><small>Source, issues, and build history</small></span></a>
          <a className="source-link" href={explorerUrl}><RegistryIcon /><span><strong>RepRegistry</strong><small>{registryAddress ? shortAddress(registryAddress) : "Monad Testnet deployment pending"}</small></span></a>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><Mark /> <span>PureFlow</span></a>
        <p>A familiar engineering workstation with help that waits to be asked.</p>
        <a href={repoUrl}>MIT licensed</a>
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
      <div className="sidebar-title"><Mark /><div><strong>PureFlow</strong><small>pureflow · src/monad/rpc.ts</small></div><span className="live-dot" title="Sidebar ready" /></div>
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
      <div className="sidebar-status"><span>PureFlow · Ready</span><span>Monad Testnet · {network.kind === "ready" ? `#${network.value.latestBlock}` : network.kind === "loading" ? "reading…" : "unavailable"}</span></div>
    </div>
  );
}

function WorkspacePreview() {
  return <>
    <div className="preview-heading"><div><small>Current workspace</small><h2>pureflow</h2></div><span className="state-label">Ready</span></div>
    <dl className="context-lines"><div><dt>File</dt><dd>src/monad/rpc.ts</dd></div><div><dt>Language</dt><dd>TypeScript</dd></div><div><dt>Branch</dt><dd>main</dd></div></dl>
    <div className="native-actions" aria-label="Native workspace actions"><span>Open folder</span><span>New project</span><span>Terminal</span><span>Run tasks</span></div>
    <div className="quiet-note"><strong>Native workbench first</strong><p>PureFlow delegates project work to VSCodium instead of recreating it inside this sidebar.</p></div>
  </>;
}

function MentorPreview() {
  return <>
    <div className="preview-heading"><div><small>Explicit selection</small><h2>src/cache.ts · lines 12–24</h2></div><span className="state-label">14 lines</span></div>
    <div className="mentor-actions"><span>Explain</span><span className="active">Explain why</span><span>Quiz me</span><span>Find docs</span></div>
    <div className="mentor-answer"><small>Reasoning</small><p>The expiry check belongs beside the cache read because validity is an invariant of returning a cached value, not a separate cleanup concern.</p><small>Question</small><p>Which test proves that stale values never cross this boundary?</p></div>
    <p className="privacy-line"><LockIcon /> Only the selection you explicitly send is shared.</p>
  </>;
}

function FocusPreview() {
  return <>
    <div className="preview-heading"><div><small>Optional practice</small><h2>No Focus Rep running</h2></div><span className="state-label">Off</span></div>
    <div className="focus-summary"><Mark /><div><strong>Reclaim fluency on your real code.</strong><p>Retrieve → hypothesize → verify → defend. AI mentoring stays offline until you finish. Ordinary coding never requires this mode.</p></div></div>
    <dl className="context-lines"><div><dt>During a Rep</dt><dd>AI calls disabled</dd></div><div><dt>Evidence</dt><dd>Tests · loops · sources</dd></div><div><dt>Onchain</dt><dd>Prepared, not published</dd></div></dl>
  </>;
}

function MonadPreview({ network }: { network: NetworkState }) {
  return <>
    <div className="preview-heading"><div><small>Read-only RPC</small><h2>Monad Testnet</h2></div><span className={`state-label ${network.kind === "error" ? "warn" : ""}`}>{network.kind === "ready" ? "Live" : network.kind === "loading" ? "Reading" : "Unavailable"}</span></div>
    {network.kind === "ready" ? (
      <dl className="monad-mini"><div><dt>Chain</dt><dd>{network.value.chainId}</dd></div><div><dt>Latest</dt><dd>{network.value.latestBlock.toLocaleString()}</dd></div><div><dt>Safe</dt><dd>{network.value.safeBlock.toLocaleString()}</dd></div><div><dt>Latency</dt><dd>{network.value.latencyMs} ms</dd></div></dl>
    ) : <p className="rpc-message">{network.kind === "error" ? network.message : "Reading chain, block and fee data from the public RPC…"}</p>}
    <div className="quiet-note"><strong>Inspector and Project Doctor</strong><p>Inspect an address or transaction and check a Hardhat or Foundry project without putting a private key in the IDE.</p></div>
  </>;
}

function NetworkBand({ network, onRefresh }: { network: NetworkState; onRefresh: () => Promise<void> }) {
  return (
    <section id="monad" className="network-band" aria-labelledby="network-title">
      <div className="network-heading">
        <div><h2 id="network-title">Monad Testnet, read live</h2><p>Public RPC status. No cached success state.</p></div>
        <button onClick={() => void onRefresh()} disabled={network.kind === "loading"}><RefreshIcon /> {network.kind === "loading" ? "Reading…" : "Refresh"}</button>
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
          <div><strong>{network.kind === "loading" ? "Reading Monad Testnet RPC…" : "Live status unavailable."}</strong>{network.kind === "error" && <p>{network.message}</p>}</div>
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
    return <section className="proof-band proof-invalid" aria-labelledby="proof-title"><div><h2 id="proof-title">Prepared proof rejected</h2><p>{proof.error}</p></div><strong>Nothing was published.</strong></section>;
  }
  const copy = async () => {
    await navigator.clipboard.writeText(payloadText(proof.payload));
    setCopied(true);
  };
  return (
    <section className="proof-band" aria-labelledby="proof-title">
      <div className="proof-heading">
        <div><h2 id="proof-title">Prepared, not published</h2><p>This URL contains a structurally valid, unauthenticated prepared payload for Monad Testnet. This page has not signed or submitted a transaction.</p></div>
        <span className="prepared-state"><i /> Version {proof.payload.version}</span>
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
        <p>Wallet publishing is unavailable until RepRegistry is deployed and the Para integration is configured. No private key is accepted here.</p>
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
    return <div className="verify-result is-pending"><RegistryIcon /><div><strong>Registry deployment pending.</strong><p>The verifier is wired for a real RPC read, but this build has no configured RepRegistry address and cannot claim a result.</p></div></div>;
  }
  return <div className="verify-result"><SearchIcon /><div><strong>Enter a commitment hash to verify.</strong><p>The lookup reveals only whether a wallet attested this commitment.</p></div></div>;
}

function Mark() {
  return <svg className="mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M24.7 7.2A11 11 0 0 0 7.2 9.7M7.3 24.8a11 11 0 0 0 17.5-2.5M7.2 9.7v-5M24.8 22.3v5" /></svg>;
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
