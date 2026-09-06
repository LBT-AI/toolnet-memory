import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { buildTaskDependencySchedule } from '../../src/tasks/dependency-scheduler.js';
import { TaskOrchestrationEngine } from '../../src/tasks/orchestration-engine.js';
import type { TaskReplicationConflict } from '../../src/tasks/replication/types.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase49-'));
  roots.push(rootPath);
  return {
    id: `phase49-${roots.length}`,
    name: 'phase49',
    remote: 'phase49',
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

function schedule(
  store: TaskStore,
  rootTaskId: string | undefined,
  conflicts: TaskReplicationConflict[] = []
) {
  return buildTaskDependencySchedule(store.projection(), conflicts, {
    ...(rootTaskId ? { rootTaskId } : {}),
    agentId: 'codex',
    now: 0,
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 49 deterministic dependency scheduler', () => {
  it('returns every independent ready Task in deterministic order', async () => {
    const { store } = engines(project());
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const low = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Low',
      priority: 'low',
      order: 0,
    });
    const high = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'High',
      priority: 'high',
      order: 9,
    });
    expect(schedule(store, root.id).parallelReadyTaskIds).toEqual([high.id, low.id]);
  });

  it('keeps dependent work waiting and unlocks it after completion', async () => {
    const { store, state } = engines(project());
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const first = await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'First' });
    const second = await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'Second' });
    await state.addDependency(second.id, first.id);

    const before = schedule(store, root.id);
    expect(before.parallelReadyTaskIds).toEqual([first.id]);
    expect(before.waitingTasks[0]?.unresolvedDependencyIds).toEqual([first.id]);

    await state.start(first.id);
    await state.complete(first.id);
    const after = schedule(store, root.id);
    expect(after.parallelReadyTaskIds).toContain(second.id);
    expect(after.waitingTasks.map((entry) => entry.task.id)).not.toContain(second.id);
  });

  it('unlocks dependency chains one stage at a time', async () => {
    const { store, state } = engines(project());
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const a = await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'A', order: 0 });
    const b = await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'B', order: 1 });
    const c = await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'C', order: 2 });
    await state.addDependency(b.id, a.id);
    await state.addDependency(c.id, b.id);
    expect(schedule(store, root.id).parallelReadyTaskIds).toEqual([a.id]);
    await state.start(a.id);
    await state.complete(a.id);
    expect(schedule(store, root.id).parallelReadyTaskIds).toEqual([b.id]);
    await state.start(b.id);
    await state.complete(b.id);
    expect(schedule(store, root.id).parallelReadyTaskIds).toEqual([c.id]);
  });

  it('does not let a foreign lease block independent work', async () => {
    const { store, orchestration } = engines(project());
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const leased = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Leased',
      order: 0,
    });
    const free = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Free',
      order: 1,
    });
    const now = Date.parse('2026-09-06T01:00:00.000Z');
    await orchestration.claim(leased.id, 'codex', { now, leaseMs: 120_000 });
    const result = orchestration.scheduleTasks(root.id, 'opencode', now);
    expect(result.foreignLeasedTasks.map((entry) => entry.task.id)).toContain(leased.id);
    expect(result.parallelReadyTaskIds).toContain(free.id);
    expect(orchestration.resolveNextTask(root.id, 'opencode', now).task?.id).toBe(free.id);
  });

  it('resumes an owned Task before selecting new ready work', async () => {
    const { store, orchestration } = engines(project());
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const owned = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Owned',
      order: 10,
    });
    await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Critical',
      priority: 'critical',
      order: 0,
    });
    const now = Date.parse('2026-09-06T01:00:00.000Z');
    await orchestration.claim(owned.id, 'codex', { now, leaseMs: 120_000 });
    const next = orchestration.resolveNextTask(root.id, 'codex', now);
    expect(next.task?.id).toBe(owned.id);
    expect(next.why).toBe('owned-lease-resume');
  });

  it('excludes conflicts without blocking safe siblings', async () => {
    const conflict: TaskReplicationConflict = {
      id: 'phase49-conflict',
      code: 'TASK_LEASE_CONFLICT',
      taskId: 'conflicted',
      operationKeys: ['host-a\u00001', 'host-b\u00001'],
      message: 'Concurrent claims',
    };
    const { store } = engines(project());
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const conflicted = await store.createTask({
      id: 'conflicted',
      kind: 'task',
      parentTaskId: root.id,
      title: 'Conflicted',
      order: 0,
    });
    const safe = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Safe',
      order: 1,
    });
    const result = schedule(store, root.id, [conflict]);
    expect(result.conflictedTasks.map((entry) => entry.task.id)).toContain(conflicted.id);
    expect(result.parallelReadyTaskIds).toEqual([safe.id]);
  });

  it('schedules nested leaves instead of containers', async () => {
    const { store } = engines(project());
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const parent = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Container',
    });
    const child = await store.createTask({
      kind: 'subtask',
      parentTaskId: parent.id,
      title: 'Leaf',
    });
    const result = schedule(store, root.id);
    expect(result.entries.map((entry) => entry.task.id)).toEqual([child.id]);
    expect(result.parallelReadyTaskIds).toEqual([child.id]);
  });

  it('is read-only and creates no Task operations', async () => {
    const { store } = engines(project());
    await store.createTask({ kind: 'task', title: 'Read only' });
    const before = store.projection().operationCount;
    schedule(store, undefined);
    expect(store.projection().operationCount).toBe(before);
  });

  it('recommends independent work during startup while another agent owns a Task', async () => {
    const { store, orchestration } = engines(project());
    const a = await store.createTask({ kind: 'task', title: 'A', order: 0 });
    const b = await store.createTask({ kind: 'task', title: 'B', order: 1 });
    const now = Date.parse('2026-09-06T01:00:00.000Z');
    await orchestration.claim(a.id, 'codex', { now, leaseMs: 120_000 });
    const resolution = orchestration.resolveSessionExecution({ agentId: 'opencode', now });
    expect(resolution.mode).toBe('recommended');
    expect(resolution.task?.id).toBe(b.id);
  });
});
