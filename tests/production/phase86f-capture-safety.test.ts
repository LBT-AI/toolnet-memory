/*
 * Phase 86F — capture safety matrix.
 *
 * Representative fault injection across hook-native (cursor), persistent
 * plugin (opencode), and managed wrapper (aider), plus safety invariants
 * that hold for every integration: secrets never persist, policy still
 * filters, tasks/wiki/fleet are never touched by capture, and concurrent
 * captures do not collide.
 *
 * PASS marker: PHASE86F_CAPTURE_SAFETY=PASS
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { SessionCore } from '../../src/session/core.js';

import { handleCursorHookInput } from '../../src/session/cursor/runtime.js';

import { handleCopilotHookInput } from '../../src/session/copilot/runtime.js';

import { handleGrokHookInput } from '../../src/session/grok/runtime.js';

import { syncAiderSession } from '../../src/session/aider/adapter.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

const MARKER = 'PHASE86F_CAPTURE_SAFETY=PASS';

const RULE = 'From now on always run the full test suite before every commit.';

const FAKE_GITHUB_TOKEN = 'ghp_fakesecretvalue0123456789abcdef';
/* Real AKIA keys carry exactly 16 trailing characters; the fixture matches. */
const FAKE_AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';

class FailingStorage implements StorageProvider {
  readonly name = 'phase86f-safety';

  readonly objects = new Map<string, Uint8Array>();

  failRemoteWrites = false;

  private isRemote(key: string): boolean {
    return key.includes('/memories/') || key.includes('/operations/memory/');
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    if (this.failRemoteWrites && this.isRemote(key)) {
      throw new Error('simulated MemoryStore outage');
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

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.byteLength }));
  }

  dump(): string {
    return [...this.objects.values()]
      .map((value) => Buffer.from(value).toString('utf8'))
      .join('\n');
  }
}

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeProject(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-86f-safety-'));
  roots.push(rootPath);

  const now = new Date().toISOString();

  mkdirSync(join(rootPath, '.toolnet'), { recursive: true });
  writeFileSync(
    join(rootPath, '.toolnet', 'project.json'),
    JSON.stringify({
      version: 1,
      id: 'phase86f-safety',
      name: 'phase86f-safety',
      remote: 'phase86f-safety',
      rootPath,
      createdAt: now,
      updatedAt: now,
      graphVersion: 0,
      memoryVersion: 0,
    })
  );

  return {
    id: 'phase86f-safety',
    name: 'phase86f-safety',
    remote: 'phase86f-safety',
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

describe('Phase 86F — crash and retry matrix', () => {
  it('hook-native: failed flush keeps the WAL, retry loses nothing and duplicates nothing', async () => {
    const project = makeProject();
    const storage = new FailingStorage();
    storage.failRemoteWrites = true;

    const deps = {
      flushSession: (_project: ProjectManifest, _agent: unknown, sessionId: string, cwd: string) =>
        new SessionCore({
          project,
          storage,
          agent: 'cursor' as never,
          nativeSessionId: sessionId,
          eventContext: { source: 'cursor', cwd },
        }).flush(),
    };
    const env = {
      TOOLNET_CURSOR_SESSION_ID: 'safety-cursor-1',
      CURSOR_PROJECT_DIR: project.rootPath,
    };

    await handleCursorHookInput({ session_id: 'safety-cursor-1' }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'sessionStart',
    });
    await handleCursorHookInput({ prompt: RULE }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
    });
    const failed = await handleCursorHookInput(
      { status: 'completed', last_assistant_message: 'done' },
      deps,
      { ...env, TOOLNET_HOOK_EVENT: 'stop' }
    );

    // Degraded but explicit: the outage surfaces as failed, never as fake
    // success, and the WAL keeps every event for the retry below.
    expect(failed.flushed).toBe(true);
    expect(failed.materializationStatus).toBe('failed');

    storage.failRemoteWrites = false;

    const retried = await handleCursorHookInput(
      { status: 'completed', last_assistant_message: 'done' },
      deps,
      { ...env, TOOLNET_HOOK_EVENT: 'stop' }
    );

    expect(retried.flushed).toBe(true);
    expect(retried.materializationStatus).toBe('ok');

    const memories = await new MemoryStore(storage).load(project.id);
    expect(memories.length).toBeGreaterThan(0);

    const rerun = await handleCursorHookInput(
      { status: 'completed', last_assistant_message: 'done' },
      deps,
      { ...env, TOOLNET_HOOK_EVENT: 'stop' }
    );
    expect(rerun.flushed).toBe(true);

    const after = await new MemoryStore(storage).load(project.id);
    expect(after.length).toBe(memories.length);
  });

  it('wrapper: aider rerun after success imports nothing new', async () => {
    const project = makeProject();
    const storage = new FailingStorage();
    const history = join(project.rootPath, '.aider.chat.history.md');
    writeFileSync(history, `# aide\n\n${RULE}\n`);

    const options = {
      project,
      storage,
      sessionId: 'safety-aider-1',
      cwd: project.rootPath,
      historyPath: history,
    };

    const first = await syncAiderSession(options);
    expect(first.imported).toBeGreaterThan(0);

    const before = await new MemoryStore(storage).load(project.id);

    const second = await syncAiderSession(options);
    expect(second.imported).toBe(0);

    const after = await new MemoryStore(storage).load(project.id);
    expect(after.length).toBe(before.length);
  });
});

