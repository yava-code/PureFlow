export interface MissionContract {
  task: string;
}

export interface WorktreeRef {
  path: string;
}

export interface RunRef {
  id: string;
}

export interface AgentEvent {
  type: string;
  payload: any;
}

export interface AgentInput {
  message: string;
}

export interface RunSnapshot {
  id: string;
  state: string;
}

export interface AgentDriver {
  start(input: MissionContract, workspace: WorktreeRef): Promise<RunRef>;
  events(run: RunRef, signal?: AbortSignal): AsyncIterable<AgentEvent>;
  respond(run: RunRef, input: AgentInput): Promise<void>;
  cancel(run: RunRef): Promise<void>;
  snapshot(run: RunRef): Promise<RunSnapshot>;
}
