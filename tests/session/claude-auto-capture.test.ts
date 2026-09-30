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

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProjectManager } from '../../src/core/index.js';

import type { ProjectManifest } from '../../src/core/types.js';

import { handleClaudeHookInput } from '../../src/session/claude/runtime.js';

import { SessionCore } from '../../src/session/core.js';

import { reconcileSessionMemoryJournal } from '../../src/session/learner/journal.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

class MemoryStorage implements StorageProvider {
  readonly name = 'memory-test';

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

  memoryOperationKeys(): string[] {
    return [...this.objects.keys()].filter((key) => key.includes('/operations/memory/'));
  }
}

interface ClaudeTestContext {
  root: string;

  project: ProjectManifest;
}

const temporaryRoots: string[] = [];

let projectCounter = 0;

function makeContext(): ClaudeTestContext {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-claude-auto-'));

  temporaryRoots.push(root);

  const now = new Date().toISOString();

  projectCounter += 1;

  mkdirSync(join(root, '.toolnet'), { recursive: true });

  writeFileSync(
    join(root, '.toolnet', 'project.json'),
    JSON.stringify(
      {
        version: 1,

        id: `claude-auto-${projectCounter}`,

        name: `claude-auto-${projectCounter}`,

        remote: `claude-auto-${projectCounter}`,

        createdAt: now,

        updatedAt: now,
      },
      null,
      2
    )
  );

  const project = new ProjectManager().detect(root);

  return { root, project };
}