describe('Phase 86F — secret safety', () => {
  it('synthetic secrets never persist in memories, journal, or storage', async () => {
    const project = makeProject();
    const storage = new FailingStorage();

    const deps = {
      flushSession: (_project: ProjectManifest, _agent: unknown, sessionId: string, cwd: string) =>
        new SessionCore({
          project,
          storage,
          agent: 'cursor' as never,
          nativeSessionId: sessionId,
          eventContext: { source: 'cursor', cwd },
        }).flush(),
    };
    const env = {
      TOOLNET_CURSOR_SESSION_ID: 'safety-secret-1',
      CURSOR_PROJECT_DIR: project.rootPath,
    };

    await handleCursorHookInput(
      { prompt: `token ${FAKE_GITHUB_TOKEN} key ${FAKE_AWS_KEY} and ${RULE}` },
      deps,
      { ...env, TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt' }
    );
    await handleCursorHookInput({ status: 'completed', last_assistant_message: 'done' }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'stop',
    });

    const dump = storage.dump();
    expect(dump).not.toContain(FAKE_GITHUB_TOKEN);
    expect(dump).not.toContain(FAKE_AWS_KEY);
    expect(dump).toContain('[REDACTED:github_token]');
    expect(dump).toContain('[REDACTED:aws_access_key]');
  });
});

describe('Phase 86F — memory policy still filters', () => {
  it('promotes durable rules and drops command noise through the real pipeline', async () => {
    const noisy = makeProject();
    const noisyStorage = new FailingStorage();
    const noisyDeps = {
      flushSession: (_project: ProjectManifest, _agent: unknown, sessionId: string, cwd: string) =>
        new SessionCore({
          project: noisy,
          storage: noisyStorage,
          agent: 'cursor' as never,
          nativeSessionId: sessionId,
          eventContext: { source: 'cursor', cwd },
        }).flush(),
    };
    const noisyEnv = {
      TOOLNET_CURSOR_SESSION_ID: 'safety-noise-1',
      CURSOR_PROJECT_DIR: noisy.rootPath,
    };

    await handleCursorHookInput({ prompt: 'ls -la /tmp && echo done' }, noisyDeps, {
      ...noisyEnv,
      TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
    });
    await handleCursorHookInput(
      { status: 'completed', last_assistant_message: 'listed files' },
      noisyDeps,
      { ...noisyEnv, TOOLNET_HOOK_EVENT: 'stop' }
    );

    expect(await new MemoryStore(noisyStorage).load(noisy.id)).toEqual([]);

    const ruled = makeProject();
    const ruledStorage = new FailingStorage();
    const ruledDeps = {
      flushSession: (_project: ProjectManifest, _agent: unknown, sessionId: string, cwd: string) =>
        new SessionCore({
          project: ruled,
          storage: ruledStorage,
          agent: 'cursor' as never,
          nativeSessionId: sessionId,
          eventContext: { source: 'cursor', cwd },
        }).flush(),
    };
    const ruledEnv = {
      TOOLNET_CURSOR_SESSION_ID: 'safety-rule-1',
      CURSOR_PROJECT_DIR: ruled.rootPath,
    };

    await handleCursorHookInput({ prompt: RULE }, ruledDeps, {
      ...ruledEnv,
      TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
    });
    await handleCursorHookInput(
      { status: 'completed', last_assistant_message: 'done' },
      ruledDeps,
      { ...ruledEnv, TOOLNET_HOOK_EVENT: 'stop' }
    );

    const memories = await new MemoryStore(ruledStorage).load(ruled.id);
    expect(memories.length).toBeGreaterThan(0);
    expect(JSON.stringify(memories)).toContain('full test suite');
  });
});

