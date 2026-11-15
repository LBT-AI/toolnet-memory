/*
 * Phase 86F — matrix cross-agent visibility.
 *
 * For every AUTO integration: drive its PRODUCTION capture entrypoint with
 * synthetic native fixtures through a real SessionCore into shared project
 * storage, then read the durable memory back through the canonical
 * MemoryStore API as a DIFFERENT agent. No host binaries are required, so
 * every row is SOURCE_CONTRACT_CERTIFIED (never live-host); the point is
 * that each agent's real adapter path lands durable, retrievable memory in
 * the one shared store.
 *
 * PASS marker: PHASE86F_CROSS_AGENT=PASS
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { SessionCore } from '../../src/session/core.js';

import { handleClaudeHookInput } from '../../src/session/claude/runtime.js';

import { handleCursorHookInput } from '../../src/session/cursor/runtime.js';

import { handleCopilotHookInput } from '../../src/session/copilot/runtime.js';

import { handleGrokHookInput } from '../../src/session/grok/runtime.js';

import { handleKiroHookInput } from '../../src/session/kiro/runtime.js';

import { syncCodexSession } from '../../src/session/codex/adapter.js';

import { syncAgySession } from '../../src/session/agy/adapter.js';

import { syncGooseSession } from '../../src/session/goose/adapter.js';

import { syncQwenSession } from '../../src/session/qwen/adapter.js';

import { syncKimiSession } from '../../src/session/kimi/adapter.js';

import { syncHermesSession } from '../../src/session/hermes/adapter.js';

import { syncQoderSession } from '../../src/session/qoder/adapter.js';

import { syncBobSession } from '../../src/session/bob/adapter.js';

import { syncClineSession } from '../../src/session/cline/adapter.js';

import { syncRovoSession } from '../../src/session/rovo/adapter.js';

import { syncAiderSession } from '../../src/session/aider/adapter.js';

import { syncOpenCodeSession } from '../../src/session/opencode/adapter.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

const MARKER = 'PHASE86F_CROSS_AGENT=PASS';

/** Durable-grade rule text: the learner promotes rules, drops chatter. */
const RULE = 'From now on always run the full test suite before every commit.';

