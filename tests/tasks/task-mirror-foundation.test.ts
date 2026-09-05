import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { TaskHandoffEngine } from '../../src/tasks/handoff-engine.js';
import {
  normalizeTaskMirrorSnapshot,
  taskMirrorSnapshotDigest,
  taskMirrorTaskId,
} from '../../src/tasks/mirror-identity.js';
import { TaskMirrorEngine } from '../../src/tasks/mirror-engine.js';
import type { AgentPlanSnapshot } from '../../src/tasks/mirror-types.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
const roots: string[] = [];
function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-mirror-'));
  roots.push(rootPath);
  return {
    id: 'task-mirror-project',
    name: 'task-mirror-project',
    remote: 'task-mirror-project',
    rootPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    graphVersion: 0,
    memoryVersion: 0,
  };
}
function snapshot(overrides: Partial<AgentPlanSnapshot> = {}): AgentPlanSnapshot {
  return {
    version: 1,
    projectId: 'task-mirror-project',
    provider: 'codex',
    agentId: 'codex-agent',
    nativeSessionId: 'thread-a',
    planId: 'plan-1',
    mode: 'full',
    sourceEventId: 'event-1',
    sourceSequence: 1,
    observedAt: new Date().toISOString(),
    currentSourceKey: 'todo:1',
    items: [
      {
        sourceKey: 'todo:1',
        externalItemId: 'native-1',
        title: 'Implement mirror',
        status: 'in_progress',
        order: 0,
      },
      {
        sourceKey: 'todo:2',
        externalItemId: 'native-2',
        title: 'Run certification',
        status: 'pending',
        order: 1,
      },
    ],
    ...overrides,
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
describe('Phase 42A Task Mirror Foundation', () => {
  it('creates deterministic IDs scoped by native session', () => {
    const a = normalizeTaskMirrorSnapshot(snapshot());
    const b = normalizeTaskMirrorSnapshot(
      snapshot({
        nativeSessionId: 'thread-b',
      })
    );
    expect(taskMirrorTaskId(a, a.items[0]!)).not.toBe(taskMirrorTaskId(b, b.items[0]!));
  });
  it('keeps identity stable across rename and reorder', () => {
    const first = normalizeTaskMirrorSnapshot(snapshot());
    const changed = normalizeTaskMirrorSnapshot(
      snapshot({
        items: [
          {
            sourceKey: 'todo:1',
            externalItemId: 'native-1',
            title: 'Renamed native task',
            status: 'in_progress',
            order: 50,
          },
        ],
      })
    );
    expect(taskMirrorTaskId(first, first.items[0]!)).toBe(
      taskMirrorTaskId(changed, changed.items[0]!)
    );
  });
  it('does not include source event time/id in content digest', () => {
    const first = normalizeTaskMirrorSnapshot(snapshot());
    const replay = normalizeTaskMirrorSnapshot(
      snapshot({
        sourceEventId: 'event-replay',
        sourceSequence: 999,
        observedAt: new Date(Date.now() + 10_000).toISOString(),
      })
    );
    expect(taskMirrorSnapshotDigest(first)).toBe(taskMirrorSnapshotDigest(replay));
  });
  it('plans create, lifecycle, and claim without mutating TaskStore', () => {
    const p = project();
    const store = new TaskStore(p);
    const engine = new TaskMirrorEngine(p, store);
    const result = engine.plan(snapshot());
    expect(result.mode).toBe('shadow');
    expect(result.newTasks).toBe(2);
    expect(result.actions.map((action) => action.type)).toEqual(
      expect.arrayContaining(['create', 'transition', 'claim'])
    );
    expect(store.listTasks()).toHaveLength(0);
  });
  it('patches an existing mirrored task instead of creating another one', async () => {
    const p = project();
    const store = new TaskStore(p);
    const engine = new TaskMirrorEngine(p, store);
    const native = normalizeTaskMirrorSnapshot(snapshot());
    const taskId = taskMirrorTaskId(native, native.items[0]!);
    await store.createTask({
      id: taskId,
      kind: 'task',
      title: 'Old title',
      order: 99,
    });
    const result = engine.plan(snapshot());
    expect(
      result.actions.some(
        (action) =>
          action.type === 'patch' &&
          action.taskId === taskId &&
          action.patch.title === 'Implement mirror' &&
          action.patch.order === 0
      )
    ).toBe(true);
    expect(
      result.actions.some((action) => action.type === 'create' && action.taskId === taskId)
    ).toBe(false);
  });
  it('produces zero actions for an already aligned active claimed task', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const handoff = new TaskHandoffEngine(store);
    const engine = new TaskMirrorEngine(p, store);
    const native = normalizeTaskMirrorSnapshot(
      snapshot({
        items: [
          {
            sourceKey: 'todo:1',
            title: 'Implement mirror',
            status: 'in_progress',
            order: 0,
          },
        ],
      })
    );
    const taskId = taskMirrorTaskId(native, native.items[0]!);
    await store.createTask({
      id: taskId,
      kind: 'task',
      title: native.items[0]!.title,
      order: native.items[0]!.order,
    });
    await state.start(taskId);
    await handoff.claim(taskId, native.agentId);
    const result = engine.plan(native);
    expect(result.actions).toEqual([]);
  });
  it('never cancels an existing Task merely because a full snapshot omitted it', async () => {
    const p = project();
    const store = new TaskStore(p);
    const engine = new TaskMirrorEngine(p, store);
    const previous = normalizeTaskMirrorSnapshot(snapshot());
    const omittedId = taskMirrorTaskId(previous, previous.items[0]!);
    await store.createTask({
      id: omittedId,
      kind: 'task',
      title: previous.items[0]!.title,
      order: 0,
    });
    const next = snapshot({
      currentSourceKey: undefined,
      items: [
        {
          sourceKey: 'todo:2',
          title: 'Run certification',
          status: 'pending',
          order: 1,
        },
      ],
    });
    const result = engine.plan(next);
    expect(result.actions.some((action) => action.taskId === omittedId)).toBe(false);
    expect(store.getTask(omittedId)?.status).toBe('pending');
  });
  it('fails closed on duplicated provider source keys', () => {
    expect(() =>
      normalizeTaskMirrorSnapshot(
        snapshot({
          items: [
            {
              sourceKey: 'same',
              title: 'A',
              status: 'pending',
              order: 0,
            },
            {
              sourceKey: 'same',
              title: 'B',
              status: 'pending',
              order: 1,
            },
          ],
        })
      )
    ).toThrow(/TASK_MIRROR_DUPLICATE_SOURCE_KEY/u);
  });
  it('reports lifecycle regression instead of bypassing Task invariants', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const engine = new TaskMirrorEngine(p, store);
    const native = normalizeTaskMirrorSnapshot(
      snapshot({
        currentSourceKey: undefined,
        items: [
          {
            sourceKey: 'todo:1',
            title: 'Implement mirror',
            status: 'pending',
            order: 0,
          },
        ],
      })
    );
    const taskId = taskMirrorTaskId(native, native.items[0]!);
    await store.createTask({
      id: taskId,
      kind: 'task',
      title: native.items[0]!.title,
      order: 0,
    });
    await state.start(taskId);
    const result = engine.plan(native);
    expect(
      result.actions.some(
        (action) => action.type === 'conflict' && action.reason.includes('status-regression')
      )
    ).toBe(true);
    expect(store.getTask(taskId)?.status).toBe('active');
  });
});
