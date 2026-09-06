import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { TaskOrchestrationEngine } from '../../src/tasks/orchestration-engine.js';
import { TaskParallelExecutionCoordinator } from '../../src/tasks/parallel-execution.js';
import type { TaskReplicationConflict } from '../../src/tasks/replication/types.js';
import { resolveTaskSessionExecutionWithAutoRecovery } from '../../src/tasks/session-resume.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase50-'));
  roots.push(rootPath);
  return {
    id: `phase50-${roots.length}`,
    name: 'phase50',
    remote: 'phase50',
    rootPath,
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function engines(p: ProjectManifest, conflicts: TaskReplicationConflict[] = []) {
  const store = new TaskStore(p);
  const orchestration = new TaskOrchestrationEngine(store, () => conflicts);
  return {
    store,
    state: new TaskStateEngine(store),
    orchestration,
    parallel: new TaskParallelExecutionCoordinator(orchestration),
  };
}

async function rootWithTasks(store: TaskStore, count: number) {
  const root = await store.createTask({ kind: 'goal', title: 'Root' });
  const tasks = [];
  for (let index = 0; index < count; index += 1) {
    tasks.push(
      await store.createTask({
        kind: 'task',
        parentTaskId: root.id,
        title: `Task ${index + 1}`,
        order: index,
      })
    );
  }
  return { root, tasks };
}

afterEach(() => {
  delete process.env.TOOLNET_TASK_AUTO_ASSIGN;
  delete process.env.TOOLNET_TASK_AUTO_RECOVER;
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 50 multi-agent parallel execution', () => {
  it('plans distinct independent Tasks deterministically for three agents', async () => {
    const { store, parallel } = engines(project());
    const { root, tasks } = await rootWithTasks(store, 3);
    const plan = parallel.plan(root.id, ['opencode', 'kiro', 'codex'], { now: 0 });
    expect(plan.assignments.map((item) => [item.agentId, item.task.id])).toEqual([
      ['codex', tasks[0]!.id],
      ['kiro', tasks[1]!.id],
      ['opencode', tasks[2]!.id],
    ]);
  });

  it('is deterministic regardless of input agent order', async () => {
    const { store, parallel } = engines(project());
    const { root } = await rootWithTasks(store, 3);
    const first = parallel.plan(root.id, ['codex', 'opencode', 'kiro'], { now: 0 });
    const second = parallel.plan(root.id, ['kiro', 'codex', 'opencode'], { now: 0 });
    expect(second.assignments.map((item) => [item.agentId, item.task.id])).toEqual(
      first.assignments.map((item) => [item.agentId, item.task.id])
    );
  });

  it('claims one different ready Task per agent through existing leases', async () => {
    const { store, parallel } = engines(project());
    const { root } = await rootWithTasks(store, 3);
    const result = await parallel.claimReady(root.id, ['codex', 'opencode', 'kiro'], {
      now: Date.parse('2026-09-06T02:00:00.000Z'),
      leaseMs: 120_000,
    });
    expect(result.failures).toEqual([]);
    expect(result.assignments).toHaveLength(3);
    expect(new Set(result.assignments.map((item) => item.task.id)).size).toBe(3);
    for (const item of result.assignments) {
      expect(item.task.activeLease?.agentId).toBe(item.agentId);
    }
  });

  it('never gives an agent a second Task while it already owns one', async () => {
    const { store, orchestration, parallel } = engines(project());
    const { root, tasks } = await rootWithTasks(store, 3);
    const now = Date.parse('2026-09-06T02:00:00.000Z');
    await orchestration.claim(tasks[1]!.id, 'codex', { now, leaseMs: 120_000 });
    const result = await parallel.claimReady(root.id, ['codex', 'opencode'], {
      now,
      leaseMs: 120_000,
    });
    expect(result.assignments.find((item) => item.agentId === 'codex')).toMatchObject({
      task: { id: tasks[1]!.id },
      source: 'owned',
    });
    expect(result.assignments.find((item) => item.agentId === 'opencode')?.task.id).not.toBe(
      tasks[1]!.id
    );
    expect(store.listTasks().filter((task) => task.activeLease?.agentId === 'codex')).toHaveLength(
      1
    );
  });

  it('leaves extra agents unassigned and surplus work available', async () => {
    const one = engines(project());
    const oneRoot = (await rootWithTasks(one.store, 1)).root;
    const oneResult = await one.parallel.claimReady(oneRoot.id, ['codex', 'kiro', 'opencode'], {
      now: 0,
    });
    expect(oneResult.assignments).toHaveLength(1);
    expect(oneResult.unassignedAgentIds).toHaveLength(2);

    const many = engines(project());
    const manyRoot = (await rootWithTasks(many.store, 4)).root;
    const manyResult = await many.parallel.claimReady(manyRoot.id, ['codex', 'opencode'], {
      now: 0,
    });
    expect(manyResult.assignments).toHaveLength(2);
    expect(manyResult.remainingReadyTaskIds).toHaveLength(2);
  });

  it('does not assign dependency-waiting work', async () => {
    const { store, state, parallel } = engines(project());
    const { root, tasks } = await rootWithTasks(store, 2);
    await state.addDependency(tasks[1]!.id, tasks[0]!.id);
    const result = await parallel.claimReady(root.id, ['codex', 'opencode'], { now: 0 });
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.task.id).toBe(tasks[0]!.id);
  });

  it('does not assign replication-conflicted work but assigns safe siblings', async () => {
    const conflict: TaskReplicationConflict = {
      id: 'phase50-conflict',
      code: 'TASK_LEASE_CONFLICT',
      taskId: 'conflicted',
      operationKeys: ['a\u00001', 'b\u00001'],
      message: 'Concurrent lease claims',
    };
    const { store, parallel } = engines(project(), [conflict]);
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    await store.createTask({
      id: 'conflicted',
      kind: 'task',
      parentTaskId: root.id,
      title: 'Conflict',
      order: 0,
    });
    const safe = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Safe',
      order: 1,
    });
    const result = await parallel.claimReady(root.id, ['codex'], { now: 0 });
    expect(result.assignments[0]?.task.id).toBe(safe.id);
    expect(result.conflictedTaskIds).toContain('conflicted');
  });

  it('is idempotent for already-owned execution', async () => {
    const { store, parallel } = engines(project());
    const { root } = await rootWithTasks(store, 2);
    const now = Date.parse('2026-09-06T02:00:00.000Z');
    const first = await parallel.claimReady(root.id, ['codex', 'opencode'], {
      now,
      leaseMs: 120_000,
    });
    const second = await parallel.claimReady(root.id, ['codex', 'opencode'], {
      now: now + 1,
      leaseMs: 120_000,
    });
    expect(second.assignments.map((item) => item.task.activeLease?.leaseId)).toEqual(
      first.assignments.map((item) => item.task.activeLease?.leaseId)
    );
    expect(second.assignments.every((item) => item.source === 'owned')).toBe(true);
  });

  it('keeps startup recommendation read-only by default', async () => {
    const p = project();
    const { store } = engines(p);
    const task = await store.createTask({ kind: 'task', title: 'Recommended' });
    const resolution = await resolveTaskSessionExecutionWithAutoRecovery(p, {
      agentId: 'codex',
      now: 0,
    });
    expect(resolution.mode).toBe('recommended');
    expect(resolution.task?.id).toBe(task.id);
    expect(store.getTask(task.id)?.activeLease).toBeUndefined();
  });

  it('auto assigns a recommended Task only when explicitly enabled', async () => {
    process.env.TOOLNET_TASK_AUTO_ASSIGN = '1';
    const p = project();
    const { store } = engines(p);
    const task = await store.createTask({ kind: 'task', title: 'Auto assign' });
    const resolution = await resolveTaskSessionExecutionWithAutoRecovery(p, {
      agentId: 'codex',
      now: 0,
    });
    expect(resolution).toMatchObject({
      mode: 'owned',
      reason: 'recommended-task-auto-assigned',
      task: { id: task.id, activeLease: { agentId: 'codex' } },
    });
  });

  it('two startup agents auto assign different independent Tasks', async () => {
    process.env.TOOLNET_TASK_AUTO_ASSIGN = '1';
    const p = project();
    const { store } = engines(p);
    const a = await store.createTask({ kind: 'task', title: 'A', order: 0 });
    const b = await store.createTask({ kind: 'task', title: 'B', order: 1 });
    const codex = await resolveTaskSessionExecutionWithAutoRecovery(p, {
      agentId: 'codex',
      now: 0,
    });
    const opencode = await resolveTaskSessionExecutionWithAutoRecovery(p, {
      agentId: 'opencode',
      now: 0,
    });
    expect(codex.task?.id).toBe(a.id);
    expect(opencode.task?.id).toBe(b.id);
    expect(codex.task?.id).not.toBe(opencode.task?.id);
  });
});
