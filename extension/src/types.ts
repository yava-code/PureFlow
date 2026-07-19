export type RepPhase = "idle" | "active" | "review" | "complete";
export type TestStatus = "passed" | "failed";
export type HypothesisResult = "confirmed" | "rejected";
export type Ownership = 1 | 2 | 3;

export interface RepEvent {
  id: string;
  type:
    | "rep.started"
    | "doc.opened"
    | "recall.revealed"
    | "hypothesis.created"
    | "hypothesis.resolved"
    | "test.finished"
    | "file.externalChange"
    | "defense.questioned"
    | "defense.answered"
    | "rep.finished";
  at: number;
  label: string;
  meta?: Record<string, string | number | boolean>;
}

export interface Hypothesis {
  id: string;
  text: string;
  createdAt: number;
  result?: HypothesisResult;
  resolvedAt?: number;
}

export interface DefenseAnswer {
  question: string;
  answer: string;
  selfRated: 1 | 2 | 3;
}

export interface RepState {
  id: string;
  phase: RepPhase;
  goal: string;
  durationMinutes: number;
  startedAt?: number;
  finishedAt?: number;
  outcome: string;
  ownership?: Ownership;
  recallLevel: 0 | 1 | 2 | 3;
  hypotheses: Hypothesis[];
  events: RepEvent[];
  defenseQuestions: string[];
  defenseAnswers: DefenseAnswer[];
}

export interface RepStats {
  focusedSeconds: number;
  testRuns: number;
  passedTests: number;
  debugLoops: number;
  sources: number;
  hintsRevealed: number;
}

export interface KnowledgeResult {
  id: string;
  title: string;
  source: string;
  url: string;
  detail: string;
  version?: string;
  excerpt?: string;
  kind: "official" | "reference" | "community";
}

export type SidebarRoute = "workspace" | "mentor" | "focus" | "monad";
export type MentorMode = "explain" | "why" | "quiz" | "review";

export interface WorkspaceSnapshot {
  hasWorkspace: boolean;
  name: string;
  folders: string[];
  currentFile: string;
  language: string;
  gitBranch: string;
  dirty: boolean;
  hasSelection: boolean;
  selectionLines?: string;
  selectionChars: number;
}

export interface EditorContext {
  file: string;
  language: string;
  startLine: number;
  endLine: number;
  code: string;
}

export interface MentorRequest extends EditorContext {
  mode: MentorMode;
  question?: string;
}

export interface MentorSection {
  title: string;
  points: string[];
}

export interface MentorResponse {
  mode: MentorMode;
  title: string;
  summary: string;
  sections: MentorSection[];
  source: "configured coach" | "local guide";
}

export interface MonadHealth {
  status: "loading" | "online" | "offline";
  chainId?: number;
  latestBlock?: number;
  safeBlock?: number;
  finalizedBlock?: number;
  gasPriceGwei?: string;
  latencyMs?: number;
  checkedAt?: number;
  error?: string;
}

export interface MonadField {
  label: string;
  value: string;
}

export interface MonadInspection {
  kind: "address" | "transaction";
  input: string;
  title: string;
  status: "live" | "pending" | "failed";
  fields: MonadField[];
  explorerUrl: string;
}

export interface ProjectCheck {
  label: string;
  status: "pass" | "warn" | "info";
  detail: string;
}

export interface MonadProjectReport {
  kind: "hardhat" | "foundry" | "mixed" | "solidity" | "not-monad";
  checks: ProjectCheck[];
  actions: string[];
}

export interface ClientState {
  rep: RepState;
  stats: RepStats;
  aiExtensions: string[];
  coachConfigured: boolean;
  contractAddress: string;
  route?: SidebarRoute;
  workspace?: WorkspaceSnapshot;
  editor?: EditorContext;
  monad?: MonadHealth;
}
