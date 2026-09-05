import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { extractCodexPlanSnapshots } from '../../src/session/codex/plan-adapter.js';
import { syncNativeTaskMirrors } from '../../src/session/native-plan/mutate.js';
import type { NormalizedSessionEvent, SessionAgent } from '../../src/session/types.js';
import { TaskMirrorBindingStore } from '../../src/tasks/mirror-binding-store.js';
import { TaskHandoffEngine } from '../../src/tasks/handoff-engine.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];
const NOW = Date.parse('2026-09-05T08:00:00.000Z');

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-mirror-mutation-'));
  roots.push(rootPath);
  const now = new Date(NOW).toISOString();
  return {
    id: 'mirror-mutation-project',
    name: 'mirror-mutation-project',
    remote: 'mirror-mutation-project',
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function nativeEvent(
  agent: SessionAgent,
  nativeSessionId: string,
  sourceEventId: string,
  sourceSequence: number,
  data: Record<string, unknown>
): NormalizedSessionEvent {
  return {
    version: 1,
    id: `normalized-${sourceEventId}`,
    sequence: sourceSequence,
    projectId: 'mirror-mutation-project',
    agent,
    nativeSessionId,
    sessionId: nativeSessionId,
    type: 'tool_call',
    timestamp: new Date(NOW + sourceSequence * 1_000).toISOString(),
    sourceEventId,
    sourceSequence,
    data,
    provenance: {},
  };
}

function codex(
  sourceEventId: string,
  sourceSequence: number,
  plan: Array<{ step: string; status: 'pending' | 'in_progress' | 'completed' }>
): NormalizedSessionEvent {
  return nativeEvent('codex', 'codex-mutation-thread', sourceEventId, sourceSequence, {
    type: 'response_item',
    payload: {
      type: 'function_call',
      name: 'update_plan',
      arguments: JSON.stringify({ plan }),
    },
  });
}

function opencode(
  sourceEventId: string,
  sourceSequence: number,
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: string;
  }>
): NormalizedSessionEvent {
  return nativeEvent('opencode', 'opencode-mutation-session', sourceEventId, sourceSequence, {
    type: 'tool',
    tool: 'todowrite',
    state: { input: { todos } },
  });
}

