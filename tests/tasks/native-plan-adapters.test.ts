import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { extractCodexPlanSnapshots } from '../../src/session/codex/plan-adapter.js';
import { extractOpenCodePlanSnapshots } from '../../src/session/opencode/plan-adapter.js';
import { extractNativePlanSnapshots } from '../../src/session/native-plan/index.js';
import { planNativeTaskMirrorsShadow } from '../../src/session/native-plan/shadow.js';
import type { NormalizedSessionEvent, SessionAgent } from '../../src/session/types.js';
import { taskMirrorSnapshotDigest, taskMirrorTaskId } from '../../src/tasks/mirror-identity.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-native-plan-'));
  roots.push(rootPath);
  return {
    id: 'native-plan-project',
    name: 'native-plan-project',
    remote: 'native-plan-project',
    rootPath,
    createdAt: '2026-09-05T00:00:00.000Z',
    updatedAt: '2026-09-05T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function event(
  agent: SessionAgent,
  nativeSessionId: string,
  data: Record<string, unknown>,
  options: { id?: string; sequence?: number; timestamp?: string } = {}
): NormalizedSessionEvent {
  const sequence = options.sequence ?? 1;
  return {
    version: 1,
    id: options.id ?? `${agent}-event-${sequence}`,
    sequence,
    projectId: 'native-plan-project',
    agent,
    nativeSessionId,
    sessionId: nativeSessionId,
    type: 'tool_call',
    timestamp: options.timestamp ?? '2026-09-05T00:00:00.000Z',
    sourceEventId: options.id ?? `${agent}:source:${sequence}`,
    sourceSequence: sequence,
    data,
    provenance: {},
  };
}

function codexEvent(
  nativeSessionId: string,
  plan: Array<{ step: string; status: string }>,
  options: { id?: string; sequence?: number; timestamp?: string } = {}
): NormalizedSessionEvent {
  return event(
    'codex',
    nativeSessionId,
    {
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'update_plan',
        call_id: `call-${options.sequence ?? 1}`,
        arguments: JSON.stringify({ explanation: 'Structured Codex plan', plan }),
      },
    },
    options
  );
}