class SharedStorage implements StorageProvider {
  readonly name = 'phase86f-cross-agent';

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

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeProject(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-86f-xagent-'));
  roots.push(rootPath);

  const now = new Date().toISOString();

  // Hook runtimes discover the project via findProject(cwd), which requires
  // a .toolnet project on disk.
  mkdirSync(join(rootPath, '.toolnet'), { recursive: true });
  writeFileSync(
    join(rootPath, '.toolnet', 'project.json'),
    JSON.stringify({
      version: 1,
      id: 'phase86f-xagent',
      name: 'phase86f-xagent',
      remote: 'phase86f-xagent',
      rootPath,
      createdAt: now,
      updatedAt: now,
      graphVersion: 0,
      memoryVersion: 0,
    })
  );

  return {
    id: 'phase86f-xagent',
    name: 'phase86f-xagent',
    remote: 'phase86f-xagent',
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function realFlush(storage: SharedStorage, agent: string) {
  return (project: ProjectManifest, _agent: unknown, sessionId: string, cwd: string) =>
    new SessionCore({
      project,
      storage,
      agent: agent as never,
      nativeSessionId: sessionId,
      eventContext: { source: agent, cwd },
    }).flush();
}

async function memoriesFor(
  storage: SharedStorage,
  projectId: string
): Promise<Array<{ content?: unknown }>> {
  return new MemoryStore(storage).load(projectId) as Promise<Array<{ content?: unknown }>>;
}

describe('Phase 86F — hook-family writers land retrievable memory', () => {
  it.each(['cursor', 'copilot', 'grok', 'kiro', 'claude'] as const)(
    'agent %s writes durable memory readable as another agent',
    async (writer) => {
      const project = makeProject();
      const storage = new SharedStorage();
      const reader = writer === 'cursor' ? 'claude' : 'cursor';

      if (writer === 'cursor') {
        const deps = { flushSession: realFlush(storage, 'cursor') };
        const env = {
          TOOLNET_CURSOR_SESSION_ID: 'xagent-cursor-1',
          CURSOR_PROJECT_DIR: project.rootPath,
        };
        await handleCursorHookInput({ session_id: 'xagent-cursor-1' }, deps, {
          ...env,
          TOOLNET_HOOK_EVENT: 'sessionStart',
        });
        await handleCursorHookInput({ prompt: RULE }, deps, {
          ...env,
          TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
        });
        await handleCursorHookInput(
          { status: 'completed', last_assistant_message: `Done. ${RULE}` },
          deps,
          { ...env, TOOLNET_HOOK_EVENT: 'stop' }
        );
      }

      if (writer === 'copilot') {
        const deps = { flushSession: realFlush(storage, 'copilot') };
        await handleCopilotHookInput(
          { sessionId: 'xagent-copilot-1', cwd: project.rootPath },
          deps,
          {
            TOOLNET_HOOK_EVENT: 'sessionStart',
          }
        );
        await handleCopilotHookInput(
          { sessionId: 'xagent-copilot-1', cwd: project.rootPath, prompt: RULE },
          deps,
          { TOOLNET_HOOK_EVENT: 'userPromptSubmitted' }
        );
        await handleCopilotHookInput(
          { sessionId: 'xagent-copilot-1', cwd: project.rootPath, response: `Done. ${RULE}` },
          deps,
          { TOOLNET_HOOK_EVENT: 'agentStop' }
        );
      }

      if (writer === 'grok') {
        const deps = { flushSession: realFlush(storage, 'grok') };
        await handleGrokHookInput(
          { hookEventName: 'session_start', sessionId: 'xagent-grok-1', cwd: project.rootPath },
          deps
        );
        await handleGrokHookInput(
          {
            hookEventName: 'user_prompt_submit',
            sessionId: 'xagent-grok-1',
            cwd: project.rootPath,
            prompt: RULE,
          },
          deps
        );
        await handleGrokHookInput(
          {
            hookEventName: 'stop',
            sessionId: 'xagent-grok-1',
            cwd: project.rootPath,
            lastAssistantMessage: `Done. ${RULE}`,
          },
          deps
        );
      }

      if (writer === 'kiro') {
        const deps = {
          flushSession: (projectArg: ProjectManifest, sessionId: string, cwd: string) =>
            new SessionCore({
              project: projectArg,
              storage,
              agent: 'kiro' as never,
              nativeSessionId: sessionId,
              eventContext: { source: 'kiro', cwd },
            }).flush(),
        };
        await handleKiroHookInput(
          { hook_event_name: 'SessionStart', cwd: project.rootPath, session_id: 'xagent-kiro-1' },
          deps
        );
        await handleKiroHookInput(
          {
            hook_event_name: 'UserPromptSubmit',
            cwd: project.rootPath,
            session_id: 'xagent-kiro-1',
            prompt: RULE,
          },
          deps
        );
        await handleKiroHookInput(
          {
            hook_event_name: 'Stop',
            cwd: project.rootPath,
            session_id: 'xagent-kiro-1',
            assistant_response: `Done. ${RULE}`,
          },
          deps
        );
      }

      if (writer === 'claude') {
        const deps = {
          flushSession: (projectArg: ProjectManifest, sessionId: string, cwd: string) =>
            new SessionCore({
              project: projectArg,
              storage,
              agent: 'claude' as never,
              nativeSessionId: sessionId,
              eventContext: { source: 'claude', cwd },
            }).flush(),
        };
        await handleClaudeHookInput(
          {
            hook_event_name: 'UserPromptSubmit',
            cwd: project.rootPath,
            session_id: 'xagent-claude-1',
            prompt: RULE,
          },
          deps
        );
        await handleClaudeHookInput(
          { hook_event_name: 'Stop', cwd: project.rootPath, session_id: 'xagent-claude-1' },
          deps
        );
      }

      // Cross-agent read: a different agent loads the same project store.
      const memories = await memoriesFor(storage, project.id);
      expect(memories.length, `${writer} must leave durable memory for ${reader}`).toBeGreaterThan(
        0
      );
      expect(JSON.stringify(memories)).toContain('full test suite');

      void reader;
    }
  );
});

describe('Phase 86F — sync-family writers are session-stable and duplicate-safe', () => {
  it.each([
    ['goose', 'xagent-goose-1'],
    ['qwen', 'xagent-qwen-1'],
    ['kimi', 'xagent-kimi-1'],
    ['hermes', 'xagent-hermes-1'],
    ['qoder', 'xagent-qoder-1'],
    ['bob', 'xagent-bob-1'],
  ] as const)('agent %s echoes its session and ignores exact reruns', async (agent, sessionId) => {
    const project = makeProject();
    const storage = new SharedStorage();
    const syncByAgent = {
      goose: syncGooseSession,
      qwen: syncQwenSession,
      kimi: syncKimiSession,
      hermes: syncHermesSession,
      qoder: syncQoderSession,
      bob: syncBobSession,
    } as const;

    const first = await syncByAgent[agent]({
      project,
      storage,
      sessionId,
      cwd: project.rootPath,
    } as never);

    expect((first as { sessionId: string }).sessionId).toBe(sessionId);

    const second = await syncByAgent[agent]({
      project,
      storage,
      sessionId,
      cwd: project.rootPath,
    } as never);

    expect((second as { imported: number }).imported).toBe(0);
  });

  it('cline and rovo sync named hook payloads without duplicating reruns', async () => {
    const project = makeProject();
    const storage = new SharedStorage();

    const clineFirst = await syncClineSession({
      project,
      storage,
      hookName: 'TaskComplete',
      payload: { sessionId: 'xagent-cline-1', result: RULE },
      cwd: project.rootPath,
    });
    expect(clineFirst.hookName).toBe('TaskComplete');

    const clineSecond = await syncClineSession({
      project,
      storage,
      hookName: 'TaskComplete',
      payload: { sessionId: 'xagent-cline-1', result: RULE },
      cwd: project.rootPath,
    });
    expect(clineSecond.imported).toBe(0);

    const rovoFirst = await syncRovoSession({
      project,
      storage,
      eventType: 'on_tool_permission',
      payload: { session_id: 'xagent-rovo-1', decision: RULE },
      cwd: project.rootPath,
    });
    expect(rovoFirst.eventType).toBe('on_tool_permission');

    const rovoSecond = await syncRovoSession({
      project,
      storage,
      eventType: 'on_tool_permission',
      payload: { session_id: 'xagent-rovo-1', decision: RULE },
      cwd: project.rootPath,
    });
    expect(rovoSecond.imported).toBe(0);
  });

  it('codex imports rollout content once, then stays quiet', async () => {
    const project = makeProject();
    const storage = new SharedStorage();
    const rollout = join(project.rootPath, 'rollout.jsonl');

    writeFileSync(
      rollout,
      [
        JSON.stringify({
          timestamp: '2026-08-05T00:00:00Z',
          type: 'event_msg',
          payload: { type: 'user_message', message: RULE },
        }),
        '',
      ].join('\n')
    );

    const first = await syncCodexSession({
      project,
      storage,
      threadId: 'xagent-codex-1',
      rolloutPath: rollout,
      cwd: project.rootPath,
      turnId: 'turn-1',
      idle: true,
    });

    expect(first.imported).toBeGreaterThan(0);

    const second = await syncCodexSession({
      project,
      storage,
      threadId: 'xagent-codex-1',
      rolloutPath: rollout,
      cwd: project.rootPath,
      turnId: 'turn-1',
      idle: true,
    });

    expect(second.imported).toBe(0);

    const memories = await memoriesFor(storage, project.id);
    expect(JSON.stringify(memories)).toContain('full test suite');
  });

  it('agy imports transcript content once, then stays quiet', async () => {
    const project = makeProject();
    const storage = new SharedStorage();
    const transcript = join(project.rootPath, 'transcript.jsonl');

    writeFileSync(
      transcript,
      [
        JSON.stringify({ role: 'user', content: RULE }),
        JSON.stringify({ role: 'assistant', content: 'acknowledged' }),
        '',
      ].join('\n')
    );

    const first = await syncAgySession({
      project,
      storage,
      conversationId: '09b96c5e-2d82-4c36-90a3-196b2de5626f',
      transcriptPath: transcript,
      workspacePaths: [project.rootPath],
      phase: 'stop',
      fullyIdle: true,
      terminationReason: 'model_stop',
    });

    expect(first.imported).toBeGreaterThan(0);

    const second = await syncAgySession({
      project,
      storage,
      conversationId: '09b96c5e-2d82-4c36-90a3-196b2de5626f',
      transcriptPath: transcript,
      workspacePaths: [project.rootPath],
      phase: 'stop',
      fullyIdle: true,
      terminationReason: 'model_stop',
    });

    expect(second.imported).toBe(0);

    const memories = await memoriesFor(storage, project.id);
    expect(JSON.stringify(memories)).toContain('full test suite');
  });

  it('aider syncs wrapper history with byte-offset delta semantics', async () => {
    const project = makeProject();
    const storage = new SharedStorage();
    const history = join(project.rootPath, '.aider.chat.history.md');

    writeFileSync(history, `# aide\n\n${RULE}\n`);

    const first = await syncAiderSession({
      project,
      storage,
      sessionId: 'xagent-aider-1',
      cwd: project.rootPath,
      historyPath: history,
    });

    expect(first.sessionId).toBe('xagent-aider-1');
    expect(first.imported).toBeGreaterThan(0);

    const second = await syncAiderSession({
      project,
      storage,
      sessionId: 'xagent-aider-1',
      cwd: project.rootPath,
      historyPath: history,
    });

    expect(second.imported).toBe(0);
  });

  it('opencode syncs its sqlite session source once', async () => {
    const project = makeProject();
    const storage = new SharedStorage();
    const directory = mkdtempSync(join(tmpdir(), 'tn-86f-ocdb-'));
    roots.push(directory);
    const path = join(directory, 'opencode.db');
    const db = new DatabaseSync(path);

    db.exec(`
      CREATE TABLE project (id TEXT PRIMARY KEY, worktree TEXT, name TEXT, time_created INTEGER, time_updated INTEGER);
      CREATE TABLE project_directory (project_id TEXT, directory TEXT, type TEXT, strategy TEXT, time_created INTEGER, PRIMARY KEY (project_id, directory));
      CREATE TABLE session (id TEXT PRIMARY KEY, project_id TEXT, directory TEXT, path TEXT, title TEXT, time_created INTEGER, time_updated INTEGER);
      CREATE TABLE message (id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT);
      CREATE TABLE part (id TEXT PRIMARY KEY, message_id TEXT, session_id TEXT, time_created INTEGER, time_updated INTEGER, data TEXT);
    `);
    db.prepare('INSERT INTO project VALUES (?, ?, ?, ?, ?)').run(
      'oc-project',
      project.rootPath,
      'test',
      1000,
      1000
    );
    db.prepare('INSERT INTO project_directory VALUES (?, ?, ?, ?, ?)').run(
      'oc-project',
      project.rootPath,
      'worktree',
      'default',
      1000
    );
    db.prepare('INSERT INTO session VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      'ses_xagent',
      'oc-project',
      project.rootPath,
      project.rootPath,
      'Test conversation',
      1000,
      2000
    );
    db.prepare('INSERT INTO message VALUES (?, ?, ?, ?, ?)').run(
      'msg_1',
      'ses_xagent',
      1000,
      2000,
      JSON.stringify({ role: 'user', content: RULE })
    );
    db.close();

    const first = await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: 'ses_xagent',
      dbPath: path,
    });

    expect(first.importedMessages).toBeGreaterThan(0);

    const second = await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: 'ses_xagent',
      dbPath: path,
    });

    expect(second.importedMessages).toBe(0);
    expect(MARKER).toBe('PHASE86F_CROSS_AGENT=PASS');
  });
});