function options() {
  return { now: () => NOW };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 42D Native Task Auto Mutation', () => {
  it('creates a Goal and native Tasks, starts current work, and claims exactly one current Task', async () => {
    const p = project();
    const store = new TaskStore(p);
    const result = await syncNativeTaskMirrors(
      p,
      store,
      [
        codex('plan-1', 1, [
          { step: 'Implement executor', status: 'in_progress' },
          { step: 'Run tests', status: 'pending' },
        ]),
      ],
      options()
    );
    expect(result.executions).toHaveLength(1);
    expect(store.listTasks().filter((task) => task.kind === 'goal')).toHaveLength(1);
    const implementation = store.listTasks().find((task) => task.title === 'Implement executor')!;
    const tests = store.listTasks().find((task) => task.title === 'Run tests')!;
    expect(implementation.status).toBe('active');
    expect(implementation.activeLease?.agentId).toBe('codex');
    expect(tests.status).toBe('pending');
    expect(tests.activeLease).toBeUndefined();
  });

  it('is idempotent when the exact native event is replayed', async () => {
    const p = project();
    const store = new TaskStore(p);
    const event = codex('plan-replay', 1, [{ step: 'Implement executor', status: 'in_progress' }]);
    await syncNativeTaskMirrors(p, store, [event], options());
    const before = store.projection().operationCount;
    const replay = await syncNativeTaskMirrors(p, store, [event], options());
    expect(replay.replayedSnapshots).toBe(1);
    expect(store.projection().operationCount).toBe(before);
  });

  it('completes previous native Task and moves the lease to the next current Task', async () => {
    const p = project();
    const store = new TaskStore(p);
    await syncNativeTaskMirrors(
      p,
      store,
      [
        codex('move-1', 1, [
          { step: 'Task A', status: 'in_progress' },
          { step: 'Task B', status: 'pending' },
        ]),
      ],
      options()
    );
    await syncNativeTaskMirrors(
      p,
      store,
      [
        codex('move-2', 2, [
          { step: 'Task A', status: 'completed' },
          { step: 'Task B', status: 'in_progress' },
        ]),
      ],
      options()
    );
    const a = store.listTasks().find((task) => task.title === 'Task A')!;
    const b = store.listTasks().find((task) => task.title === 'Task B')!;
    expect(a.status).toBe('completed');
    expect(a.activeLease).toBeUndefined();
    expect(b.status).toBe('active');
    expect(b.activeLease?.agentId).toBe('codex');
  });

  it('never bypasses completion guards when native provider says completed', async () => {
    const p = project();
    const store = new TaskStore(p);
    await syncNativeTaskMirrors(
      p,
      store,
      [codex('guard-1', 1, [{ step: 'Guarded Task', status: 'in_progress' }])],
      options()
    );
    const task = store.listTasks().find((item) => item.title === 'Guarded Task')!;
    await new TaskStateEngine(store).setProgress(task.id, 0, 1);
    const result = await syncNativeTaskMirrors(
      p,
      store,
      [codex('guard-2', 2, [{ step: 'Guarded Task', status: 'completed' }])],
      options()
    );
    expect(store.getTask(task.id)?.status).toBe('active');
    expect(
      result.executions[0]?.conflicts.some(
        (conflict) => conflict.code === 'TASK_COMPLETE_PROGRESS_INCOMPLETE'
      )
    ).toBe(true);
  });

  it('does not steal an unexpired lease from another agent', async () => {
    const p = project();
    const store = new TaskStore(p);
    await syncNativeTaskMirrors(
      p,
      store,
      [codex('lease-1', 1, [{ step: 'Owned Task', status: 'in_progress' }])],
      options()
    );
    const task = store.listTasks().find((item) => item.title === 'Owned Task')!;
    await new TaskHandoffEngine(store).handoff(task.id, 'codex', 'other-agent', 'test ownership', {
      now: NOW,
    });
    const result = await syncNativeTaskMirrors(
      p,
      store,
      [codex('lease-2', 2, [{ step: 'Owned Task', status: 'in_progress' }])],
      options()
    );
    expect(store.getTask(task.id)?.activeLease?.agentId).toBe('other-agent');
    expect(
      result.executions[0]?.conflicts.some(
        (conflict) =>
          conflict.code === 'TASK_ALREADY_CLAIMED' || conflict.code === 'TASK_MIRROR_PLAN_CONFLICT'
      )
    ).toBe(true);
  });

  it('does not auto-claim either Task when provider reports multiple in_progress items', async () => {
    const p = project();
    const store = new TaskStore(p);
    const result = await syncNativeTaskMirrors(
      p,
      store,
      [
        codex('multi-1', 1, [
          { step: 'Active A', status: 'in_progress' },
          { step: 'Active B', status: 'in_progress' },
        ]),
      ],
      options()
    );
    const tasks = store.listTasks().filter((task) => task.kind === 'task');
    expect(tasks).toHaveLength(2);
    expect(tasks.every((task) => task.status === 'active')).toBe(true);
    expect(tasks.every((task) => task.activeLease === undefined)).toBe(true);
    expect(result.diagnostics.some((item) => item.code === 'CODEX_PLAN_MULTIPLE_IN_PROGRESS')).toBe(
      true
    );
  });

  it('keeps the same Persistent Task through an active native rename and patches its title', async () => {
    const p = project();
    const store = new TaskStore(p);
    await syncNativeTaskMirrors(
      p,
      store,
      [codex('rename-1', 1, [{ step: 'Run tests', status: 'in_progress' }])],
      options()
    );
    const before = store.listTasks().find((task) => task.title === 'Run tests')!;
    await syncNativeTaskMirrors(
      p,
      store,
      [codex('rename-2', 2, [{ step: 'Run full certification', status: 'in_progress' }])],
      options()
    );
    const taskRecords = store.listTasks().filter((task) => task.kind === 'task');
    expect(taskRecords).toHaveLength(1);
    expect(taskRecords[0]?.id).toBe(before.id);
    expect(taskRecords[0]?.title).toBe('Run full certification');
  });

  it('recovers after binding persistence happened before Task mutation', async () => {
    const p = project();
    const store = new TaskStore(p);
    const event = codex('crash-window-1', 1, [
      { step: 'Recover after crash', status: 'in_progress' },
    ]);
    const raw = extractCodexPlanSnapshots([event]).snapshots[0]!;
    await new TaskMirrorBindingStore(p).correlate(raw);
    expect(store.listTasks()).toEqual([]);
    const replay = await syncNativeTaskMirrors(p, store, [event], options());
    expect(replay.replayedSnapshots).toBe(1);
    expect(store.listTasks().some((task) => task.title === 'Recover after crash')).toBe(true);
  });

  it('does not cancel an omitted native item', async () => {
    const p = project();
    const store = new TaskStore(p);
    await syncNativeTaskMirrors(
      p,
      store,
      [
        codex('omit-1', 1, [
          { step: 'Keep A', status: 'in_progress' },
          { step: 'Keep B', status: 'pending' },
        ]),
      ],
      options()
    );
    const b = store.listTasks().find((task) => task.title === 'Keep B')!;
    await syncNativeTaskMirrors(
      p,
      store,
      [codex('omit-2', 2, [{ step: 'Keep A', status: 'in_progress' }])],
      options()
    );
    expect(store.getTask(b.id)?.status).toBe('pending');
  });

  it('cancels only from an explicit OpenCode cancelled status', async () => {
    const p = project();
    const store = new TaskStore(p);
    await syncNativeTaskMirrors(
      p,
      store,
      [
        opencode('oc-cancel-1', 1, [
          { content: 'Optional Task', status: 'pending', priority: 'low' },
        ]),
      ],
      options()
    );
    const task = store.listTasks().find((item) => item.title === 'Optional Task')!;
    await syncNativeTaskMirrors(
      p,
      store,
      [
        opencode('oc-cancel-2', 2, [
          { content: 'Optional Task', status: 'cancelled', priority: 'low' },
        ]),
      ],
      options()
    );
    expect(store.getTask(task.id)?.status).toBe('cancelled');
  });
});
