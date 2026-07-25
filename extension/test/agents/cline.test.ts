import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClineDriver } from '../../src/agents/cline';
import { createDisposableWorktree } from './fixtures';
import type { AgentEvent } from '../../src/agents/driver';

describe('ClineDriver', () => {
  let driver: ClineDriver;
  let worktree: { worktreePath: string, cleanup: () => void };

  beforeEach(() => {
    driver = new ClineDriver();
    worktree = createDisposableWorktree();
  });

  afterEach(() => {
    worktree.cleanup();
  });

  it('should start a run and return a RunRef', async () => {
    const runRef = await driver.start({ task: 'update cache TTL' }, { path: worktree.worktreePath });
    expect(runRef).toBeDefined();
    expect(runRef.id).toBeDefined();
  });

  it('should stream events', async () => {
    const runRef = await driver.start({ task: 'update cache TTL' }, { path: worktree.worktreePath });

    const events: AgentEvent[] = [];
    for await (const event of driver.events(runRef)) {
      events.push(event);
    }

    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.type).toBe('tool_start');
  });

  it('should take a snapshot', async () => {
    const runRef = await driver.start({ task: 'update cache TTL' }, { path: worktree.worktreePath });
    const snapshot = await driver.snapshot(runRef);

    expect(snapshot.id).toBe(runRef.id);
    expect(snapshot.state).toContain('update cache TTL');
  });

  it('should respond to a run', async () => {
    const runRef = await driver.start({ task: 'update cache TTL' }, { path: worktree.worktreePath });
    await driver.respond(runRef, { message: 'approved' });

    const snapshot = await driver.snapshot(runRef);
    expect(snapshot.state).toContain('approved');
  });

  it('should cancel a run', async () => {
    const runRef = await driver.start({ task: 'update cache TTL' }, { path: worktree.worktreePath });
    await driver.cancel(runRef);

    const snapshot = await driver.snapshot(runRef);
    expect(snapshot.state).toContain('cancelled');
  });
});
