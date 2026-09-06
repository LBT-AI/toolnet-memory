import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { createSessionIdentity } from '../../src/session/identity.js';
import { NativeTaskMirrorRuntime } from '../../src/session/native-plan/runtime.js';
import { recoverSessionTaskState } from '../../src/session/task-self-healing.js';
import { SessionWal } from '../../src/session/wal.js';
import type { SessionEventInput } from '../../src/session/types.js';
import { TaskOrchestrationEngine } from '../../src/tasks/orchestration-engine.js';
import { taskOperationLogPath } from '../../src/tasks/operation-log.js';
import { TaskStore, taskProjectionPath } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase51-'));
  roots.push(rootPath);
  return {
    id: `phase51-${roots.length}`,
    name: 'phase51',
    remote: 'phase51',
    rootPath,
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function walFor(p: ProjectManifest, nativeSessionId = 'phase51-codex-thread'): SessionWal {
  return new SessionWal(createSessionIdentity(p, 'codex', nativeSessionId));
}

function nativePlanEvent(): SessionEventInput {
  return {
    type: 'tool_call',
    sourceEventId: 'phase51-plan-1',
    sourceSequence: 1,
    data: {
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'update_plan',
        arguments: JSON.stringify({
          plan: [
            { step: 'Recover durable native Task', status: 'in_progress' },
            { step: 'Verify self healing', status: 'pending' },
          ],
        }),
      },
    },
    provenance: { source: 'codex' },
  };
}

afterEach(() => {
  delete process.env.TOOLNET_TASK_MIRROR;
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 51 crash/replay/self-healing', () => {
  it('replays a native plan fsynced to Session WAL before mirror enqueue', async () => {
    const p = project();
    const wal = walFor(p);
    wal.append([nativePlanEvent()]);
    expect(new TaskStore(p).listTasks()).toEqual([]);

    const mirror = new NativeTaskMirrorRuntime(p);
    const recovery = await recoverSessionTaskState(p, wal, mirror);
    expect(recovery.errors).toEqual([]);
    expect(recovery.replayedEvents).toBe(1);
    expect(
      mirror
        .store()
        .listTasks()
        .find((task) => task.title === 'Recover durable native Task')
    ).toMatchObject({
      status: 'active',
    });
  });

  it('replaying the same Session WAL does not duplicate logical Tasks', async () => {
    const p = project();
    const wal = walFor(p);
    wal.append([nativePlanEvent()]);
    const first = new NativeTaskMirrorRuntime(p);
    await recoverSessionTaskState(p, wal, first);
    const firstCount = first.store().projection().operationCount;
    const firstTasks = first
      .store()
      .listTasks()
      .map((task) => ({ id: task.id, status: task.status }));

    const second = new NativeTaskMirrorRuntime(p);
    await recoverSessionTaskState(p, wal, second);
    expect(second.store().projection().operationCount).toBe(firstCount);
    expect(
      second
        .store()
        .listTasks()
        .map((task) => ({ id: task.id, status: task.status }))
    ).toEqual(firstTasks);
  });

  it('repairs an interrupted Task operation log tail while preserving earlier operations', async () => {
    const p = project();
    const store = new TaskStore(p);
    const created = await store.createTask({ kind: 'task', title: 'Durable Task' });
    const file = taskOperationLogPath(p);
    appendFileSync(file, '{"version":1,"operationId":"partial');
    const projection = new TaskStore(p).rebuildProjection();
    expect(projection.tasks[created.id]?.title).toBe('Durable Task');
    expect(readFileSync(file, 'utf8')).not.toContain('"operationId":"partial');
  });

  it('fails closed on corruption in a complete Task log line', async () => {
    const p = project();
    const store = new TaskStore(p);
    await store.createTask({ kind: 'task', title: 'Protected history' });
    appendFileSync(taskOperationLogPath(p), 'not-json\n');
    expect(() => new TaskStore(p).rebuildProjection()).toThrow('TASK_OPERATION_LOG_CORRUPT');
  });

  it('repairs an interrupted Session WAL tail without losing earlier events', () => {
    const p = project();
    const wal = walFor(p);
    wal.append([
      { type: 'assistant_message', sourceEventId: 'durable-1', data: { content: 'one' } },
    ]);
    appendFileSync(wal.eventsFile, '{"version":1,"id":"partial');
    expect(wal.readAllEvents().map((event) => event.sourceEventId)).toEqual(['durable-1']);
    expect(readFileSync(wal.eventsFile, 'utf8').endsWith('\n')).toBe(true);
  });

  it('rebuilds missing Task projection state from immutable operations', async () => {
    const p = project();
    const store = new TaskStore(p);
    const first = await store.createTask({ kind: 'task', title: 'Task A' });
    const second = await store.createTask({ kind: 'task', title: 'Task B' });
    const stateFile = taskProjectionPath(p);
    expect(existsSync(stateFile)).toBe(true);
    rmSync(stateFile, { force: true });
    expect(new TaskStore(p).listTasks().map((task) => task.id)).toEqual([first.id, second.id]);
    new TaskStore(p).rebuildProjection();
    expect(existsSync(stateFile)).toBe(true);
  });

  it('preserves active lease ownership across process restart', async () => {
    const p = project();
    const store = new TaskStore(p);
    const root = await store.createTask({ kind: 'goal', title: 'Root' });
    const task = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'Resume me',
    });
    const now = Date.parse('2026-09-06T03:00:00.000Z');
    const first = new TaskOrchestrationEngine(store, () => store.replicationConflicts());
    const claim = await first.claim(task.id, 'codex', { now, leaseMs: 120_000 });
    const restartedStore = new TaskStore(p);
    const restarted = new TaskOrchestrationEngine(restartedStore, () =>
      restartedStore.replicationConflicts()
    );
    const decision = restarted.resolveNextTask(root.id, 'codex', now + 1);
    expect(decision.why).toBe('owned-lease-resume');
    expect(decision.task?.activeLease?.leaseId).toBe(claim.lease.leaseId);
  });

  it('keeps Session WAL available when Task recovery fails', async () => {
    const p = project();
    const store = new TaskStore(p);
    await store.createTask({ kind: 'task', title: 'Before corruption' });
    appendFileSync(taskOperationLogPath(p), 'invalid-complete-line\n');
    const wal = walFor(p, 'fail-soft-session');
    wal.append([
      { type: 'assistant_message', sourceEventId: 'before-recovery', data: { content: 'first' } },
    ]);
    const result = await recoverSessionTaskState(p, wal, new NativeTaskMirrorRuntime(p));
    expect(result.errors.some((error) => error.includes('TASK_PROJECTION_RECOVERY_FAILED'))).toBe(
      true
    );
    expect(() =>
      wal.append([
        { type: 'assistant_message', sourceEventId: 'after-recovery', data: { content: 'second' } },
      ])
    ).not.toThrow();
    expect(wal.readAllEvents().map((event) => event.sourceEventId)).toEqual([
      'before-recovery',
      'after-recovery',
    ]);
  });
});
