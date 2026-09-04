import { mkdtempSync, rmSync } from 'node:fs';

import { join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { TaskHandoffEngine } from '../../src/tasks/handoff-engine.js';

import { TaskStateEngine } from '../../src/tasks/state-engine.js';

import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-handoff-'));

  roots.push(rootPath);

  return {
    id: 'task-handoff-project',

    name: 'task-handoff-project',
    remote: 'task-handoff-project',
    rootPath,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function engines(p: ProjectManifest) {
  const store = new TaskStore(p);

  return {
    store,

    state: new TaskStateEngine(store),
    handoff: new TaskHandoffEngine(store),
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

describe('Phase 35 Multi-Agent Task Handoff', () => {
  it('allows exactly one concurrent claimant', async () => {
    const p = project();

    const { store, handoff } = engines(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Exclusive claim',
    });
    const now = Date.now();
    const results = await Promise.allSettled([
      handoff.claim(task.id, 'agent-a', {
        now,
      }),
      handoff.claim(task.id, 'agent-b', {
        now,
      }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });
  it('preserves 5/10 progress and next action across explicit handoff', async () => {
    const p = project();
    const { store, state, handoff } = engines(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Long implementation',
    });
    await state.start(task.id);
    await state.setProgress(task.id, 5, 10);
    await state.setNextAction(task.id, 'Implement step 6');
    await handoff.claim(task.id, 'agent-a');
    const handed = await handoff.handoff(
      task.id,
      'agent-a',
      'agent-b',
      'Continue from current checkpoint'
    );
    expect(handed.progress).toEqual({
      completed: 5,
      total: 10,
    });
    expect(handed.nextAction).toBe('Implement step 6');
    expect(handed.activeLease?.agentId).toBe('agent-b');
    expect(handed.handoffHistory.at(-1)?.fromAgentId).toBe('agent-a');
    expect(handed.handoffHistory.at(-1)?.toAgentId).toBe('agent-b');
  });
  it('supports deterministic expired-lease takeover', async () => {
    const p = project();
    const { store, handoff } = engines(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Expired owner',
    });
    const base = Date.now() + 1_000;
    await handoff.claim(task.id, 'agent-a', {
      now: base,
      leaseMs: 30_000,
    });
    const takeover = await handoff.claim(task.id, 'agent-b', {
      now: base + 30_001,
      leaseMs: 30_000,
    });
    expect(takeover.takeover).toBe(true);
    expect(takeover.lease.agentId).toBe('agent-b');
    expect(takeover.task.handoffHistory.at(-1)?.reason).toBe('lease-expired-takeover');
  });
  it('heartbeat extends only the current owner lease', async () => {
    const p = project();
    const { store, handoff } = engines(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Heartbeat',
    });
    const base = Date.now() + 1_000;
    const claimed = await handoff.claim(task.id, 'agent-a', {
      now: base,
      leaseMs: 30_000,
    });
    const heartbeat = await handoff.heartbeat(task.id, 'agent-a', {
      now: base + 10_000,
      leaseMs: 30_000,
    });
    expect(Date.parse(heartbeat.activeLease!.expiresAt)).toBeGreaterThan(
      Date.parse(claimed.lease.expiresAt)
    );
    await expect(
      handoff.heartbeat(task.id, 'agent-b', {
        now: base + 11_000,
        leaseMs: 30_000,
      })
    ).rejects.toThrow('TASK_LEASE_OWNERSHIP_MISMATCH');
  });
  it('release lets another agent claim the same task', async () => {
    const p = project();
    const { store, handoff } = engines(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Release',
    });
    await handoff.claim(task.id, 'agent-a');
    const released = await handoff.release(task.id, 'agent-a', 'Switch agents');
    expect(released.activeLease).toBeUndefined();
    const claimed = await handoff.claim(task.id, 'agent-b');
    expect(claimed.lease.agentId).toBe('agent-b');
  });
  it('claimNext gives two agents different available subtasks', async () => {
    const p = project();
    const { store, handoff } = engines(p);
    const goal = await store.createTask({
      kind: 'goal',
      title: 'Feature',
    });
    await store.createTask({
      kind: 'task',
      parentTaskId: goal.id,
      title: 'Subtask 1',
    });
    await store.createTask({
      kind: 'task',
      parentTaskId: goal.id,
      title: 'Subtask 2',
    });
    const first = await handoff.claimNext(goal.id, 'agent-a');
    const second = await handoff.claimNext(goal.id, 'agent-b');
    expect(first.task.id).not.toBe(second.task.id);
    expect(first.lease.agentId).toBe('agent-a');
    expect(second.lease.agentId).toBe('agent-b');
  });
  it('continuity exposes previous agent and next action', async () => {
    const p = project();
    const { store, state, handoff } = engines(p);
    const goal = await store.createTask({
      kind: 'goal',
      title: 'Goal',
    });
    const task = await store.createTask({
      kind: 'task',
      parentTaskId: goal.id,
      title: 'Resume me',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Continue implementation');
    await handoff.claim(task.id, 'agent-a');
    await handoff.handoff(task.id, 'agent-a', 'agent-b', 'Shift change');
    const continuity = handoff.continuity(goal.id, 'agent-b');
    expect(continuity.currentlyOwnedTask?.id).toBe(task.id);
    expect(continuity.nextAction).toBe('Continue implementation');
    expect(continuity.lastHandoff?.fromAgentId).toBe('agent-a');
    expect(continuity.lastHandoff?.toAgentId).toBe('agent-b');
  });
  it('terminal lifecycle clears execution lease', async () => {
    const p = project();
    const { store, state, handoff } = engines(p);
    const task = await store.createTask({
      kind: 'task',
      title: 'Terminal cleanup',
    });
    await state.start(task.id);
    await handoff.claim(task.id, 'agent-a');
    const completed = await state.complete(task.id);
    expect(completed.status).toBe('completed');
    expect(completed.activeLease).toBeUndefined();
  });
});
