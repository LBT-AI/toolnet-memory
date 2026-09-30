import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { handleCursorHookInput } from '../../src/session/cursor/runtime.js';

import type {
  HookCaptureRuntimeDependencies,
  HookCaptureRuntimeResult,
} from '../../src/session/hook-capture/runtime.js';

import { handleCopilotHookInput } from '../../src/session/copilot/runtime.js';

import { handleGrokHookInput } from '../../src/session/grok/runtime.js';

import {
  handleKiroHookInput,
  type KiroRuntimeDependencies,
} from '../../src/session/kiro/runtime.js';

import { SessionCore } from '../../src/session/core.js';

import { reconcileSessionMemoryJournal } from '../../src/session/learner/journal.js';

import type { SessionFlushResult } from '../../src/session/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const SESSION_ID = 'hook-agent-1';

const RULE_PROMPT = 'From now on always run the full test suite before every commit.';

const FIX_MESSAGE = 'Implemented the fix and all tests passed successfully.';

class MemoryStorage implements StorageProvider {
  readonly name = 'hook-agent-memory-test';

  readonly objects = new Map<string, Uint8Array>();

  failMemoryStoreWrites = false;

  async put(key: string, data: string | Uint8Array): Promise<void> {
    if (
      this.failMemoryStoreWrites &&
      (key.endsWith('/memories/current.json') || key.includes('/operations/memory/'))
    ) {
      throw new Error('simulated memory store failure');
    }

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

  async list(prefix: string = ''): Promise<StorageObject[]> {
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.byteLength }));
  }
}

const temporaryRoots: string[] = [];

let counter = 0;

function createProjectRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-hook-agent-'));

  temporaryRoots.push(root);

  counter += 1;

  mkdirSync(join(root, '.toolnet'), { recursive: true });

  writeFileSync(
    join(root, '.toolnet', 'project.json'),
    JSON.stringify(
      {
        version: 1,

        id: `hook-agent-${counter}`,

        name: `hook-agent-${counter}`,

        remote: `hook-agent-${counter}`,

        createdAt: '2026-08-24T00:00:00.000Z',

        updatedAt: '2026-08-24T00:00:00.000Z',

        graphVersion: 0,

        memoryVersion: 0,
      },
      null,
      2
    )
  );

  return root;
}

afterEach(() => {
  while (temporaryRoots.length) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const output: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);

    if (entry.isDirectory()) {
      output.push(...walkFiles(full));
    } else {
      output.push(full);
    }
  }

  return output;
}

function memoryRecordFiles(localRoot: string): string[] {
  return walkFiles(localRoot).filter((file) => file.endsWith('memory/records/current.json'));
}

function memoryRecordCount(localRoot: string): number {
  const files = memoryRecordFiles(localRoot);

  if (files.length === 0) {
    return 0;
  }

  const records = JSON.parse(readFileSync(files[0], 'utf8')) as unknown[];

  return records.length;
}

async function withLocalStorage<T>(run: (localRoot: string) => Promise<T>): Promise<T> {
  const localRoot = mkdtempSync(join(tmpdir(), 'toolnet-hook-agent-store-'));

  temporaryRoots.push(localRoot);

  const previous = {
    provider: process.env.MEMORY_STORAGE_PROVIDER,

    localRoot: process.env.MEMORY_LOCAL_STORAGE_PATH,
  };

  process.env.MEMORY_STORAGE_PROVIDER = 'local';

  process.env.MEMORY_LOCAL_STORAGE_PATH = localRoot;

  try {
    return await run(localRoot);
  } finally {
    if (previous.provider === undefined) {
      delete process.env.MEMORY_STORAGE_PROVIDER;
    } else {
      process.env.MEMORY_STORAGE_PROVIDER = previous.provider;
    }

    if (previous.localRoot === undefined) {
      delete process.env.MEMORY_LOCAL_STORAGE_PATH;
    } else {
      process.env.MEMORY_LOCAL_STORAGE_PATH = previous.localRoot;
    }
  }
}

