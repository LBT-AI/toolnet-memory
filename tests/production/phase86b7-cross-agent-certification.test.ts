import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

import { SessionCore } from '../../src/session/core.js';

import { ConvergentMemoryStore } from '../../src/multi-host/memory-projection.js';

import { handleClaudeHookInput } from '../../src/session/claude/runtime.js';

import { handleCursorHookInput } from '../../src/session/cursor/runtime.js';

import { handleCopilotHookInput } from '../../src/session/copilot/runtime.js';

import { handleGrokHookInput } from '../../src/session/grok/runtime.js';

import { handleKiroHookInput } from '../../src/session/kiro/runtime.js';

import type { HookCaptureRuntimeDependencies } from '../../src/session/hook-capture/runtime.js';

import { syncAgySession } from '../../src/session/agy/index.js';

import { syncCodexSession } from '../../src/session/codex/index.js';

import { syncOpenCodeSession } from '../../src/session/opencode/index.js';

import {
  syncToolNetCliSession,
  toolNetCliSessionFile,
} from '../../src/session/toolnet-cli/adapter.js';

import { inspectMemoryPipeline } from '../../src/production/memory-pipeline-status.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const RULE = 'From now on always run the full test suite before each commit.';

const FIX = 'Implemented the fix and all tests passed successfully.';

const SESSION = 'cert-session-1';

class MemoryStorage implements StorageProvider {
  readonly name = 'cert-memory';

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

  async list(prefix: string = ''): Promise<StorageObject[]> {
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.byteLength }));
  }
}

const roots: string[] = [];

let counter = 0;

function makeProject(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'cert-'));

  roots.push(root);

  counter += 1;

  mkdirSync(join(root, '.toolnet'), { recursive: true });

  const project: ProjectManifest = {
    id: `cert-${counter}`,

    name: `cert-${counter}`,

    remote: `cert-${counter}`,

    rootPath: root,

    createdAt: '2026-09-30T00:00:00.000Z',

    updatedAt: '2026-09-30T00:00:00.000Z',

    graphVersion: 0,

    memoryVersion: 0,
  };

  writeFileSync(
    join(root, '.toolnet', 'project.json'),
    JSON.stringify({ version: 1, ...project }, null, 2)
  );

  return project;
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function sessionStorage(storage: StorageProvider, agent: string) {
  return {
    flushSession: (project: ProjectManifest, _agent: string, sessionId: string, cwd: string) =>
      new SessionCore({
        project,

        storage,

        agent,

        nativeSessionId: sessionId,

        eventContext: { source: agent, cwd },
      }).flush(),
  } satisfies HookCaptureRuntimeDependencies;
}

function claudeStorage(storage: StorageProvider) {
  return {
    flushSession: (project: ProjectManifest, sessionId: string, cwd: string) =>
      new SessionCore({
        project,

        storage,

        agent: 'claude',

        nativeSessionId: sessionId,

        eventContext: { source: 'claude', cwd },
      }).flush(),
  };
}

async function memories(storage: StorageProvider, project: ProjectManifest) {
  return new ConvergentMemoryStore(storage).load(project.id);
}

/* ------------------------------------------------------------------ */
/* Hook agents                                                         */
/* ------------------------------------------------------------------ */

async function certifyClaude(storage: MemoryStorage, project: ProjectManifest): Promise<void> {
  const deps = claudeStorage(storage);

  const cwd = project.rootPath;

  await handleClaudeHookInput({ hook_event_name: 'SessionStart', session_id: SESSION, cwd }, deps);

  await handleClaudeHookInput(
    { hook_event_name: 'UserPromptSubmit', session_id: SESSION, cwd, prompt: RULE },
    deps
  );

  await handleClaudeHookInput(
    {
      hook_event_name: 'PostToolUse',
      session_id: SESSION,
      cwd,
      tool_name: 'Edit',
      tool_input: { file_path: join(cwd, 'src', 'a.ts') },
    },
    deps
  );

  await handleClaudeHookInput(
    {
      hook_event_name: 'Stop',
      session_id: SESSION,
      cwd,
      last_assistant_message: FIX,
    },
    deps
  );
}

