import { mkdtempSync, rmSync } from 'node:fs';

import { join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { TaskStateEngine } from '../../src/tasks/state-engine.js';

import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-state-'));

  roots.push(rootPath);

  return {
    id: 'task-state-project',

    name: 'task-state-project',
    remote: 'task-state-project',
    rootPath,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function engine(project: ProjectManifest) {
  const store = new TaskStore(project);

  return {
    store,

    state: new TaskStateEngine(store),
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

describe('Phase 34 Task State Engine', () => {
  it('supports deterministic lifecycle start/block/resume', async () => {
    const p = project();

    const { store, state } = engine(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Lifecycle',
    });
    const active = await state.start(task.id, {
      expectedRevision: 1,
    });
    expect(active.status).toBe('active');
    const blocked = await state.block(task.id, 'Waiting for API', 'Retry API request', {
      expectedRevision: 2,
    });
    expect(blocked.status).toBe('blocked');
    expect(blocked.blocker?.reason).toBe('Waiting for API');
    const resumed = await state.resume(task.id, {
      expectedRevision: 3,
    });
    expect(resumed.status).toBe('active');
    expect(resumed.blocker).toBeUndefined();
  });
  it('stores explicit progress 5/10', async () => {
    const p = project();
    const { store, state } = engine(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Progress',
    });
    const updated = await state.setProgress(task.id, 5, 10, {
      expectedRevision: 1,
    });
    expect(updated.progress).toEqual({
      completed: 5,
      total: 10,
    });
  });
  it('derives parent progress from child state', async () => {
    const p = project();
    const { store, state } = engine(p);
    const root = await store.createTask({
      kind: 'goal',
      title: 'Goal',
    });
    const first = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'First',
    });
    await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Second',
    });
    await state.start(first.id);
    await state.complete(first.id);
    const resume = state.resumeState(root.id);
    expect(resume.progress).toMatchObject({
      done: 1,
      total: 2,
      percent: 50,
      source: 'children',
    });
  });
  it('blocks completion while dependency is incomplete', async () => {
    const p = project();
    const { store, state } = engine(p);
    const dependency = await store.createTask({
      kind: 'task',
      title: 'Dependency',
    });
    const task = await store.createTask({
      kind: 'task',
      title: 'Dependent',
    });
    await state.addDependency(task.id, dependency.id);
    await state.start(task.id);
    await expect(state.complete(task.id)).rejects.toThrow('TASK_COMPLETE_DEPENDENCIES_PENDING');
  });
  it('rejects dependency cycles', async () => {
    const p = project();
    const { store, state } = engine(p);
    const a = await store.createTask({
      kind: 'task',
      title: 'A',
    });
    const b = await store.createTask({
      kind: 'task',
      title: 'B',
    });
    await state.addDependency(a.id, b.id);
    await expect(state.addDependency(b.id, a.id)).rejects.toThrow('TASK_DEPENDENCY_CYCLE');
  });
  it('records evidence files and tests', async () => {
    const p = project();
    const { store, state } = engine(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Evidence',
    });
    await state.addEvidence(task.id, {
      kind: 'commit',
      summary: 'Implemented state engine',
      ref: 'abc123',
    });
    await state.touchFile(task.id, 'src/tasks/state-engine.ts');
    await state.touchFile(task.id, 'src/tasks/state-engine.ts');
    const updated = await state.recordTest(task.id, {
      name: 'task-state-engine',
      outcome: 'pass',
    });
    expect(updated.evidence).toHaveLength(1);
    expect(updated.filesTouched).toEqual(['src/tasks/state-engine.ts']);
    expect(updated.tests[0].outcome).toBe('pass');
  });
  it('blocks completion while child remains open', async () => {
    const p = project();
    const { store, state } = engine(p);
    const root = await store.createTask({
      kind: 'goal',
      title: 'Release',
    });
    await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Open child',
    });
    await state.start(root.id);
    await expect(state.complete(root.id)).rejects.toThrow('TASK_COMPLETE_CHILDREN_OPEN');
  });
  it('selects deterministic resume child', async () => {
    const p = project();
    const { store, state } = engine(p);
    const root = await store.createTask({
      kind: 'goal',
      title: 'Project goal',
    });
    const first = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'First task',
    });
    await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Second task',
    });
    await state.start(first.id);
    await state.setNextAction(first.id, 'Continue implementation');
    const resume = state.resumeState(root.id);
    expect(resume.resumeTask.id).toBe(first.id);
    expect(resume.nextAction).toBe('Continue implementation');
  });
  it('prevents completion with incomplete explicit progress', async () => {
    const p = project();
    const { store, state } = engine(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Progress gate',
    });
    await state.start(task.id);
    await state.setProgress(task.id, 5, 10);
    await expect(state.complete(task.id)).rejects.toThrow('TASK_COMPLETE_PROGRESS_INCOMPLETE');
  });
});
