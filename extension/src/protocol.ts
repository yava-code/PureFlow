import type { EditorContext } from "./selection";
import type { MentorMode, SidebarRoute } from "./types";
import type { WorkspaceSnapshot } from "./workspace";

export type { SidebarRoute } from "./types";
export type MentorIntent = MentorMode;

export interface NavigateMessage {
  type: "route";
  route: SidebarRoute;
}

export interface IdeStateMessage {
  type: "workspaceState";
  workspace: WorkspaceSnapshot;
}

export interface MentorRequestMessage {
  type: "mentorContext";
  mode: MentorIntent;
  context: EditorContext;
}

export type HostToSidebarMessage = NavigateMessage | IdeStateMessage | MentorRequestMessage;
