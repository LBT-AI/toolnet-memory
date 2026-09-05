import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { TaskOrchestrationEngine } from '../../src/tasks/orchestration-engine.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
import type { TaskReplicationConflict } from '../../src/tasks/replication/types.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-orchestration-'));
  roots.push(rootPath);
  return {
    id: 'task-orchestration-project',
    name: 'task-orchestration-project',
    remote: 'task-orchestration-project',
    rootPath,
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function engines(p: ProjectManifest, conflicts: TaskReplicationConflict[] = []) {
  const store = new TaskStore(p);
  return {
    store,
    state: new TaskStateEngine(store),
    orchestration: new TaskOrchestrationEngine(store, () => conflicts),
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 46 multi-agent task orchestration', () => {
  it('selects the same ready Task deterministically by priority and order', async () => {
    const p = project();
    const { store, orchestration } = engines(p);
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const low = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Low priority',
      priority: 'low',
      order: 0,
    });
    const high = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'High priority',
      priority: 'high',
      order: 5,
    });
    const first = orchestration.resolveNextTask(root.id, 'codex', 0);
    const second = orchestration.resolveNextTask(root.id, 'codex', 0);
    expect(first.task?.id).toBe(high.id);
    expect(second.task?.id).toBe(high.id);
    expect(first.task?.id).not.toBe(low.id);
    expect(first.why).toBe('priority-ready');
  });

  it('claims ready work but refuses blocked and dependency-pending Tasks', async () => {
    const p = project();
    const { store, state, orchestration } = engines(p);
    const dependency = await store.createTask({ kind: 'task', title: 'Dependency' });
    const blocked = await store.createTask({ kind: 'task', title: 'Blocked' });
    const dependent = await store.createTask({ kind: 'task', title: 'Dependent' });
    await state.start(blocked.id);
    await state.block(blocked.id, 'Waiting for approval');
    await state.addDependency(dependent.id, dependency.id);
    await expect(orchestration.claim(blocked.id, 'codex')).rejects.toThrow('TASK_CLAIM_BLOCKED');
    await expect(orchestration.claim(dependent.id, 'codex')).rejects.toThrow(
      'TASK_CLAIM_DEPENDENCIES_PENDING'
    );
    const claimed = await orchestration.claim(dependency.id, 'codex');
    expect(claimed.lease.agentId).toBe('codex');
  });

  it('resumes an owned Task and never steals another agent lease', async () => {
    const p = project();
    const { store, orchestration } = engines(p);
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const task = await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'Resume' });
    await orchestration.claim(task.id, 'codex');
    const resume = orchestration.resolveNextTask(root.id, 'codex');
    expect(resume.why).toBe('owned-lease-resume');
    await expect(orchestration.claim(task.id, 'opencode')).rejects.toThrow('TASK_ALREADY_CLAIMED');
  });

  it('retains exact resume context through a Codex to OpenCode handoff', async () => {
    const p = project();
    const { store, state, orchestration } = engines(p);
    const task = await store.createTask({ kind: 'task', title: 'Continue implementation' });
    await state.start(task.id);
    await state.setProgress(task.id, 4, 10);
    await state.setNextAction(task.id, 'Implement the remaining adapter');
    await state.touchFile(task.id, 'src/tasks/adapter.ts');
    await orchestration.claim(task.id, 'codex');
    await orchestration.handoff(task.id, 'codex', 'opencode', 'VPS handoff');
    const context = orchestration.resumeContext(task.id);
    expect(context.progress).toEqual({ completed: 4, total: 10 });
    expect(context.nextAction).toBe('Implement the remaining adapter');
    expect(context.filesTouched).toEqual(['src/tasks/adapter.ts']);
    expect(context.lastAgentId).toBe('opencode');
    expect(context.handoffHistory.at(-1)?.toAgentId).toBe('opencode');
  });

  it('recovers after lease expiry and preserves recovery history', async () => {
    const p = project();
    const { store, orchestration } = engines(p);
    const task = await store.createTask({ kind: 'task', title: 'Recover crash' });
    const base = Date.parse('2026-09-06T01:00:00.000Z');
    await orchestration.claim(task.id, 'codex', { now: base, leaseMs: 30_000 });
    const takeover = await orchestration.claim(task.id, 'kiro', {
      now: base + 30_001,
      leaseMs: 30_000,
    });
    expect(takeover.takeover).toBe(true);
    expect(takeover.task.lastAgentId).toBe('kiro');
    expect(takeover.task.handoffHistory.at(-1)?.reason).toBe('lease-expired-takeover');
  });

  it('blocks claims, evidence attribution, and completion while replication conflict is unresolved', async () => {
    const p = project();
    const taskConflict: TaskReplicationConflict = {
      id: 'lease-conflict-1',
      code: 'TASK_LEASE_CONFLICT',
      taskId: 'conflicted-task',
      operationKeys: ['a\u00001', 'b\u00001'],
      message: 'Concurrent claims',
    };
    const { store, state, orchestration } = engines(p, [taskConflict]);
    const task = await store.createTask({ id: 'conflicted-task', kind: 'task', title: 'Conflict' });
    await expect(orchestration.claim(task.id, 'codex')).rejects.toThrow(
      'TASK_REPLICATION_CONFLICT'
    );
    await state.start(task.id);
    await expect(orchestration.complete(task.id, 'codex')).rejects.toThrow(
      'TASK_REPLICATION_CONFLICT'
    );
  });

  it('rejects stale completion from the former owner after handoff', async () => {
    const p = project();
    const { store, state, orchestration } = engines(p);
    const task = await store.createTask({ kind: 'task', title: 'Ownership safety' });
    await state.start(task.id);
    await orchestration.claim(task.id, 'codex');
    await orchestration.handoff(task.id, 'codex', 'opencode');
    await expect(orchestration.complete(task.id, 'codex')).rejects.toThrow(
      'TASK_COMPLETION_OWNER_MISMATCH'
    );
    expect(store.getTask(task.id)?.status).toBe('active');
  });
});