function readWal(file: string): Array<Record<string, unknown>> {
  if (!existsSync(file)) {
    return [];
  }

  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
}

function sharedWalFile(agent: string, root: string): string {
  return join(root, '.toolnet', 'runtime', 'sources', agent, SESSION_ID, 'events.jsonl');
}

function sharedFlush(
  storage: StorageProvider
): NonNullable<HookCaptureRuntimeDependencies['flushSession']> {
  return (project: ProjectManifest, agent, sessionId, cwd) =>
    new SessionCore({
      project,

      storage,

      agent,

      nativeSessionId: sessionId,

      eventContext: { source: agent, cwd },
    }).flush();
}

function kiroFlush(storage: StorageProvider): NonNullable<KiroRuntimeDependencies['flushSession']> {
  return (project: ProjectManifest, sessionId, cwd) =>
    new SessionCore({
      project,

      storage,

      agent: 'kiro',

      nativeSessionId: sessionId,

      eventContext: { source: 'kiro', cwd },
    }).flush();
}

function fakeFlushResult(calls: { count: number }): SessionFlushResult {
  calls.count += 1;

  return {
    uploadedEvents: 0,

    lastRemoteSequence: 0,

    eventCount: 0,

    chunkCount: 0,

    status: 'idle',

    materialization: {
      status: 'ok',

      batchesScanned: 1,

      candidates: 1,

      added: 1,

      duplicates: 0,

      memories: 1,

      evidenceUpdated: 0,

      operationId: 'test-operation',

      durationMs: 1,
    },
  };
}

interface SharedAgent {
  name: 'cursor' | 'copilot' | 'grok';

  run: (
    event: 'start' | 'tool' | 'stop',
    deps: HookCaptureRuntimeDependencies,
    root: string
  ) => Promise<HookCaptureRuntimeResult>;
}

const sharedAgents: SharedAgent[] = [
  {
    name: 'cursor',

    run: async (event, deps, root) => {
      const env = {
        TOOLNET_HOOK_EVENT: 'sessionStart',

        TOOLNET_CURSOR_SESSION_ID: SESSION_ID,

        CURSOR_PROJECT_DIR: root,
      };

      if (event === 'start') {
        return handleCursorHookInput({ session_id: SESSION_ID }, deps, env);
      }

      if (event === 'tool') {
        return handleCursorHookInput(
          { tool_name: 'write', tool_input: { path: join(root, 'src', 'a.ts') } },
          deps,
          { ...env, TOOLNET_HOOK_EVENT: 'postToolUse' }
        );
      }

      return handleCursorHookInput(
        { status: 'completed', last_assistant_message: FIX_MESSAGE },
        deps,
        { ...env, TOOLNET_HOOK_EVENT: 'stop' }
      );
    },
  },
  {
    name: 'copilot',

    run: async (event, deps, root) => {
      if (event === 'start') {
        return handleCopilotHookInput({ sessionId: SESSION_ID, cwd: root }, deps, {
          TOOLNET_HOOK_EVENT: 'sessionStart',
        });
      }

      if (event === 'tool') {
        return handleCopilotHookInput(
          {
            sessionId: SESSION_ID,

            cwd: root,

            toolName: 'edit',

            toolArgs: { file_path: join(root, 'src', 'a.ts') },

            toolResult: { resultType: 'success' },
          },
          deps,
          { TOOLNET_HOOK_EVENT: 'postToolUse' }
        );
      }

      return handleCopilotHookInput(
        { sessionId: SESSION_ID, cwd: root, response: FIX_MESSAGE },
        deps,
        { TOOLNET_HOOK_EVENT: 'agentStop' }
      );
    },
  },
  {
    name: 'grok',

    run: async (event, deps, root) => {
      if (event === 'start') {
        return handleGrokHookInput(
          { hookEventName: 'session_start', sessionId: SESSION_ID, cwd: root },
          deps
        );
      }

      if (event === 'tool') {
        return handleGrokHookInput(
          {
            hookEventName: 'post_tool_use',

            sessionId: SESSION_ID,

            cwd: root,

            toolName: 'write',

            toolInput: { file_path: join(root, 'src', 'a.ts') },
          },
          deps
        );
      }

      return handleGrokHookInput(
        {
          hookEventName: 'stop',

          sessionId: SESSION_ID,

          cwd: root,

          lastAssistantMessage: FIX_MESSAGE,
        },
        deps
      );
    },
  },
];