function opencodeEvent(
  nativeSessionId: string,
  todos: Array<{ content: string; status: string; priority: string }>,
  options: { id?: string; sequence?: number; timestamp?: string } = {}
): NormalizedSessionEvent {
  return event(
    'opencode',
    nativeSessionId,
    {
      partId: `part-${options.sequence ?? 1}`,
      messageId: 'message-1',
      type: 'tool',
      tool: 'todowrite',
      state: {
        input: { todos },
        metadata: { todos },
      },
    },
    options
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 42B native plan adapters', () => {
  it('parses official Codex update_plan wire shape', () => {
    const result = extractCodexPlanSnapshots([
      codexEvent('codex-thread-1', [
        { step: 'Inspect repository', status: 'completed' },
        { step: 'Implement adapter', status: 'in_progress' },
        { step: 'Run tests', status: 'pending' },
      ]),
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(result.snapshots).toHaveLength(1);
    const snapshot = result.snapshots[0]!;
    expect(snapshot.provider).toBe('codex');
    expect(snapshot.mode).toBe('full');
    expect(snapshot.items.map((item) => item.status)).toEqual([
      'completed',
      'in_progress',
      'pending',
    ]);
    expect(snapshot.currentSourceKey).toBe(snapshot.items[1]!.sourceKey);
  });

  it('keeps Codex item identity stable across reorder and status changes', () => {
    const first = extractCodexPlanSnapshots([
      codexEvent('codex-thread-1', [
        { step: 'Implement adapter', status: 'in_progress' },
        { step: 'Run tests', status: 'pending' },
      ]),
    ]).snapshots[0]!;
    const second = extractCodexPlanSnapshots([
      codexEvent(
        'codex-thread-1',
        [
          { step: 'Run tests', status: 'in_progress' },
          { step: 'Implement adapter', status: 'completed' },
        ],
        { id: 'codex-event-2', sequence: 2 }
      ),
    ]).snapshots[0]!;
    const firstByTitle = new Map(first.items.map((item) => [item.title, item.sourceKey]));
    const secondByTitle = new Map(second.items.map((item) => [item.title, item.sourceKey]));
    expect(secondByTitle.get('Implement adapter')).toBe(firstByTitle.get('Implement adapter'));
    expect(secondByTitle.get('Run tests')).toBe(firstByTitle.get('Run tests'));
  });

  it('fails closed on unsupported Codex status instead of partially importing plan', () => {
    const result = extractCodexPlanSnapshots([
      codexEvent('codex-thread-1', [{ step: 'Unsupported state', status: 'blocked' }]),
    ]);
    expect(result.snapshots).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe('CODEX_PLAN_ITEM_INVALID');
  });

  it('parses official OpenCode todowrite shape including cancelled', () => {
    const result = extractOpenCodePlanSnapshots([
      opencodeEvent('opencode-session-1', [
        { content: 'Inspect repository', status: 'completed', priority: 'high' },
        { content: 'Build provider adapter', status: 'in_progress', priority: 'high' },
        { content: 'Old optional work', status: 'cancelled', priority: 'low' },
      ]),
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(result.snapshots).toHaveLength(1);
    const snapshot = result.snapshots[0]!;
    expect(snapshot.provider).toBe('opencode');
    expect(snapshot.items.map((item) => item.status)).toEqual([
      'completed',
      'in_progress',
      'cancelled',
    ]);
    expect(snapshot.currentSourceKey).toBe(snapshot.items[1]!.sourceKey);
  });

  it('native event metadata does not change snapshot content digest', () => {
    const first = extractOpenCodePlanSnapshots([
      opencodeEvent('opencode-session-1', [
        { content: 'Build adapter', status: 'in_progress', priority: 'high' },
      ]),
    ]).snapshots[0]!;
    const replay = extractOpenCodePlanSnapshots([
      opencodeEvent(
        'opencode-session-1',
        [{ content: 'Build adapter', status: 'in_progress', priority: 'high' }],
        {
          id: 'different-native-event',
          sequence: 99,
          timestamp: '2026-09-05T02:00:00.000Z',
        }
      ),
    ]).snapshots[0]!;
    expect(taskMirrorSnapshotDigest(first)).toBe(taskMirrorSnapshotDigest(replay));
  });

  it('same native title in different sessions produces different persistent Task IDs', () => {
    const first = extractCodexPlanSnapshots([
      codexEvent('thread-a', [{ step: 'Same title', status: 'pending' }]),
    ]).snapshots[0]!;
    const second = extractCodexPlanSnapshots([
      codexEvent('thread-b', [{ step: 'Same title', status: 'pending' }]),
    ]).snapshots[0]!;
    expect(taskMirrorTaskId(first, first.items[0]!)).not.toBe(
      taskMirrorTaskId(second, second.items[0]!)
    );
  });

  it('multiple native in_progress items are preserved but never auto-selected', () => {
    const result = extractOpenCodePlanSnapshots([
      opencodeEvent('session-multiple', [
        { content: 'A', status: 'in_progress', priority: 'high' },
        { content: 'B', status: 'in_progress', priority: 'high' },
      ]),
    ]);
    expect(result.snapshots[0]?.currentSourceKey).toBeUndefined();
    expect(result.diagnostics[0]?.code).toBe('OPENCODE_MULTIPLE_IN_PROGRESS');
  });

  it('does not parse assistant prose that merely mentions update_plan or todowrite', () => {
    const fakeCodex = event('codex', 'thread-prose', {
      content: 'I will call update_plan with several tasks.',
    });
    fakeCodex.type = 'assistant_message';
    const fakeOpenCode = event('opencode', 'session-prose', {
      content: 'todowrite: create a task list',
    });
    fakeOpenCode.type = 'assistant_message';
    expect(extractNativePlanSnapshots([fakeCodex, fakeOpenCode]).snapshots).toEqual([]);
  });

  it('runs Codex and OpenCode through TaskMirrorEngine in shadow mode without writes', () => {
    const p = project();
    const store = new TaskStore(p);
    const result = planNativeTaskMirrorsShadow(p, store, [
      codexEvent('thread-shadow', [{ step: 'Codex task', status: 'in_progress' }]),
      opencodeEvent(
        'session-shadow',
        [{ content: 'OpenCode task', status: 'pending', priority: 'normal' }],
        { id: 'open-event-2', sequence: 2 }
      ),
    ]);
    expect(result.plans).toHaveLength(2);
    expect(result.plans.every((plan) => plan.mode === 'shadow')).toBe(true);
    expect(store.listTasks()).toEqual([]);
  });
});
