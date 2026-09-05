import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { createSessionIdentity } from '../../src/session/identity.js';
import { syncNativeTaskMirrors } from '../../src/session/native-plan/mutate.js';
import { applyObservationsToLocalWorkState } from '../../src/work-continuity/local-work-state.js';
import { projectWorkStateWithTasks } from '../../src/work-continuity/task-compatibility.js';
import type { WorkObservation, WorkState } from '../../src/work-continuity/types.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
import { TaskMirrorBindingStore } from '../../src/tasks/mirror-binding-store.js';
import type { NormalizedSessionEvent } from '../../src/session/types.js';

const roots: string[] = [];
const NOW = Date.parse('2026-09-05T15:00:00.000Z');

function project(id = 'phase44-project'): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase44-compat-'));
  roots.push(rootPath);
  const now = new Date(NOW).toISOString();
  return {
    id,
    name: id,
    remote: id,
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function planEvent(
  projectId: string,
  session: string,
  sourceEventId: string,
  sequence: number,
  title: string,
  status: 'in_progress' | 'completed'
): NormalizedSessionEvent {
  return {
    version: 1,
    id: `normalized-${sourceEventId}`,
    sequence,
    projectId,
    agent: 'codex',
    nativeSessionId: session,
    sessionId: session,
    type: 'tool_call',
    timestamp: new Date(NOW + sequence * 1_000).toISOString(),
    sourceEventId,
    sourceSequence: sequence,
    data: {
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'update_plan',
        arguments: JSON.stringify({
          plan: [{ step: title, status }],
        }),
      },
    },
    provenance: {},
  };
}

function observation(
  projectId: string,
  session: string,
  text: string,
  status: WorkObservation['status'] = 'pending'
): WorkObservation {
  return {
    version: 1,
    id: `observation-${session}-${text}`,
    projectId,
    kind: 'task',
    key: 'task:1',
    text,
    status,
    order: 1,
    confidence: 0.8,
    occurredAt: new Date(NOW).toISOString(),
    sequence: 1,
    agent: 'codex',
    nativeSessionId: session,
    sessionKey: `codex:${session}`,
    eventId: `event-${session}`,
    sourceEventId: `source-${session}`,
  };
}

function legacyState(p: ProjectManifest, session: string): WorkState {
  return applyObservationsToLocalWorkState(p, [observation(p.id, session, 'Legacy pending task')]);
}

async function mirrorTask(
  p: ProjectManifest,
  session: string,
  title: string,
  status: 'in_progress' | 'completed' = 'in_progress'
): Promise<TaskStore> {
  const store = new TaskStore(p);
  await syncNativeTaskMirrors(
    p,
    store,
    [planEvent(p.id, session, `${session}-${status}`, 1, title, status)],
    { now: () => NOW }
  );
  return store;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 44 WorkState / Persistent Tasks compatibility', () => {
  it('keeps legacy WorkState behavior when no Persistent Task binding exists', () => {
    const p = project();
    const identity = createSessionIdentity(p, 'codex', 'legacy-session');
    const previous = legacyState(p, 'legacy-session');
    const projected = projectWorkStateWithTasks({
      project: p,
      identity,
      observations: [],
      previousWorkState: previous,
      taskProjection: new TaskStore(p).projection(),
      bindingProjection: new TaskMirrorBindingStore(p).projection(),
    });
    expect(projected).toEqual(previous);
    expect(projected.currentTask?.title).toBe('Legacy pending task');
  });

  it('lets an active bound Task override stale heuristic pending state', async () => {
    const p = project();
    const store = await mirrorTask(p, 'session-a', 'Authoritative task');
    const identity = createSessionIdentity(p, 'codex', 'session-a');
    const projected = projectWorkStateWithTasks({
      project: p,
      identity,
      observations: [],
      previousWorkState: legacyState(p, 'session-a'),
      taskProjection: store.projection(),
      bindingProjection: new TaskMirrorBindingStore(p).projection(),
    });
    expect(projected.currentTask?.title).toBe('Authoritative task');
    expect(projected.currentTask?.status).toBe('in_progress');
    expect(projected.progress.tasksCompleted).toBe(0);
  });

  it('projects blocker, next action, files, and tests from the authoritative Task', async () => {
    const p = project();
    const store = await mirrorTask(p, 'session-b', 'Blocked task');
    const task = store.listTasks().find((item) => item.title === 'Blocked task')!;
    const state = new TaskStateEngine(store);
    await state.touchFile(task.id, 'src/authoritative.ts');
    await state.recordTest(task.id, {
      name: 'npm test',
      outcome: 'pass',
    });
    await state.block(task.id, 'Waiting for dependency', 'Resume after dependency is ready');
    const projected = projectWorkStateWithTasks({
      project: p,
      identity: createSessionIdentity(p, 'codex', 'session-b'),
      observations: [],
      previousWorkState: legacyState(p, 'session-b'),
      taskProjection: store.projection(),
      bindingProjection: new TaskMirrorBindingStore(p).projection(),
    });
    expect(projected.currentTask?.status).toBe('blocked');
    expect(projected.blockers).toEqual(['Waiting for dependency']);
    expect(projected.nextActions).toEqual(['Resume after dependency is ready']);
    expect(projected.filesTouched).toContain('src/authoritative.ts');
    expect(projected.tests).toContain('[pass] npm test');
  });

  it('does not regress a completed bound Task from a stale pending observation', async () => {
    const p = project();
    const store = await mirrorTask(p, 'session-c', 'Completed task');
    const task = store.listTasks().find((item) => item.title === 'Completed task')!;
    const state = new TaskStateEngine(store);
    await state.complete(task.id);
    const projected = projectWorkStateWithTasks({
      project: p,
      identity: createSessionIdentity(p, 'codex', 'session-c'),
      observations: [observation(p.id, 'session-c', 'Stale pending', 'pending')],
      previousWorkState: legacyState(p, 'session-c'),
      taskProjection: store.projection(),
      bindingProjection: new TaskMirrorBindingStore(p).projection(),
    });
    expect(projected.currentTask?.status).toBe('completed');
    expect(projected.tasks[0]?.status).toBe('completed');
    expect(projected.progress.tasksCompleted).toBe(1);
  });

  it('keeps same-title tasks isolated by native session binding', async () => {
    const p = project();
    const firstStore = await mirrorTask(p, 'session-a', 'Same title');
    await mirrorTask(p, 'session-b', 'Same title');
    const bindings = new TaskMirrorBindingStore(p).projection();
    const first = projectWorkStateWithTasks({
      project: p,
      identity: createSessionIdentity(p, 'codex', 'session-a'),
      observations: [],
      previousWorkState: legacyState(p, 'session-a'),
      taskProjection: firstStore.projection(),
      bindingProjection: bindings,
    });
    expect(first.currentTask?.title).toBe('Same title');
    expect(first.currentTask?.updatedBy.nativeSessionId).toBe('session-a');
  });

  it('fails closed when more than one bound session is available without identity', async () => {
    const p = project();
    const store = await mirrorTask(p, 'session-a', 'Task A');
    await mirrorTask(p, 'session-b', 'Task B');
    const previous = legacyState(p, 'legacy-session');
    const projected = projectWorkStateWithTasks({
      project: p,
      observations: [],
      previousWorkState: previous,
      taskProjection: store.projection(),
      bindingProjection: new TaskMirrorBindingStore(p).projection(),
    });
    expect(projected).toEqual(previous);
  });
});
