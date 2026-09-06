import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { computedTaskProgress } from '../../src/tasks/projection.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project() {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase48-'));
  roots.push(rootPath);
  return { id: 'phase48-project', rootPath };
}

async function activeTask() {
  const store = new TaskStore(project());
  const state = new TaskStateEngine(store);
  const created = await store.createTask({
    id: 'task-phase48',
    kind: 'task',
    title: 'Implement Phase 48',
    actor: { kind: 'agent', id: 'codex' },
  });
  await state.start(created.id, { actor: { kind: 'agent', id: 'codex' } });
  return { store, state, taskId: created.id };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 48 autonomous derived Task activity progress', () => {
  it('starts active leaf work in implementing stage without changing explicit progress', async () => {
    const { store, taskId } = await activeTask();
    const task = store.getTask(taskId)!;
    expect(task.activityProgress?.stage).toBe('implementing');
    expect(task.activityProgress?.percent).toBe(15);
    expect(task.progress).toEqual({ completed: 0, total: 0 });
    expect(computedTaskProgress(store.projection().tasks, task)).toMatchObject({
      percent: 15,
      source: 'activity',
    });
  });

  it('advances after a changed project file', async () => {
    const { store, state, taskId } = await activeTask();
    await state.touchFile(taskId, 'src/example.ts', {
      actor: { kind: 'agent', id: 'codex' },
    });
    expect(store.getTask(taskId)?.activityProgress).toMatchObject({
      stage: 'implementing',
      percent: 45,
      signals: { filesTouched: 1 },
    });
  });

  it('moves into verification after passing tests', async () => {
    const { store, state, taskId } = await activeTask();
    await state.recordTest(
      taskId,
      { name: 'vitest', outcome: 'pass' },
      { actor: { kind: 'agent', id: 'codex' } }
    );
    expect(store.getTask(taskId)?.activityProgress).toMatchObject({
      stage: 'verifying',
      percent: 70,
    });
  });

  it('marks failed checks as needing attention', async () => {
    const { store, state, taskId } = await activeTask();
    await state.recordTest(
      taskId,
      { name: 'vitest', outcome: 'fail' },
      { actor: { kind: 'agent', id: 'codex' } }
    );
    expect(store.getTask(taskId)?.activityProgress).toMatchObject({
      stage: 'needs_attention',
      percent: 55,
      suggestedNextAction: 'Fix failing checks and run verification again.',
    });
  });

  it('becomes ready to complete after deterministic verification evidence', async () => {
    const { store, state, taskId } = await activeTask();
    await state.addEvidence(
      taskId,
      {
        kind: 'review',
        summary: 'Verification PASS: npm run typecheck',
        ref: 'verification:phase48-pass',
      },
      { actor: { kind: 'agent', id: 'codex' } }
    );
    expect(store.getTask(taskId)?.activityProgress).toMatchObject({
      stage: 'ready_to_complete',
      percent: 85,
    });
  });

  it('raises ready progress when a commit is recorded', async () => {
    const { store, state, taskId } = await activeTask();
    await state.addEvidence(
      taskId,
      { kind: 'commit', summary: 'Commit abcdef123456', ref: 'abcdef1234567890' },
      { actor: { kind: 'agent', id: 'codex' } }
    );
    expect(store.getTask(taskId)?.activityProgress).toMatchObject({
      stage: 'ready_to_complete',
      percent: 90,
    });
  });

  it('does not make activity heuristics part of completion guards', async () => {
    const { store, state, taskId } = await activeTask();
    await state.touchFile(taskId, 'src/example.ts');
    await state.recordTest(taskId, { name: 'vitest', outcome: 'pass' });
    expect(store.getTask(taskId)?.progress).toEqual({ completed: 0, total: 0 });
    await expect(state.complete(taskId)).resolves.toMatchObject({
      status: 'completed',
      activityProgress: { stage: 'completed', percent: 100 },
    });
  });

  it('rebuilds the same derived progress from the immutable operation log', async () => {
    const { store, state, taskId } = await activeTask();
    await state.touchFile(taskId, 'src/replay.ts');
    await state.recordTest(taskId, { name: 'vitest', outcome: 'pass' });
    const before = store.getTask(taskId)?.activityProgress;
    store.rebuildProjection();
    expect(store.getTask(taskId)?.activityProgress).toEqual(before);
  });

  it('keeps blocked state authoritative while preserving derived activity percent', async () => {
    const { store, state, taskId } = await activeTask();
    await state.touchFile(taskId, 'src/blocked.ts');
    await state.block(taskId, 'Waiting for dependency');
    expect(store.getTask(taskId)?.activityProgress).toMatchObject({
      stage: 'blocked',
      percent: 45,
    });
  });
});