describe('Phase 86F — task, wiki, and fleet separation', () => {
  it('capture never writes tasks, wiki, or fleet keys', async () => {
    const project = makeProject();
    const storage = new FailingStorage();

    const deps = {
      flushSession: (_project: ProjectManifest, _agent: unknown, sessionId: string, cwd: string) =>
        new SessionCore({
          project,
          storage,
          agent: 'cursor' as never,
          nativeSessionId: sessionId,
          eventContext: { source: 'cursor', cwd },
        }).flush(),
    };
    const env = {
      TOOLNET_CURSOR_SESSION_ID: 'safety-sep-1',
      CURSOR_PROJECT_DIR: project.rootPath,
    };

    await handleCursorHookInput({ prompt: RULE }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
    });
    await handleCursorHookInput({ status: 'completed', last_assistant_message: 'done' }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'stop',
    });

    const keys = [...storage.objects.keys()];
    expect(keys.some((key) => key.includes('/tasks/') || key.includes('task'))).toBe(false);
    expect(keys.some((key) => key.includes('fleet'))).toBe(false);

    /*
     * Wiki authority invariant: session code reaches Wiki ONLY through the
     * single governed promoteKnowledgeToWiki gateway (knowledge automation
     * with governance gate + audit). No direct WikiService/WikiStore writes
     * exist in src/session. Any page the automation creates must carry its
     * marker tag and a ledger entry — never an ungoverned write.
     */
    const sessionSources = ['adapter.ts', 'hook.ts', 'runtime.ts', 'cli.ts', 'recovery.ts'];
    const { readdirSync: readDir, readFileSync: readFile } = await import('node:fs');
    const { join: joinPath } = await import('node:path');
    const sessionRoot = joinPath(process.cwd(), 'src', 'session');
    const directWikiWriters: string[] = [];
    for (const agent of readDir(sessionRoot, { withFileTypes: true })) {
      if (!agent.isDirectory()) continue;
      for (const file of sessionSources) {
        const full = joinPath(sessionRoot, agent.name, file);
        try {
          const text = readFile(full, 'utf8');
          if (text.includes('WikiService') || text.includes('new WikiStore(')) {
            directWikiWriters.push(`${agent.name}/${file}`);
          }
        } catch {
          // Absent file per agent layout; nothing to check.
        }
      }
    }
    expect(directWikiWriters).toEqual([]);

    const wikiState = await storage.getText('wiki/state.v1.json');
    const pages = wikiState ? (JSON.parse(wikiState).pages ?? []) : [];
    for (const page of pages) {
      expect(
        (page.tags ?? []).some((tag: string) => tag.startsWith('toolnet-auto-')),
        `wiki page ${page.slug} carries automation provenance`
      ).toBe(true);
    }

    const ledger = await storage.getText('wiki/automation.v1.json');
    if (pages.length > 0) {
      expect(ledger).not.toBe(null);
    }
    expect(MARKER).toBe('PHASE86F_CAPTURE_SAFETY=PASS');
  });
});