async function sendPrompt(agent: SharedAgent, deps: HookCaptureRuntimeDependencies, root: string) {
  if (agent.name === 'cursor') {
    return handleCursorHookInput({ prompt: RULE_PROMPT }, deps, {
      TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',

      TOOLNET_CURSOR_SESSION_ID: SESSION_ID,

      CURSOR_PROJECT_DIR: root,
    });
  }

  if (agent.name === 'copilot') {
    return handleCopilotHookInput({ sessionId: SESSION_ID, cwd: root, prompt: RULE_PROMPT }, deps, {
      TOOLNET_HOOK_EVENT: 'userPromptSubmitted',
    });
  }

  return handleGrokHookInput(
    { hookEventName: 'user_prompt_submit', sessionId: SESSION_ID, cwd: root, prompt: RULE_PROMPT },
    deps
  );
}

function kiroRun(
  event: 'start' | 'tool' | 'stop',
  deps: KiroRuntimeDependencies,
  root: string
): Promise<HookCaptureRuntimeResult> {
  if (event === 'start') {
    return handleKiroHookInput(
      { hook_event_name: 'SessionStart', cwd: root, session_id: SESSION_ID },
      deps
    );
  }

  if (event === 'tool') {
    return handleKiroHookInput(
      {
        hook_event_name: 'PostToolUse',

        cwd: root,

        session_id: SESSION_ID,

        tool_name: 'fs_write',

        tool_input: { path: join(root, 'src', 'index.ts') },

        tool_response: { success: true },
      },
      deps
    );
  }

  return handleKiroHookInput(
    {
      hook_event_name: 'Stop',

      cwd: root,

      session_id: SESSION_ID,

      assistant_response: FIX_MESSAGE,
    },
    deps
  );
}

async function kiroPrompt(deps: KiroRuntimeDependencies, root: string) {
  return handleKiroHookInput(
    {
      hook_event_name: 'UserPromptSubmit',

      cwd: root,

      session_id: SESSION_ID,

      prompt: RULE_PROMPT,
    },
    deps
  );
}

