import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { planLocalGc } from '../../src/retention/local-planner.js';

import { retentionPolicy } from '../../src/retention/policy.js';

import { taskOperationLogPath } from '../../src/tasks/operation-log.js';

import { projectTaskOperations } from '../../src/tasks/projection.js';

import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-core-'));

  roots.push(rootPath);

  return {
    id: 'task-core-project',

    name: 'task-core-project',
    remote: 'task-core-project',
    rootPath,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,

      force: true,
    });
  }
});

describe('Phase 33 Task Core', () => {
  it('creates shared Goal -> Task -> Subtask hierarchy', async () => {
    const p = project();

    const store = new TaskStore(p);
    const goal = await store.createTask({
      kind: 'goal',
      title: 'Ship v0.4.0',
      actor: {
        kind: 'agent',
        id: 'opencode',
      },
    });
    const task = await store.createTask({
      kind: 'task',
      parentTaskId: goal.id,
      title: 'Persistent Shared Tasks',
      actor: {
        kind: 'agent',
        id: 'codex',
      },
    });
    const subtask = await store.createTask({
      kind: 'subtask',
      parentTaskId: task.id,
      title: 'Task Core',
    });
    expect(store.listTasks()).toHaveLength(3);
    expect(task.parentTaskId).toBe(goal.id);
    expect(subtask.parentTaskId).toBe(task.id);
  });
  it('replays the append-only log deterministically', async () => {
    const p = project();
    const store = new TaskStore(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Deterministic task',
    });
    await store.patchTask(
      task.id,
      {
        priority: 'high',
        labels: ['memory', 'tasks'],
      },
      {
        expectedRevision: 1,
      }
    );
    const projection = store.projection();
    const replay = projectTaskOperations(
      p.id,
      (await import('../../src/tasks/operation-log.js')).readTaskOperations(taskOperationLogPath(p))
    );
    expect(replay).toEqual(projection);
  });
  it('rejects stale concurrent revisions before append', async () => {
    const p = project();
    const store = new TaskStore(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Concurrent update',
    });
    const results = await Promise.allSettled([
      store.patchTask(
        task.id,
        {
          title: 'Writer A',
        },
        {
          expectedRevision: 1,
        }
      ),
      store.patchTask(
        task.id,
        {
          title: 'Writer B',
        },
        {
          expectedRevision: 1,
        }
      ),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(store.getTask(task.id)?.revision).toBe(2);
  });
  it('does not filter tasks by creating agent', async () => {
    const p = project();
    const store = new TaskStore(p);
    await store.createTask({
      kind: 'task',
      title: 'Created by OpenCode',
      actor: {
        kind: 'agent',
        id: 'opencode',
      },
    });
    await store.createTask({
      kind: 'task',
      title: 'Created by Codex',
      actor: {
        kind: 'agent',
        id: 'codex',
      },
    });
    expect(store.listTasks().map((task) => task.title)).toEqual(
      expect.arrayContaining(['Created by OpenCode', 'Created by Codex'])
    );
  });
  it('sanitizes secret-like task content before persistence', async () => {
    const p = project();
    const store = new TaskStore(p);
    const secret = 'AKIAIOSFODNN7EXAMPLE';
    await store.createTask({
      kind: 'task',
      title: 'Security task',
      description: `credential ${secret}`,
    });
    expect(readFileSync(taskOperationLogPath(p), 'utf8')).not.toContain(secret);
  });
  it('repairs only an incomplete corrupt tail', async () => {
    const p = project();
    const store = new TaskStore(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Crash recovery',
    });
    appendFileSync(taskOperationLogPath(p), '{"partial":');
    const updated = await store.patchTask(
      task.id,
      {
        priority: 'critical',
      },
      {
        expectedRevision: 1,
      }
    );
    expect(updated.priority).toBe('critical');
    expect(store.projection().operationCount).toBe(2);
  });
  it('protects Task durable state from garbage collection', () => {
    const p = project();
    const plan = planLocalGc(p, retentionPolicy());
    expect(plan.protected.some((entry) => entry.category === 'protected-tasks')).toBe(true);
  });
});
