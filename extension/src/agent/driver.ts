import type { RunEnvelope } from "../recorder/events";
import type { AgentRun, AgentTask, AgentWorkspace } from "./types";

export interface AgentDriver {
  start(task: AgentTask, workspace: AgentWorkspace): Promise<AgentRun>;
  followUp(runId: string, message: string): Promise<void>;
  cancel(runId: string): Promise<void>;
  events(runId: string): AsyncIterable<RunEnvelope>;
}