for (const agent of sharedAgents) {
  describe(`${agent.name} hook-agent materialization`, () => {
    it('materializes canonical MemoryStore on Stop without a daemon or restart', async () => {
      const root = createProjectRoot();

      await withLocalStorage(async (localRoot) => {
        await agent.run('start', {}, root);

        await sendPrompt(agent, {}, root);

        const stop = await agent.run('stop', {}, root);

        expect(stop.flushed).toBe(true);

        expect(stop.materialized).toBe(true);

        expect(memoryRecordCount(localRoot)).toBeGreaterThan(0);
      });
    });

    it('does not materialize before the Stop boundary', async () => {
      const root = createProjectRoot();

      await withLocalStorage(async (localRoot) => {
        await agent.run('start', {}, root);

        await agent.run('tool', {}, root);

        expect(memoryRecordCount(localRoot)).toBe(0);
      });
    });

    it('invokes exactly one flush per Stop and reports materialized', async () => {
      const root = createProjectRoot();

      const calls = { count: 0 };

      const deps: HookCaptureRuntimeDependencies = {
        flushSession: async () => fakeFlushResult(calls),
      };

      await agent.run('start', deps, root);

      expect(calls.count).toBe(0);

      const stop = await agent.run('stop', deps, root);

      expect(calls.count).toBe(1);

      expect(stop.flushed).toBe(true);

      expect(stop.materialized).toBe(true);

      expect(stop.materializationStatus).toBe('ok');
    });

    it('is idempotent for a duplicate Stop', async () => {
      const root = createProjectRoot();

      await withLocalStorage(async (localRoot) => {
        await sendPrompt(agent, {}, root);

        await agent.run('stop', {}, root);

        const firstRecords = memoryRecordCount(localRoot);

        await agent.run('stop', {}, root);

        expect(memoryRecordCount(localRoot)).toBe(firstRecords);

        expect(
          readWal(sharedWalFile(agent.name, root)).filter((e) => e.type === 'session_idle')
        ).toHaveLength(1);
      });
    });

    it('reports a failed materialization truthfully and retries without duplicates', async () => {
      const root = createProjectRoot();

      const storage = new MemoryStorage();

      const deps: HookCaptureRuntimeDependencies = { flushSession: sharedFlush(storage) };

      await sendPrompt(agent, deps, root);

      storage.failMemoryStoreWrites = true;

      const degraded = await agent.run('stop', deps, root);

      expect(degraded.flushed).toBe(true);

      expect(degraded.materialized).toBe(false);

      expect(degraded.materializationStatus).toBe('failed');

      expect(degraded.materializationErrorCode).toBe('memory-store-save-failed');

      storage.failMemoryStoreWrites = false;

      const retry = await agent.run('stop', deps, root);

      expect(retry.materialized).toBe(true);

      const currentKeys = [...storage.objects.keys()].filter((key) =>
        key.endsWith('/memories/current.json')
      );

      expect(currentKeys.length).toBe(1);

      expect(
        (
          JSON.parse(
            Buffer.from(storage.objects.get(currentKeys[0])!).toString('utf8')
          ) as unknown[]
        ).length
      ).toBeGreaterThan(0);
    });
  });
}

describe('Kiro hook-agent materialization', () => {
  it('materializes canonical MemoryStore on Stop without a daemon or restart', async () => {
    const root = createProjectRoot();

    await withLocalStorage(async (localRoot) => {
      await kiroRun('start', {}, root);

      await kiroPrompt({}, root);

      const stop = await kiroRun('stop', {}, root);

      expect(stop.flushed).toBe(true);

      expect(stop.materialized).toBe(true);

      expect(memoryRecordCount(localRoot)).toBeGreaterThan(0);
    });
  });

  it('does not materialize before the Stop boundary', async () => {
    const root = createProjectRoot();

    await withLocalStorage(async (localRoot) => {
      await kiroRun('start', {}, root);

      await kiroRun('tool', {}, root);

      expect(memoryRecordCount(localRoot)).toBe(0);
    });
  });

  it('invokes exactly one flush per Stop and reports materialized', async () => {
    const root = createProjectRoot();

    const calls = { count: 0 };

    const deps: KiroRuntimeDependencies = {
      flushSession: async () => fakeFlushResult(calls),
    };

    await kiroRun('start', deps, root);

    expect(calls.count).toBe(0);

    const stop = await kiroRun('stop', deps, root);

    expect(calls.count).toBe(1);

    expect(stop.materialized).toBe(true);

    expect(stop.materializationStatus).toBe('ok');
  });

  it('is idempotent for a duplicate Stop', async () => {
    const root = createProjectRoot();

    await withLocalStorage(async (localRoot) => {
      await kiroPrompt({}, root);

      await kiroRun('stop', {}, root);

      const firstRecords = memoryRecordCount(localRoot);

      await kiroRun('stop', {}, root);

      expect(memoryRecordCount(localRoot)).toBe(firstRecords);
    });
  });

  it('reports a failed materialization truthfully and retries without duplicates', async () => {
    const root = createProjectRoot();

    const storage = new MemoryStorage();

    const deps: KiroRuntimeDependencies = { flushSession: kiroFlush(storage) };

    await kiroPrompt(deps, root);

    storage.failMemoryStoreWrites = true;

    const degraded = await kiroRun('stop', deps, root);

    expect(degraded.materialized).toBe(false);

    expect(degraded.materializationErrorCode).toBe('memory-store-save-failed');

    storage.failMemoryStoreWrites = false;

    const retry = await kiroRun('stop', deps, root);

    expect(retry.materialized).toBe(true);
  });
});