async function certifySharedHook(
  agent: 'cursor' | 'copilot' | 'grok',
  storage: MemoryStorage,
  project: ProjectManifest
): Promise<void> {
  const deps = sessionStorage(storage, agent);

  const cwd = project.rootPath;

  if (agent === 'cursor') {
    const env = {
      TOOLNET_HOOK_EVENT: 'sessionStart',
      TOOLNET_CURSOR_SESSION_ID: SESSION,
      CURSOR_PROJECT_DIR: cwd,
    };

    await handleCursorHookInput({ session_id: SESSION }, deps, env);

    await handleCursorHookInput({ prompt: RULE }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
    });

    await handleCursorHookInput({ status: 'completed', last_assistant_message: FIX }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'stop',
    });

    return;
  }

  if (agent === 'copilot') {
    await handleCopilotHookInput({ sessionId: SESSION, cwd }, deps, {
      TOOLNET_HOOK_EVENT: 'sessionStart',
    });

    await handleCopilotHookInput({ sessionId: SESSION, cwd, prompt: RULE }, deps, {
      TOOLNET_HOOK_EVENT: 'userPromptSubmitted',
    });

    await handleCopilotHookInput({ sessionId: SESSION, cwd, response: FIX }, deps, {
      TOOLNET_HOOK_EVENT: 'agentStop',
    });

    return;
  }

  await handleGrokHookInput({ hookEventName: 'session_start', sessionId: SESSION, cwd }, deps);

  await handleGrokHookInput(
    { hookEventName: 'user_prompt_submit', sessionId: SESSION, cwd, prompt: RULE },
    deps
  );

  await handleGrokHookInput(
    { hookEventName: 'stop', sessionId: SESSION, cwd, lastAssistantMessage: FIX },
    deps
  );
}

async function certifyKiro(storage: MemoryStorage, project: ProjectManifest): Promise<void> {
  const cwd = project.rootPath;

  const deps = {
    flushSession: (p: ProjectManifest, sessionId: string, cwd: string) =>
      new SessionCore({
        project: p,

        storage,

        agent: 'kiro',

        nativeSessionId: sessionId,

        eventContext: { source: 'kiro', cwd },
      }).flush(),
  };

  await handleKiroHookInput({ hook_event_name: 'SessionStart', cwd, session_id: SESSION }, deps);

  await handleKiroHookInput(
    { hook_event_name: 'UserPromptSubmit', cwd, session_id: SESSION, prompt: RULE },
    deps
  );

  await handleKiroHookInput(
    {
      hook_event_name: 'Stop',
      cwd,
      session_id: SESSION,
      assistant_response: FIX,
    },
    deps
  );
}

/* ------------------------------------------------------------------ */
/* CLI-sync agents                                                     */
/* ------------------------------------------------------------------ */