afterEach(() => {
  while (temporaryRoots.length) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

function sessionStartInput(root: string): Record<string, unknown> {
  return { hook_event_name: 'SessionStart', session_id: 'claude-session-1', cwd: root };
}

function promptInput(root: string): Record<string, unknown> {
  return {
    hook_event_name: 'UserPromptSubmit',

    session_id: 'claude-session-1',

    cwd: root,

    prompt: 'From now on always run the full test suite before every commit.',
  };
}

function postToolUseInput(root: string): Record<string, unknown> {
  return {
    hook_event_name: 'PostToolUse',

    session_id: 'claude-session-1',

    cwd: root,

    tool_name: 'Edit',

    tool_use_id: 'tool-1',

    tool_input: { file_path: 'src/auth.ts' },
  };
}

function stopInput(root: string): Record<string, unknown> {
  return {
    hook_event_name: 'Stop',

    session_id: 'claude-session-1',

    cwd: root,

    last_assistant_message: 'Implemented the fix and all tests pass now.',
  };
}

function flushWith(storage: StorageProvider) {
  return async (project: ProjectManifest, sessionId: string, cwd: string) => {
    const core = new SessionCore({
      project,

      storage,

      agent: 'claude',

      nativeSessionId: sessionId,

      eventContext: { source: 'claude', cwd },
    });

    return core.flush();
  };
}

async function memoryCount(storage: StorageProvider, projectId: string): Promise<number> {
  return (await new MemoryStore(storage).load(projectId)).length;
}

function claudeWalFile(root: string): string {
  return join(root, '.toolnet', 'runtime', 'sources', 'claude', 'claude-session-1', 'events.jsonl');
}

function readWal(root: string): Array<Record<string, unknown>> {
  const file = claudeWalFile(root);

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

function snapshotFile(file: string): string | null {
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

describe('Claude Code auto-capture', () => {
  it('T1 materializes canonical memory on Stop without memory_save', async () => {
    const { root, project } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    await handleClaudeHookInput(sessionStartInput(root), deps);

    await handleClaudeHookInput(promptInput(root), deps);

    await handleClaudeHookInput(postToolUseInput(root), deps);

    const beforeStop = await memoryCount(storage, project.id);

    expect(beforeStop).toBe(0);

    await handleClaudeHookInput(stopInput(root), deps);

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);

    expect(storage.memoryOperationKeys().length).toBeGreaterThan(0);
  });

  it('T2 does not materialize before the Stop boundary', async () => {
    const { root, project } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    const start = await handleClaudeHookInput(sessionStartInput(root), deps);

    await handleClaudeHookInput(promptInput(root), deps);

    await handleClaudeHookInput(postToolUseInput(root), deps);

    expect(start.hookSpecificOutput).toBeDefined();

    expect(await memoryCount(storage, project.id)).toBe(0);

    expect(storage.memoryOperationKeys()).toEqual([]);
  });

  it('T3 records exactly one Stop WAL event', async () => {
    const { root } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    await handleClaudeHookInput(promptInput(root), deps);

    await handleClaudeHookInput(stopInput(root), deps);

    const stops = readWal(root).filter((event) => event.type === 'session_idle');

    expect(stops).toHaveLength(1);
  });

  it('T4 duplicate Stop is idempotent (no duplicate memory)', async () => {
    const { root, project } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    await handleClaudeHookInput(promptInput(root), deps);

    await handleClaudeHookInput(stopInput(root), deps);

    const first = await memoryCount(storage, project.id);

    const firstOperations = storage.memoryOperationKeys().length;

    await handleClaudeHookInput(stopInput(root), deps);

    expect(readWal(root).filter((event) => event.type === 'session_idle')).toHaveLength(1);

    expect(await memoryCount(storage, project.id)).toBe(first);

    expect(storage.memoryOperationKeys().length).toBe(firstOperations);
  });

  it('T5 reports a truthful degraded result then retries successfully', async () => {
    const { root, project } = makeContext();

    const storage = new MemoryStorage();

    const logDiagnostic = vi.fn();

    const deps = { flushSession: flushWith(storage), logDiagnostic };

    await handleClaudeHookInput(promptInput(root), deps);

    storage.failMemoryStoreWrites = true;

    const degraded = await handleClaudeHookInput(stopInput(root), deps);

    expect(degraded).toEqual({});

    expect(logDiagnostic).toHaveBeenCalled();

    expect(String(logDiagnostic.mock.calls.at(-1)?.[0])).toContain('memory-store-save-failed');

    expect(await memoryCount(storage, project.id)).toBe(0);

    /* WAL survives the failure. */
    expect(readWal(root).filter((event) => event.type === 'session_idle')).toHaveLength(1);

    storage.failMemoryStoreWrites = false;

    await handleClaudeHookInput(stopInput(root), deps);

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);

    expect(readWal(root).filter((event) => event.type === 'session_idle')).toHaveLength(1);
  });

  it('T6 preserves SessionStart additionalContext', async () => {
    const { root } = makeContext();

    const output = await handleClaudeHookInput(sessionStartInput(root));

    const hook = output.hookSpecificOutput as Record<string, unknown> | undefined;

    expect(hook?.hookEventName).toBe('SessionStart');

    expect(typeof hook?.additionalContext).toBe('string');

    expect((hook?.additionalContext as string).length).toBeGreaterThan(0);
  });

  it('T7 preserves PostToolUse origin/file tracking', async () => {
    const { root } = makeContext();

    const output = await handleClaudeHookInput(postToolUseInput(root));

    expect(output).toEqual({});

    const originFile = join(root, '.toolnet', 'context', 'session-origin.json');

    expect(existsSync(originFile)).toBe(true);

    const origin = JSON.parse(readFileSync(originFile, 'utf8'));

    expect(origin.lastTouchedFile).toBe('src/auth.ts');

    expect(origin.agent).toBe('claude');
  });

  it('T8 preserves fast handoff refresh behavior', async () => {
    const { root } = makeContext();

    mkdirSync(join(root, '.toolnet'), { recursive: true });

    writeFileSync(
      join(root, '.toolnet', 'current.md'),
      '# Current\n\nImplement Claude auto-capture.\n'
    );

    const storage = new MemoryStorage();

    await handleClaudeHookInput(stopInput(root), { flushSession: flushWith(storage) });

    const handoff = join(root, '.toolnet', 'context', 'handoff.md');

    expect(existsSync(handoff)).toBe(true);

    expect(readFileSync(handoff, 'utf8')).toContain('Implement Claude auto-capture.');
  });

  it('T9 does not mutate TaskStore records', async () => {
    const { root } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    const taskState = join(root, '.toolnet', 'tasks', 'state.json');

    const before = snapshotFile(taskState);

    await handleClaudeHookInput(promptInput(root), deps);

    await handleClaudeHookInput(stopInput(root), deps);

    expect(snapshotFile(taskState)).toBe(before);
  });

  it('T10 keeps secrets out of WAL, journal and MemoryStore', async () => {
    const { root, project } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    const secret = 'sk-live-CLAUDESECRET1234567890';

    await handleClaudeHookInput(
      {
        hook_event_name: 'UserPromptSubmit',

        session_id: 'claude-session-1',

        cwd: root,

        prompt: `From now on always use API_KEY=${secret} for every request.`,
      },
      deps
    );

    await handleClaudeHookInput(stopInput(root), deps);

    const walText = existsSync(claudeWalFile(root))
      ? readFileSync(claudeWalFile(root), 'utf8')
      : '';

    expect(walText).not.toContain(secret);

    const storedText = Array.from(storage.objects.values())
      .map((value) => Buffer.from(value).toString('utf8'))
      .join('\n');

    expect(storedText).not.toContain(secret);

    void project;
  });

  it('T11 works without any daemon', async () => {
    const { root, project } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    await handleClaudeHookInput(promptInput(root), deps);

    await handleClaudeHookInput(stopInput(root), deps);

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('T12 restart reconcile is a no-op and creates no duplicate memory', async () => {
    const { root, project } = makeContext();

    const storage = new MemoryStorage();

    const deps = { flushSession: flushWith(storage) };

    await handleClaudeHookInput(promptInput(root), deps);

    await handleClaudeHookInput(stopInput(root), deps);

    const before = await memoryCount(storage, project.id);

    const beforeOperations = storage.memoryOperationKeys().length;

    const reconcile = await reconcileSessionMemoryJournal(project, storage);

    expect(reconcile.added).toBe(0);

    expect(await memoryCount(storage, project.id)).toBe(before);

    expect(storage.memoryOperationKeys().length).toBe(beforeOperations);
  });

  it('T13 default (production) flush path writes canonical MemoryStore on disk', async () => {
    const { root } = makeContext();

    const localRoot = mkdtempSync(join(tmpdir(), 'toolnet-claude-store-'));

    temporaryRoots.push(localRoot);

    const previous = {
      provider: process.env.MEMORY_STORAGE_PROVIDER,

      localRoot: process.env.MEMORY_LOCAL_STORAGE_PATH,
    };

    process.env.MEMORY_STORAGE_PROVIDER = 'local';

    process.env.MEMORY_LOCAL_STORAGE_PATH = localRoot;

    try {
      await handleClaudeHookInput(promptInput(root));

      await handleClaudeHookInput(stopInput(root));

      const current = walkFiles(localRoot).filter((file) =>
        file.endsWith('memory/records/current.json')
      );

      expect(current.length).toBeGreaterThan(0);

      const records = JSON.parse(readFileSync(current[0], 'utf8'));

      expect(Array.isArray(records)).toBe(true);

      expect(records.length).toBeGreaterThan(0);
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
  });

  it('detects an inactive Claude session when no project is present', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-claude-inactive-'));

    temporaryRoots.push(root);

    const output = await handleClaudeHookInput(stopInput(root));

    expect(output).toEqual({});
  });
});
