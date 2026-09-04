import { mkdtempSync, rmSync } from 'node:fs';

import { join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { TaskStore } from '../../src/tasks/store.js';

import { TaskStateEngine } from '../../src/tasks/state-engine.js';

import { TaskHandoffEngine } from '../../src/tasks/handoff-engine.js';

import { buildTaskPanelView, TASK_PANEL_MAX_ITEMS } from '../../src/visualization/tasks-panel.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-panel-'));

  roots.push(rootPath);

  return {
    id: 'task-panel-project',

    name: 'task-panel-project',
    remote: 'task-panel-project',
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

describe('Phase 37 Tasks Panel', () => {
  it('returns an empty view without creating Task state', () => {
    const p = project();

    const store = new TaskStore(p);
    const view = buildTaskPanelView(p, store.projection());
    expect(view.empty).toBe(true);
    expect(view.roots).toEqual([]);
  });
  it('renders deterministic 5/10 parent progress', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const goal = await store.createTask({
      kind: 'goal',
      title: 'Phase 37',
    });
    const children = [];
    for (let index = 0; index < 10; index += 1) {
      children.push(
        await store.createTask({
          kind: 'task',
          parentTaskId: goal.id,
          title: `Task ${index + 1}`,
        })
      );
    }
    for (const child of children.slice(0, 5)) {
      await state.start(child.id);
      await state.complete(child.id);
    }
    await state.start(children[5].id);
    const view = buildTaskPanelView(p, store.projection(), goal.id);
    expect(view.selectedRoot?.progress).toMatchObject({
      done: 5,
      total: 10,
      percent: 50,
      source: 'children',
    });
    expect(view.currentTask?.id).toBe(children[5].id);
  });
  it('shows blocker and next action', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      kind: 'goal',
      title: 'Blocked work',
    });
    await state.start(task.id);
    await state.block(task.id, 'Waiting for provider', 'Retry after provider recovery');
    const view = buildTaskPanelView(p, store.projection(), task.id);
    expect(view.currentTask?.blockerReason).toBe('Waiting for provider');
    expect(view.currentTask?.nextAction).toBe('Retry after provider recovery');
  });
  it('shows only non-expired execution leases', async () => {
    const p = project();
    const store = new TaskStore(p);
    const handoff = new TaskHandoffEngine(store);
    const task = await store.createTask({
      kind: 'goal',
      title: 'Lease',
    });
    const base = Date.now() + 1_000;
    await handoff.claim(task.id, 'codex', {
      now: base,
      leaseMs: 30_000,
    });
    const active = buildTaskPanelView(p, store.projection(), task.id, base + 1_000);
    expect(active.currentTask?.activeLease?.agentId).toBe('codex');
    expect(active.activeLeaseCount).toBe(1);
    const expired = buildTaskPanelView(p, store.projection(), task.id, base + 31_000);
    expect(expired.currentTask?.activeLease).toBeUndefined();
    expect(expired.activeLeaseCount).toBe(0);
  });
  it('resolves a requested child to its root Goal', async () => {
    const p = project();
    const store = new TaskStore(p);
    const goal = await store.createTask({
      kind: 'goal',
      title: 'Root',
    });
    const task = await store.createTask({
      kind: 'task',
      parentTaskId: goal.id,
      title: 'Child',
    });
    const subtask = await store.createTask({
      kind: 'subtask',
      parentTaskId: task.id,
      title: 'Nested',
    });
    const view = buildTaskPanelView(p, store.projection(), subtask.id);
    expect(view.selectedRootTaskId).toBe(goal.id);
    expect(view.selectedRoot?.children[0]?.children[0]?.id).toBe(subtask.id);
  });
  it('does not expose raw evidence or test history in panel items', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      kind: 'goal',
      title: 'Security',
    });
    await state.addEvidence(task.id, {
      kind: 'note',
      summary: 'internal evidence',
    });
    await state.recordTest(task.id, {
      name: 'private test detail',
      outcome: 'pass',
    });
    const serialized = JSON.stringify(buildTaskPanelView(p, store.projection(), task.id));
    expect(serialized).not.toContain('internal evidence');
    expect(serialized).not.toContain('private test detail');
  });
  it('has a bounded panel payload contract', () => {
    expect(TASK_PANEL_MAX_ITEMS).toBe(500);
  });
});
