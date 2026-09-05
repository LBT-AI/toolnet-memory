import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { SessionCore } from '../../src/session/core.js';
import { NativeTaskMirrorRuntime } from '../../src/session/native-plan/runtime.js';
import type { NormalizedSessionEvent } from '../../src/session/types.js';
import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const roots: string[] = [];

class MemoryStorage implements StorageProvider {
  readonly name = 'phase42e-memory';
  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
  }

  async get(key: string): Promise<Uint8Array | null> {
    return this.objects.get(key) ?? null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);
    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.byteLength }));
  }
}

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-live-mirror-'));
  roots.push(rootPath);
  const now = '2026-09-05T00:00:00.000Z';
  return {
    id: 'live-mirror-project',
    name: 'live-mirror-project',
    remote: 'live-mirror-project',
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function codexEvent(
  projectId: string,
  sourceEventId: string,
  sequence: number,
  plan: Array<{ step: string; status: 'pending' | 'in_progress' | 'completed' }>
): NormalizedSessionEvent {
  return {
    version: 1,
    id: `normalized-${sourceEventId}`,
    sequence,
    projectId,
    agent: 'codex',
    nativeSessionId: 'live-codex-thread',
    sessionId: 'live-codex-thread',
    type: 'tool_call',
    timestamp: new Date(Date.parse('2026-09-05T00:00:00.000Z') + sequence * 1000).toISOString(),
    sourceEventId,
    sourceSequence: sequence,
    data: {
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'update_plan',
        arguments: JSON.stringify({ plan }),
      },
    },
    provenance: {},
  };
}

function opencodeEvent(
  projectId: string,
  sourceEventId: string,
  sequence: number,
  todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: string;
  }>
): NormalizedSessionEvent {
  return {
    version: 1,
    id: `normalized-${sourceEventId}`,
    sequence,
    projectId,
    agent: 'opencode',
    nativeSessionId: 'live-opencode-session',
    sessionId: 'live-opencode-session',
    type: 'tool_call',
    timestamp: new Date(Date.parse('2026-09-05T00:00:00.000Z') + sequence * 1000).toISOString(),
    sourceEventId,
    sourceSequence: sequence,
    data: {
      type: 'tool',
      tool: 'todowrite',
      state: { input: { todos } },
    },
    provenance: {},
  };
}