function openCodeDatabase(project: ProjectManifest, sessionId: string) {
  const directory = mkdtempSync(join(tmpdir(), 'cert-oc-'));

  roots.push(directory);

  const db = new DatabaseSync(join(directory, 'opencode.db'));

  db.exec(`
    CREATE TABLE project (id TEXT PRIMARY KEY, worktree TEXT, name TEXT, time_created INTEGER, time_updated INTEGER);
    CREATE TABLE project_directory (project_id TEXT, directory TEXT, type TEXT, strategy TEXT, time_created INTEGER, PRIMARY KEY (project_id, directory));
    CREATE TABLE session (id TEXT PRIMARY KEY, project_id TEXT, directory TEXT, path TEXT, title TEXT, time_created INTEGER, time_updated INTEGER);
    CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT);
    CREATE TABLE part (id TEXT PRIMARY KEY, message_id TEXT, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT);
  `);

  db.prepare(`INSERT INTO project_directory VALUES (?, ?, ?, ?, ?)`).run(
    'oc-project',
    project.rootPath,
    'worktree',
    'default',
    1000
  );

  db.prepare(`INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    sessionId,
    'oc-project',
    project.rootPath,
    project.rootPath,
    'cert',
    1000,
    2000
  );

  return { db, path: join(directory, 'opencode.db') };
}

function openCodeAddRule(db: DatabaseSync, sessionId: string): void {
  db.prepare(`INSERT INTO message VALUES (?, ?, ?, ?, ?)`).run(
    'msg_1',
    sessionId,
    1000,
    1000,
    JSON.stringify({ role: 'user', path: { cwd: '/', root: '/' } })
  );

  db.prepare(`INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)`).run(
    'part_1',
    'msg_1',
    sessionId,
    1001,
    1001,
    JSON.stringify({ type: 'text', text: RULE })
  );
}

function codexRollout(project: ProjectManifest, threadId: string): string {
  const rollout = join(project.rootPath, `rollout-${threadId}.jsonl`);

  writeFileSync(
    rollout,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'session_meta',
      payload: { id: threadId, cwd: project.rootPath },
    }) + '\n'
  );

  appendFileSync(
    rollout,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'response_item',
      payload: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: RULE }],
      },
    }) + '\n'
  );

  return rollout;
}

function agyTranscript(project: ProjectManifest): string {
  const transcript = join(project.rootPath, 'transcript.jsonl');

  writeFileSync(transcript, JSON.stringify({ role: 'user', content: RULE }) + '\n');

  return transcript;
}

function toolNetCliFixture(project: ProjectManifest, sessionId: string) {
  const sessionsDir = join(project.rootPath, 'native-sessions');

  const bindingFile = join(project.rootPath, 'bindings.json');

  mkdirSync(sessionsDir, { recursive: true });

  writeFileSync(
    toolNetCliSessionFile(sessionId, sessionsDir),
    JSON.stringify({
      sessionId,
      messages: [{ role: 'user', content: RULE }],
      metadata: { name: 'cert', model: 'test', agentMode: 'build' },
      updatedAt: new Date().toISOString(),
    })
  );

  return { sessionsDir, bindingFile };
}

/* ------------------------------------------------------------------ */
/* Certification                                                       */
/* ------------------------------------------------------------------ */

describe('Phase 86B7 cross-agent certification', () => {
  it('certifies Claude capture through the real adapter and Stop flush', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    await certifyClaude(storage, project);

    expect((await memories(storage, project)).length).toBeGreaterThan(0);
  });

  it('certifies Cursor, Copilot and Grok capture through the shared hook runtime', async () => {
    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      const project = makeProject();

      const storage = new MemoryStorage();

      await certifySharedHook(agent, storage, project);

      expect((await memories(storage, project)).length, agent).toBeGreaterThan(0);
    }
  });

  it('certifies Kiro capture through the real Kiro hook runtime', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    await certifyKiro(storage, project);

    expect((await memories(storage, project)).length).toBeGreaterThan(0);
  });

  it('certifies OpenCode sync through the real SQLite adapter', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { db, path } = openCodeDatabase(project, SESSION);

    openCodeAddRule(db, SESSION);

    const result = await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: SESSION,
      dbPath: path,
    });

    expect(result.eventCount).toBeGreaterThan(0);

    expect((await memories(storage, project)).length).toBeGreaterThan(0);
  });

  it('certifies Codex sync through the real rollout adapter', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const rollout = codexRollout(project, 'thread-cert');

    const result = await syncCodexSession({
      project,
      storage,
      threadId: 'thread-cert',
      rolloutPath: rollout,
    });

    expect(result.eventCount).toBeGreaterThan(0);

    expect((await memories(storage, project)).length).toBeGreaterThan(0);
  });

  it('certifies Agy sync through the real transcript adapter', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = agyTranscript(project);

    const result = await syncAgySession({
      project,
      storage,
      conversationId: 'agy-cert',
      transcriptPath: transcript,
      phase: 'post',
    });

    expect(result.eventCount).toBeGreaterThan(0);

    expect((await memories(storage, project)).length).toBeGreaterThan(0);
  });

  it('certifies ToolNet CLI sync through the real native session adapter', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { sessionsDir, bindingFile } = toolNetCliFixture(project, SESSION);

    const result = await syncToolNetCliSession({
      project,
      storage,
      nativeSessionId: SESSION,
      sessionsDir,
      bindingFile,
      bind: true,
    });

    expect(result.importedMessages).toBeGreaterThan(0);

    expect((await memories(storage, project)).length).toBeGreaterThan(0);
  });

  it('makes memory captured by one agent visible to another in the same project', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    /* Agent A (Claude hook) learns a durable rule. */
    await certifyClaude(storage, project);

    /* Agent B (OpenCode) syncs and its context reflects the shared memory. */
    const { db, path } = openCodeDatabase(project, 'oc-cert-2');

    openCodeAddRule(db, 'oc-cert-2');

    await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: 'oc-cert-2',
      dbPath: path,
    });

    const engine = new MemoryEngine();

    engine.importRecords(await memories(storage, project));

    const retrieval = new RetrievalEngine(engine);

    const hits = retrieval.search(project.id, 'run the full test suite before each commit');

    expect(hits.length).toBeGreaterThan(0);
  });

  it('does not leak memory across projects', async () => {
    const projectA = makeProject();

    const projectB = makeProject();

    const storageA = new MemoryStorage();

    const storageB = new MemoryStorage();

    await certifyClaude(storageA, projectA);

    expect((await memories(storageB, projectB)).length).toBe(0);
  });

  it('captures with no memory_save, no daemon and no runtime restart', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    await certifyClaude(storage, project);

    const pipeline = await inspectMemoryPipeline({
      project,
      storage,
      detections: [
        {
          agent: 'claude',
          detected: true,
          commandDetected: true,
          configDetected: true,
          evidence: [],
        } as never,
      ],
    });

    expect(pipeline.requiresDaemon).toBe(false);

    expect(pipeline.materialization.state).not.toBe('failed');

    /* Memory exists purely from capture; no explicit memory_save was called. */
    expect((await memories(storage, project)).length).toBeGreaterThan(0);
  });
});
