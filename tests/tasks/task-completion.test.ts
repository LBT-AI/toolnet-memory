import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { contentSourceKeys } from '../../src/session/native-plan/common.js';
import { syncNativeTaskMirrors } from '../../src/session/native-plan/mutate.js';
import { buildTaskCompletionDraft, completionDigest } from '../../src/tasks/completion-snapshot.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
import { buildTaskPanelView } from '../../src/visualization/tasks-panel.js';
import type { NormalizedSessionEvent } from '../../src/session/types.js';

const roots: string[] = [];
const now = '2026-09-05T12:00:00.000Z';

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-completion-'));
  roots.push(rootPath);
  return {
    id: 'task-completion-project',
    name: 'task-completion-project',
    remote: 'task-completion-project',
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function event(
  projectId: string,
  agent: 'codex' | 'opencode',
  nativeSessionId: string,
  sourceEventId: string,
  sequence: number,
  type: NormalizedSessionEvent['type'],
  data: Record<string, unknown>,
  role?: string
): NormalizedSessionEvent {
  return {
    version: 1,
    id: `normalized-${sourceEventId}`,
    sequence,
    projectId,
    agent,
    nativeSessionId,
    sessionId: nativeSessionId,
    type,
    timestamp: new Date(Date.parse(now) + sequence * 1_000).toISOString(),
    role,
    sourceEventId,
    sourceSequence: sequence,
    data,
    provenance: {},
  };
}

function codexPlan(
  p: ProjectManifest,
  session: string,
  sourceEventId: string,
  sequence: number,
  title: string,
  status: 'in_progress' | 'completed'
): NormalizedSessionEvent {
  return event(p.id, 'codex', session, sourceEventId, sequence, 'tool_call', {
    type: 'response_item',
    payload: {
      type: 'function_call',
      name: 'update_plan',
      arguments: JSON.stringify({ plan: [{ step: title, status }] }),
    },
  });
}

function opencodePlan(
  p: ProjectManifest,
  session: string,
  sourceEventId: string,
  sequence: number,
  title: string,
  status: 'in_progress' | 'completed'
): NormalizedSessionEvent {
  return event(p.id, 'opencode', session, sourceEventId, sequence, 'tool_call', {
    type: 'tool',
    tool: 'todowrite',
    state: {
      input: {
        todos: [{ content: title, status, priority: 'high' }],
      },
    },
  });
}

function visibleResult(
  p: ProjectManifest,
  session: string,
  sourceEventId: string,
  sequence: number,
  sourceKey: string,
  summary: string,
  agent: 'codex' | 'opencode' = 'codex'
): NormalizedSessionEvent {
  return event(
    p.id,
    agent,
    session,
    sourceEventId,
    sequence,
    'assistant_message',
    {
      completion: {
        sourceKey,
        summary,
        changes: ['Updated implementation'],
        verification: ['tests: PASS'],
        reasoning: 'private chain of thought must not persist',
      },
    },
    'assistant'
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 43 Task Completion Snapshot', () => {
  it('records only on a completed task and remains immutable/idempotent', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({ kind: 'task', title: 'Immutable result' });
    const draft = buildTaskCompletionDraft({
      projectId: p.id,
      task: { ...task, filesTouched: ['src/example.ts'] },
      provider: 'codex',
      nativeSessionId: 'session-a',
      sourceEventId: 'result-1',
      visibleSummary: 'Visible completion summary',
    });
    await expect(state.recordCompletion(task.id, { completion: draft })).rejects.toThrow(
      'TASK_COMPLETION_REQUIRES_COMPLETED'
    );
    await state.start(task.id);
    const completed = await state.complete(task.id);
    const recorded = await state.recordCompletion(task.id, { completion: draft });
    expect(recorded.completion?.summary).toBe('Visible completion summary');
    expect(recorded.completion?.capturedAt).toBeTruthy();
    expect(recorded.revision).toBe(completed.revision + 1);
    const replay = await state.recordCompletion(task.id, { completion: draft });
    expect(replay.completion?.id).toBe(recorded.completion?.id);
    await expect(
      state.recordCompletion(task.id, {
        completion: {
          ...draft,
          summary: 'A different result',
          digest: completionDigest({ ...draft, summary: 'A different result' }),
        },
      })
    ).rejects.toThrow('TASK_COMPLETION_ALREADY_RECORDED');
  });

  it('copies bounded files/tests and uses deterministic fallback without an LLM', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({ kind: 'task', title: 'Fallback task' });
    await state.touchFile(task.id, 'src/a.ts');
    await state.recordTest(task.id, { name: 'typecheck', outcome: 'pass' });
    await state.start(task.id);
    await state.complete(task.id);
    const completed = store.getTask(task.id)!;
    const first = buildTaskCompletionDraft({
      projectId: p.id,
      task: completed,
      provider: 'codex',
      nativeSessionId: 'session-a',
      sourceEventId: 'result-2',
    });
    const second = buildTaskCompletionDraft({
      projectId: p.id,
      task: completed,
      provider: 'codex',
      nativeSessionId: 'session-a',
      sourceEventId: 'result-2',
    });
    expect(first.summary).toContain('Completed: Fallback task');
    expect(first.files).toEqual(['src/a.ts']);
    expect(first.tests).toEqual([{ name: 'typecheck', outcome: 'pass' }]);
    expect(first.digest).toBe(second.digest);
    expect(first.id).toBe(second.id);
  });

  it('captures Codex visible result after lifecycle completion and excludes reasoning', async () => {
    const p = project();
    const store = new TaskStore(p);
    const sourceKey = contentSourceKeys('codex', ['Capture result'])[0]!;
    const result = await syncNativeTaskMirrors(
      p,
      store,
      [
        codexPlan(p, 'session-a', 'plan-1', 1, 'Capture result', 'in_progress'),
        codexPlan(p, 'session-a', 'plan-2', 2, 'Capture result', 'completed'),
        visibleResult(p, 'session-a', 'result-1', 3, sourceKey, 'Implemented the result visibly.'),
      ],
      { now: () => Date.parse(now) }
    );
    expect(
      result.diagnostics.some((item) => item.code === 'TASK_COMPLETION_REQUIRES_COMPLETED')
    ).toBe(false);
    const task = store.listTasks().find((item) => item.title === 'Capture result')!;
    expect(task.status).toBe('completed');
    expect(task.completion?.summary).toBe('Implemented the result visibly.');
    expect(JSON.stringify(task.completion)).not.toContain('reasoning');
    expect(JSON.stringify(task.completion)).not.toContain('chain of thought');
  });

  it('captures OpenCode visible result and is idempotent on repeated sync', async () => {
    const p = project();
    const store = new TaskStore(p);
    const first = await syncNativeTaskMirrors(
      p,
      store,
      [opencodePlan(p, 'opencode-session', 'oc-1', 1, 'OpenCode result', 'in_progress')],
      { now: () => Date.parse(now) }
    );
    const sourceKey = contentSourceKeys('opencode', ['OpenCode result'])[0]!;
    await syncNativeTaskMirrors(
      p,
      store,
      [
        opencodePlan(p, 'opencode-session', 'oc-2', 2, 'OpenCode result', 'completed'),
        visibleResult(
          p,
          'opencode-session',
          'oc-result',
          3,
          sourceKey,
          'OpenCode finished the task.',
          'opencode'
        ),
      ],
      { now: () => Date.parse(now) }
    );
    const task = store.listTasks().find((item) => item.title === 'OpenCode result')!;
    expect(task.status).toBe('completed');
    expect(task.completion?.summary).toBe('OpenCode finished the task.');
    const before = store.projection().operationCount;
    await syncNativeTaskMirrors(
      p,
      store,
      [
        opencodePlan(p, 'opencode-session', 'oc-2', 2, 'OpenCode result', 'completed'),
        visibleResult(
          p,
          'opencode-session',
          'oc-result',
          3,
          sourceKey,
          'OpenCode finished the task.',
          'opencode'
        ),
      ],
      { now: () => Date.parse(now) }
    );
    expect(store.projection().operationCount).toBe(before);
    expect(first.executions).toHaveLength(1);
  });

  it('does not record a snapshot when the lifecycle completion guard rejects native completion', async () => {
    const p = project();
    const store = new TaskStore(p);
    await syncNativeTaskMirrors(
      p,
      store,
      [codexPlan(p, 'guard-session', 'guard-1', 1, 'Guarded completion', 'in_progress')],
      { now: () => Date.parse(now) }
    );
    const task = store.listTasks().find((item) => item.title === 'Guarded completion')!;
    await new TaskStateEngine(store).setProgress(task.id, 0, 1);
    const sourceKey = contentSourceKeys('codex', ['Guarded completion'])[0]!;
    await syncNativeTaskMirrors(
      p,
      store,
      [
        codexPlan(p, 'guard-session', 'guard-2', 2, 'Guarded completion', 'completed'),
        visibleResult(p, 'guard-session', 'guard-result', 3, sourceKey, 'Must not be recorded'),
      ],
      { now: () => Date.parse(now) }
    );
    expect(store.getTask(task.id)?.status).toBe('active');
    expect(store.getTask(task.id)?.completion).toBeUndefined();
  });

  it('keeps native sessions isolated and ignores unrelated visible messages', async () => {
    const p = project();
    const store = new TaskStore(p);
    const sourceKeyA = contentSourceKeys('codex', ['Same title'])[0]!;
    await syncNativeTaskMirrors(
      p,
      store,
      [codexPlan(p, 'session-a', 'a-1', 1, 'Same title', 'in_progress')],
      { now: () => Date.parse(now) }
    );
    await syncNativeTaskMirrors(
      p,
      store,
      [codexPlan(p, 'session-b', 'b-1', 1, 'Same title', 'in_progress')],
      { now: () => Date.parse(now) }
    );
    await syncNativeTaskMirrors(
      p,
      store,
      [visibleResult(p, 'session-a', 'a-result', 2, sourceKeyA, 'Session A result')],
      { now: () => Date.parse(now) }
    );
    const tasks = store.listTasks().filter((item) => item.title === 'Same title');
    expect(tasks).toHaveLength(2);
    expect(tasks.every((item) => item.completion === undefined)).toBe(true);
    const unrelated = await syncNativeTaskMirrors(
      p,
      store,
      [
        event(
          p.id,
          'codex',
          'session-a',
          'unrelated',
          3,
          'assistant_message',
          { summary: 'unrelated prose' },
          'assistant'
        ),
      ],
      { now: () => Date.parse(now) }
    );
    expect(unrelated.executions).toHaveLength(0);
    expect(
      store
        .listTasks()
        .filter((item) => item.title === 'Same title')
        .every((item) => !item.completion)
    ).toBe(true);
  });

  it('exposes completion through the read-only panel projection only', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({ kind: 'goal', title: 'Panel result' });
    await state.start(task.id);
    await state.complete(task.id);
    const completed = store.getTask(task.id)!;
    const draft = buildTaskCompletionDraft({
      projectId: p.id,
      task: completed,
      provider: 'opencode',
      nativeSessionId: 'session-panel',
      sourceEventId: 'panel-result',
      visibleSummary: 'Panel summary',
    });
    await state.recordCompletion(task.id, { completion: draft });
    const view = buildTaskPanelView(p, store.projection(), task.id);
    expect(view.selectedRoot?.completion?.summary).toBe('Panel summary');
    expect(JSON.stringify(view)).not.toContain('sourceEventId');
    expect(readFileSync('src/visualization/public/index.html', 'utf8')).toContain(
      'renderTaskCompletion'
    );
  });
});