afterEach(() => {
  delete process.env.TOOLNET_TASK_MIRROR;
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 42E live Task Mirror runtime', () => {
  it('automatically creates Persistent Tasks from a live Codex update_plan event', async () => {
    const p = project();
    const runtime = new NativeTaskMirrorRuntime(p);
    runtime.enqueue([
      codexEvent(p.id, 'live-1', 1, [
        { step: 'Inspect code', status: 'completed' },
        { step: 'Implement feature', status: 'in_progress' },
        { step: 'Run tests', status: 'pending' },
      ]),
    ]);
    await runtime.drain();

    const active = runtime
      .store()
      .listTasks()
      .find((task) => task.title === 'Implement feature');
    expect(active?.status).toBe('active');
    expect(active?.activeLease?.agentId).toBe('codex');
    expect(runtime.status().failedBatches).toBe(0);
    expect(runtime.status().completedBatches).toBe(1);
  });

  it('automatically mirrors an OpenCode todowrite event', async () => {
    const p = project();
    const runtime = new NativeTaskMirrorRuntime(p);
    runtime.enqueue([
      opencodeEvent(p.id, 'opencode-live-1', 1, [
        { content: 'OpenCode task', status: 'in_progress', priority: 'high' },
      ]),
    ]);
    await runtime.drain();

    const task = runtime
      .store()
      .listTasks()
      .find((item) => item.title === 'OpenCode task');
    expect(task?.status).toBe('active');
    expect(task?.activeLease?.agentId).toBe('opencode');
    expect(runtime.status().failedBatches).toBe(0);
  });

  it('serializes consecutive native plan updates in enqueue order', async () => {
    const p = project();
    const runtime = new NativeTaskMirrorRuntime(p);
    runtime.enqueue([
      codexEvent(p.id, 'serial-1', 1, [
        { step: 'Task A', status: 'in_progress' },
        { step: 'Task B', status: 'pending' },
      ]),
    ]);
    runtime.enqueue([
      codexEvent(p.id, 'serial-2', 2, [
        { step: 'Task A', status: 'completed' },
        { step: 'Task B', status: 'in_progress' },
      ]),
    ]);
    await runtime.drain();

    const tasks = runtime.store().listTasks();
    expect(tasks.find((task) => task.title === 'Task A')?.status).toBe('completed');
    expect(tasks.find((task) => task.title === 'Task B')?.status).toBe('active');
    expect(tasks.find((task) => task.title === 'Task B')?.activeLease?.agentId).toBe('codex');
    expect(runtime.status().completedBatches).toBe(2);
  });

  it('is disabled when TOOLNET_TASK_MIRROR=0', async () => {
    process.env.TOOLNET_TASK_MIRROR = '0';
    const p = project();
    const runtime = new NativeTaskMirrorRuntime(p);
    runtime.enqueue([
      codexEvent(p.id, 'disabled-1', 1, [{ step: 'Must not exist', status: 'in_progress' }]),
    ]);
    await runtime.drain();

    expect(runtime.store().listTasks()).toEqual([]);
    expect(runtime.status()).toMatchObject({ enabled: false, queuedBatches: 0 });
  });

  it('absorbs mirror failures without rejecting drain', async () => {
    const p = project();
    const runtime = new NativeTaskMirrorRuntime(p);
    runtime.enqueue([
      codexEvent('different-project', 'failure-1', 1, [
        { step: 'Cannot be mirrored', status: 'in_progress' },
      ]),
    ]);

    await expect(runtime.drain()).resolves.toBeUndefined();
    expect(runtime.status().failedBatches).toBe(1);
    expect(runtime.status().lastError).toContain('TASK_MIRROR_BINDING_PROJECT_MISMATCH');
  });

  it('mirrors through SessionCore after the durable WAL capture path', async () => {
    const p = project();
    const previous = {
      learning: process.env.TOOLNET_SESSION_LEARNING,
      continuity: process.env.TOOLNET_WORK_CONTINUITY,
      semantic: process.env.TOOLNET_SEMANTIC_CONTINUITY,
      handoff: process.env.TOOLNET_SMART_HANDOFF,
    };
    process.env.TOOLNET_SESSION_LEARNING = '0';
    process.env.TOOLNET_WORK_CONTINUITY = '0';
    process.env.TOOLNET_SEMANTIC_CONTINUITY = '0';
    process.env.TOOLNET_SMART_HANDOFF = '0';

    try {
      const core = new SessionCore({
        project: p,
        storage: new MemoryStorage(),
        agent: 'codex',
        nativeSessionId: 'session-core-live-thread',
      });
      core.record({
        type: 'tool_call',
        sourceEventId: 'session-core-plan-1',
        sourceSequence: 1,
        data: {
          type: 'response_item',
          payload: {
            type: 'function_call',
            name: 'update_plan',
            arguments: JSON.stringify({
              plan: [{ step: 'SessionCore task', status: 'in_progress' }],
            }),
          },
        },
      });

      await core.flush();

      expect(core.status().lastSequence).toBe(1);
      expect(core.taskMirrorStatus().completedBatches).toBe(1);
      expect(core.taskMirrorStatus().failedBatches).toBe(0);
      expect(core.taskMirrorStatus().enabled).toBe(true);
      expect(core.taskMirrorStatus()).toBeDefined();
      expect(
        new NativeTaskMirrorRuntime(p)
          .store()
          .listTasks()
          .some((task) => task.title === 'SessionCore task')
      ).toBe(true);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        const envKey =
          key === 'learning'
            ? 'TOOLNET_SESSION_LEARNING'
            : key === 'continuity'
              ? 'TOOLNET_WORK_CONTINUITY'
              : key === 'semantic'
                ? 'TOOLNET_SEMANTIC_CONTINUITY'
                : 'TOOLNET_SMART_HANDOFF';
        if (value === undefined) {
          delete process.env[envKey];
        } else {
          process.env[envKey] = value;
        }
      }
    }
  });

  it('ignores normal non-plan session events without creating Tasks', async () => {
    const p = project();
    const runtime = new NativeTaskMirrorRuntime(p);
    runtime.enqueue([
      {
        version: 1,
        id: 'assistant-1',
        sequence: 1,
        projectId: p.id,
        agent: 'codex',
        nativeSessionId: 'live-codex-thread',
        sessionId: 'live-codex-thread',
        type: 'assistant_message',
        timestamp: '2026-09-05T00:00:00.000Z',
        sourceEventId: 'assistant-source-1',
        sourceSequence: 1,
        data: { content: 'I should probably make a todo list.' },
        provenance: {},
      },
    ]);
    await runtime.drain();

    expect(runtime.store().listTasks()).toEqual([]);
  });
});
