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

export interface ClientState {
  rep: RepState;
  stats: RepStats;
  aiExtensions: string[];
  coachConfigured: boolean;
  contractAddress: string;
}

