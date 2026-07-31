import { canonicalJson } from "../rnd/canonical";
import { assertToken } from "../agent/types";
import { assertIsolatedCommand, type ExecutionConsent, type IsolatedCommand, type SandboxCommandAuthority, type SandboxMountAuthority, type SandboxWorkspace, type SandboxWorkspaceAuthority } from "./types";

export class MemorySandboxCommandAuthority implements SandboxCommandAuthority {
  private readonly commands = new Map<string, IsolatedCommand>();

  add(projectId: string, command: IsolatedCommand): void {
    assertToken(projectId, "projectId");
    assertIsolatedCommand(command);
    const key = `${projectId}/${command.id}`;
    const current = this.commands.get(key);
    if (current && canonicalJson(current) !== canonicalJson(command)) throw new Error("Approved command is immutable");
    this.commands.set(key, structuredClone(command));
  }

  async open(projectId: string, commandId: string): Promise<IsolatedCommand | undefined> {
    const value = this.commands.get(`${projectId}/${commandId}`);
    return value ? structuredClone(value) : undefined;
  }
}

export class MemorySandboxWorkspaceAuthority implements SandboxWorkspaceAuthority {
  private readonly workspaces = new Map<string, SandboxWorkspace>();

  add(projectId: string, twinHandle: string, workspace: SandboxWorkspace): void {
    assertToken(projectId, "projectId");
    assertToken(twinHandle, "twinHandle");
    this.workspaces.set(`${projectId}/${twinHandle}`, { ...workspace });
  }

  async open(projectId: string, twinHandle: string): Promise<SandboxWorkspace | undefined> {
    const value = this.workspaces.get(`${projectId}/${twinHandle}`);
    return value ? { ...value } : undefined;
  }
}

export class MemorySandboxMountAuthority implements SandboxMountAuthority {
  private readonly mounts = new Map<string, string>();

  add(projectId: string, localHandle: string, path: string): void {
    assertToken(projectId, "projectId");
    assertToken(localHandle, "localHandle");
    this.mounts.set(`${projectId}/${localHandle}`, path);
  }

  async open(projectId: string, localHandle: string): Promise<string | undefined> {
    return this.mounts.get(`${projectId}/${localHandle}`);
  }
}

export class MemoryExecutionConsent implements ExecutionConsent {
  private readonly projects = new Set<string>();

  grant(projectId: string): void {
    assertToken(projectId, "projectId");
    this.projects.add(projectId);
  }

  revoke(projectId: string): void {
    this.projects.delete(projectId);
  }

  async allowed(projectId: string): Promise<boolean> {
    return this.projects.has(projectId);
  }
}