describe('shared hook-agent safety', () => {
  const cursor = sharedAgents[0];

  it('keeps secrets out of WAL, journal and MemoryStore', async () => {
    const root = createProjectRoot();

    const secret = 'sk-live-HOOKSECRET1234567890';

    await withLocalStorage(async (localRoot) => {
      await handleCursorHookInput(
        { prompt: `From now on always use API_KEY=${secret} for every request.` },
        {},
        {
          TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',

          TOOLNET_CURSOR_SESSION_ID: SESSION_ID,

          CURSOR_PROJECT_DIR: root,
        }
      );

      await cursor.run('stop', {}, root);

      const wal = readFileSync(sharedWalFile('cursor', root), 'utf8');

      expect(wal).not.toContain(secret);

      const stored = walkFiles(localRoot)
        .map((file) => readFileSync(file, 'utf8'))
        .join('\n');

      expect(stored).not.toContain(secret);
    });
  });

  it('does not mutate TaskStore records on Stop', async () => {
    const root = createProjectRoot();

    const taskState = join(root, '.toolnet', 'tasks', 'state.json');

    const before = existsSync(taskState) ? readFileSync(taskState, 'utf8') : null;

    await withLocalStorage(async () => {
      await sendPrompt(cursor, {}, root);

      await cursor.run('stop', {}, root);
    });

    const after = existsSync(taskState) ? readFileSync(taskState, 'utf8') : null;

    expect(after).toBe(before);
  });

  it('refreshes fast handoff on Stop when current work exists', async () => {
    const root = createProjectRoot();

    writeFileSync(
      join(root, '.toolnet', 'current.md'),
      '# Current\n\nImplement hook-agent materialization.\n'
    );

    await withLocalStorage(async () => {
      await cursor.run('stop', {}, root);
    });

    const handoff = join(root, '.toolnet', 'context', 'handoff.md');

    expect(existsSync(handoff)).toBe(true);

    expect(readFileSync(handoff, 'utf8')).toContain('Implement hook-agent materialization.');
  });

  it('startup reconcile after Stop is a no-op with no duplicate memory', async () => {
    const root = createProjectRoot();

    const storage = new MemoryStorage();

    const deps: HookCaptureRuntimeDependencies = { flushSession: sharedFlush(storage) };

    await sendPrompt(cursor, deps, root);

    await cursor.run('stop', deps, root);

    const memories = await storage.list('projects/');

    const operationsBefore = memories.filter((item) =>
      item.key.includes('/operations/memory/')
    ).length;

    const project = {
      id: 'hook-agent-1',

      name: 'hook-agent',

      remote: 'hook-agent',

      rootPath: root,

      createdAt: '',

      updatedAt: '',

      graphVersion: 0,

      memoryVersion: 0,
    } as ProjectManifest;

    const reconcile = await reconcileSessionMemoryJournal(project, storage);

    expect(reconcile.added).toBe(0);

    const operationsAfter = (await storage.list('projects/')).filter((item) =>
      item.key.includes('/operations/memory/')
    ).length;

    expect(operationsAfter).toBe(operationsBefore);
  });

  it('preserves SessionStart and PostToolUse capture', async () => {
    const root = createProjectRoot();

    const start = await cursor.run('start', {}, root);

    expect(start.active).toBe(true);

    expect(start.flushed).toBe(false);

    const tool = await cursor.run('tool', {}, root);

    expect(tool.active).toBe(true);

    expect(tool.flushed).toBe(false);

    const wal = readWal(sharedWalFile('cursor', root));

    expect(wal.some((event) => event.type === 'session_start')).toBe(true);

    expect(wal.some((event) => event.type === 'file_write')).toBe(true);
  });

  it('works without an initialized project (inactive)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-hook-agent-outside-'));

    temporaryRoots.push(root);

    const result = await cursor.run('stop', {}, root);

    expect(result).toEqual({ active: false, captured: 0, flushed: false });
  });
});