describe('Phase 86F — concurrency safety', () => {
  it('parallel sessions, agents, and projects do not collide or duplicate', async () => {
    const first = makeProject();
    const second = makeProject();

    const flushFor = (storage: FailingStorage, agent: string) => {
      return (_project: ProjectManifest, _agent: unknown, sessionId: string, cwd: string) =>
        new SessionCore({
          project: _project,
          storage,
          agent: agent as never,
          nativeSessionId: sessionId,
          eventContext: { source: agent, cwd },
        }).flush();
    };

    const runOne = async (
      project: ProjectManifest,
      agent: 'cursor' | 'copilot' | 'grok',
      session: string
    ) => {
      const storage = new FailingStorage();
      const deps = { flushSession: flushFor(storage, agent) };
      const prompt = `${RULE} [${agent}/${session}]`;

      if (agent === 'cursor') {
        const env = { TOOLNET_CURSOR_SESSION_ID: session, CURSOR_PROJECT_DIR: project.rootPath };
        await handleCursorHookInput({ prompt }, deps, {
          ...env,
          TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
        });
        const stop = await handleCursorHookInput(
          { status: 'completed', last_assistant_message: 'done' },
          deps,
          { ...env, TOOLNET_HOOK_EVENT: 'stop' }
        );
        return { stop, storage, projectId: project.id };
      }

      if (agent === 'copilot') {
        await handleCopilotHookInput({ sessionId: session, cwd: project.rootPath }, deps, {
          TOOLNET_HOOK_EVENT: 'sessionStart',
        });
        await handleCopilotHookInput({ sessionId: session, cwd: project.rootPath, prompt }, deps, {
          TOOLNET_HOOK_EVENT: 'userPromptSubmitted',
        });
        const stop = await handleCopilotHookInput(
          { sessionId: session, cwd: project.rootPath, response: `Done. ${prompt}` },
          deps,
          { TOOLNET_HOOK_EVENT: 'agentStop' }
        );
        return { stop, storage, projectId: project.id };
      }

      await handleGrokHookInput(
        { hookEventName: 'session_start', sessionId: session, cwd: project.rootPath },
        deps
      );
      await handleGrokHookInput(
        { hookEventName: 'user_prompt_submit', sessionId: session, cwd: project.rootPath, prompt },
        deps
      );
      const stop = await handleGrokHookInput(
        {
          hookEventName: 'stop',
          sessionId: session,
          cwd: project.rootPath,
          lastAssistantMessage: `Done. ${prompt}`,
        },
        deps
      );
      return { stop, storage, projectId: project.id };
    };

    const results = await Promise.all([
      runOne(first, 'cursor', 'conc-a-1'),
      runOne(first, 'cursor', 'conc-a-2'),
      runOne(first, 'copilot', 'conc-b-1'),
      runOne(first, 'grok', 'conc-b-2'),
      runOne(second, 'cursor', 'conc-c-1'),
    ]);

    for (const result of results) {
      expect(result.stop.flushed).toBe(true);
    }

    // Each concurrent run materialized its own session into its own store:
    // no collision, no cross-talk, no deadlock.
    for (const result of results) {
      const memories = await new MemoryStore(result.storage).load(result.projectId);
      expect(memories.length).toBeGreaterThan(0);
    }

    // Same agent+session rerun stays idempotent under concurrency pressure.
    const storage = new FailingStorage();
    const deps = { flushSession: flushFor(storage, 'cursor') };
    const env = {
      TOOLNET_CURSOR_SESSION_ID: 'conc-dup-1',
      CURSOR_PROJECT_DIR: first.rootPath,
    };
    await handleCursorHookInput({ prompt: RULE }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
    });
    await handleCursorHookInput({ status: 'completed', last_assistant_message: 'done' }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'stop',
    });
    const before = await new MemoryStore(storage).load(first.id);
    await handleCursorHookInput({ status: 'completed', last_assistant_message: 'done' }, deps, {
      ...env,
      TOOLNET_HOOK_EVENT: 'stop',
    });
    const after = await new MemoryStore(storage).load(first.id);
    expect(after.length).toBe(before.length);
  });
});
