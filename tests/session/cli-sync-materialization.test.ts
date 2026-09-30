import {
  appendFileSync,
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

import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { syncAgySession } from '../../src/session/agy/index.js';

import { syncCodexSession } from '../../src/session/codex/index.js';

import { syncOpenCodeSession } from '../../src/session/opencode/index.js';

import {
  syncToolNetCliSession,
  toolNetCliSessionFile,
} from '../../src/session/toolnet-cli/adapter.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const RULE = 'From now on always run the full test suite before every commit.';

class MemoryStorage implements StorageProvider {
  readonly name = 'cli-sync-memory-test';

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

function makeProject(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-cli-sync-'));

  temporaryRoots.push(root);

  counter += 1;

  const now = new Date().toISOString();

  return {
    id: `cli-sync-${counter}`,

    name: `cli-sync-${counter}`,

    remote: `cli-sync-${counter}`,

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

afterEach(() => {
  while (temporaryRoots.length) {
    rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

async function memoryCount(storage: StorageProvider, projectId: string): Promise<number> {
  return (await new MemoryStore(storage).load(projectId)).length;
}

function storageText(storage: MemoryStorage): string {
  return Array.from(storage.objects.values())
    .map((value) => Buffer.from(value).toString('utf8'))
    .join('\n');
}

function taskStoreSnapshot(project: ProjectManifest): string | null {
  const file = join(project.rootPath, '.toolnet', 'tasks', 'state.json');

  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

/* ------------------------------------------------------------------ */
/* OpenCode                                                            */
/* ------------------------------------------------------------------ */

function openCodeDatabase(project: ProjectManifest, sessionId: string) {
  const directory = mkdtempSync(join(tmpdir(), 'toolnet-cli-sync-oc-db-'));

  temporaryRoots.push(directory);

  const path = join(directory, 'opencode.db');

  const db = new DatabaseSync(path);

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
    'CLI sync test',
    1000,
    2000
  );

  return { db, path };
}

function openCodeAddUserRule(db: DatabaseSync, sessionId: string, id: string, clock: number): void {
  db.prepare(`INSERT INTO message VALUES (?, ?, ?, ?, ?)`).run(
    `msg_${id}`,
    sessionId,
    clock,
    clock,
    JSON.stringify({ role: 'user', path: { cwd: '/', root: '/' } })
  );

  db.prepare(`INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)`).run(
    `part_${id}`,
    `msg_${id}`,
    sessionId,
    clock + 1,
    clock + 1,
    JSON.stringify({ type: 'text', text: RULE })
  );
}

/* ------------------------------------------------------------------ */
/* Codex                                                               */
/* ------------------------------------------------------------------ */

function writeCodexMessage(rollout: string, role: string, text: string): void {
  appendFileSync(
    rollout,
    JSON.stringify({
      timestamp: new Date().toISOString(),

      type: 'response_item',

      payload: {
        type: 'message',

        role,

        content: [{ type: role === 'user' ? 'input_text' : 'output_text', text }],
      },
    }) + '\n'
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

  return rollout;
}

/* ------------------------------------------------------------------ */
/* Agy                                                                 */
/* ------------------------------------------------------------------ */

function agyTranscript(project: ProjectManifest): string {
  const transcript = join(project.rootPath, 'transcript.jsonl');

  writeFileSync(transcript, '');

  return transcript;
}

function appendAgyLine(transcript: string, role: string, content: string): void {
  appendFileSync(transcript, JSON.stringify({ role, content }) + '\n');
}

/* ------------------------------------------------------------------ */
/* ToolNet CLI                                                         */
/* ------------------------------------------------------------------ */

function toolNetCliFixture(project: ProjectManifest, sessionId: string) {
  const sessionsDir = join(project.rootPath, 'native-sessions');

  const bindingFile = join(project.rootPath, 'toolnet-cli-bindings.json');

  mkdirSync(sessionsDir, { recursive: true });

  const file = toolNetCliSessionFile(sessionId, sessionsDir);

  writeFileSync(
    file,
    JSON.stringify({
      sessionId,

      messages: [{ role: 'user', content: RULE }],

      metadata: { name: 'CLI sync test', model: 'test-model', agentMode: 'build' },

      updatedAt: new Date().toISOString(),
    })
  );

  return { sessionsDir, bindingFile, file };
}

describe('OpenCode sync materialization', () => {
  it('materializes canonical memory on a successful sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { db, path } = openCodeDatabase(project, 'ses_cli_sync');

    openCodeAddUserRule(db, 'ses_cli_sync', '1', 1100);

    db.close();

    const result = await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: 'ses_cli_sync',
      dbPath: path,
      idle: true,
    });

    expect(result.materialization).toBeDefined();

    expect(result.materialization?.status).not.toBe('failed');

    expect(result.materialization?.added).toBeGreaterThan(0);

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('is idempotent on a repeated sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { db, path } = openCodeDatabase(project, 'ses_cli_repeat');

    openCodeAddUserRule(db, 'ses_cli_repeat', '1', 1100);

    db.close();

    const options = {
      project,
      storage,
      nativeSessionId: 'ses_cli_repeat',
      dbPath: path,
      idle: true,
    } as const;

    await syncOpenCodeSession(options);

    const first = await memoryCount(storage, project.id);

    const second = await syncOpenCodeSession(options);

    expect(second.importedMessages).toBe(0);

    expect(second.importedParts).toBe(0);

    expect(second.materialization?.added).toBe(0);

    expect(await memoryCount(storage, project.id)).toBe(first);
  });

  it('reports a failed materialization and retries', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { db, path } = openCodeDatabase(project, 'ses_cli_fail');

    openCodeAddUserRule(db, 'ses_cli_fail', '1', 1100);

    db.close();

    storage.failMemoryStoreWrites = true;

    const degraded = await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: 'ses_cli_fail',
      dbPath: path,
      idle: true,
    });

    expect(degraded.materialization?.status).toBe('failed');

    expect(degraded.materialization?.errorCode).toBe('memory-store-save-failed');

    storage.failMemoryStoreWrites = false;

    const retry = await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: 'ses_cli_fail',
      dbPath: path,
      idle: true,
    });

    expect(retry.materialization?.status).not.toBe('failed');

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('keeps secrets out of storage', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { db, path } = openCodeDatabase(project, 'ses_cli_secret');

    const secret = 'sk-live-OPENCODESECRET1234567890';

    db.prepare(`INSERT INTO message VALUES (?, ?, ?, ?, ?)`).run(
      'msg_secret',
      'ses_cli_secret',
      1100,
      1100,
      JSON.stringify({ role: 'user' })
    );

    db.prepare(`INSERT INTO part VALUES (?, ?, ?, ?, ?, ?)`).run(
      'part_secret',
      'msg_secret',
      'ses_cli_secret',
      1101,
      1101,
      JSON.stringify({ type: 'text', text: `From now on always use API_KEY=${secret}` })
    );

    db.close();

    await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId: 'ses_cli_secret',
      dbPath: path,
      idle: true,
    });

    expect(storageText(storage)).not.toContain(secret);
  });
});

describe('Codex sync materialization', () => {
  it('materializes canonical memory on a successful sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const threadId = 'codex-cli-sync-thread';

    const rollout = codexRollout(project, threadId);

    writeCodexMessage(rollout, 'user', RULE);

    const result = await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,
      cwd: project.rootPath,
      turnId: 'turn-1',
      idle: true,
    });

    expect(result.materialization).toBeDefined();

    expect(result.materialization?.status).not.toBe('failed');

    expect(result.materialization?.added).toBeGreaterThan(0);

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('is idempotent on a repeated sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const threadId = 'codex-cli-repeat-thread';

    const rollout = codexRollout(project, threadId);

    writeCodexMessage(rollout, 'user', RULE);

    const options = {
      project,
      storage,
      threadId,
      rolloutPath: rollout,
      cwd: project.rootPath,
      turnId: 'turn-1',
      idle: true,
    } as const;

    await syncCodexSession(options);

    const first = await memoryCount(storage, project.id);

    const second = await syncCodexSession(options);

    expect(second.imported).toBe(0);

    expect(second.materialization?.added).toBe(0);

    expect(await memoryCount(storage, project.id)).toBe(first);
  });

  it('reports a failed materialization and retries', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const threadId = 'codex-cli-fail-thread';

    const rollout = codexRollout(project, threadId);

    writeCodexMessage(rollout, 'user', RULE);

    storage.failMemoryStoreWrites = true;

    const degraded = await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,
      cwd: project.rootPath,
      turnId: 'turn-1',
      idle: true,
    });

    expect(degraded.materialization?.status).toBe('failed');

    expect(degraded.materialization?.errorCode).toBe('memory-store-save-failed');

    storage.failMemoryStoreWrites = false;

    const retry = await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,
      cwd: project.rootPath,
      turnId: 'turn-1',
      idle: true,
    });

    expect(retry.materialization?.status).not.toBe('failed');

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('keeps secrets out of storage', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const threadId = 'codex-cli-secret-thread';

    const rollout = codexRollout(project, threadId);

    const secret = 'sk-live-CODEXSECRET1234567890';

    writeCodexMessage(rollout, 'user', `From now on always use API_KEY=${secret}`);

    await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath: rollout,
      cwd: project.rootPath,
    });

    expect(storageText(storage)).not.toContain(secret);
  });
});

describe('Agy sync materialization', () => {
  it('materializes canonical memory on a successful sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = agyTranscript(project);

    appendAgyLine(transcript, 'user', RULE);

    const result = await syncAgySession({
      project,
      storage,
      conversationId: 'agy-cli-sync',
      transcriptPath: transcript,
      workspacePaths: [project.rootPath],
      phase: 'post',
    });

    expect(result.materialization).toBeDefined();

    expect(result.materialization?.status).not.toBe('failed');

    expect(result.materialization?.added).toBeGreaterThan(0);

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('is idempotent on a repeated sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = agyTranscript(project);

    appendAgyLine(transcript, 'user', RULE);

    const options = {
      project,
      storage,
      conversationId: 'agy-cli-repeat',
      transcriptPath: transcript,
      phase: 'post',
    } as const;

    await syncAgySession(options);

    const first = await memoryCount(storage, project.id);

    const second = await syncAgySession(options);

    expect(second.imported).toBe(0);

    expect(second.materialization?.added).toBe(0);

    expect(await memoryCount(storage, project.id)).toBe(first);
  });

  it('reports a failed materialization and retries', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = agyTranscript(project);

    appendAgyLine(transcript, 'user', RULE);

    storage.failMemoryStoreWrites = true;

    const degraded = await syncAgySession({
      project,
      storage,
      conversationId: 'agy-cli-fail',
      transcriptPath: transcript,
      phase: 'post',
    });

    expect(degraded.materialization?.status).toBe('failed');

    expect(degraded.materialization?.errorCode).toBe('memory-store-save-failed');

    storage.failMemoryStoreWrites = false;

    const retry = await syncAgySession({
      project,
      storage,
      conversationId: 'agy-cli-fail',
      transcriptPath: transcript,
      phase: 'post',
    });

    expect(retry.materialization?.status).not.toBe('failed');

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('keeps secrets out of storage', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = agyTranscript(project);

    const secret = 'sk-live-AGYSECRET1234567890';

    appendAgyLine(transcript, 'user', `From now on always use API_KEY=${secret}`);

    await syncAgySession({
      project,
      storage,
      conversationId: 'agy-cli-secret',
      transcriptPath: transcript,
      phase: 'post',
    });

    expect(storageText(storage)).not.toContain(secret);
  });
});

describe('ToolNet CLI sync materialization', () => {
  it('materializes canonical memory on a successful sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { sessionsDir, bindingFile } = toolNetCliFixture(project, 'sess_cli_sync');

    const result = await syncToolNetCliSession({
      project,
      storage,
      nativeSessionId: 'sess_cli_sync',
      sessionsDir,
      bindingFile,
      bind: true,
    });

    expect(result.materialization).toBeDefined();

    expect(result.materialization?.status).not.toBe('failed');

    expect(result.materialization?.added).toBeGreaterThan(0);

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('is idempotent on a repeated sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { sessionsDir, bindingFile } = toolNetCliFixture(project, 'sess_cli_repeat');

    const options = {
      project,
      storage,
      nativeSessionId: 'sess_cli_repeat',
      sessionsDir,
      bindingFile,
    } as const;

    await syncToolNetCliSession({ ...options, bind: true });

    const first = await memoryCount(storage, project.id);

    const second = await syncToolNetCliSession(options);

    expect(second.importedMessages).toBe(0);

    expect(second.materialization?.added).toBe(0);

    expect(await memoryCount(storage, project.id)).toBe(first);
  });

  it('reports a failed materialization and retries', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { sessionsDir, bindingFile } = toolNetCliFixture(project, 'sess_cli_fail');

    storage.failMemoryStoreWrites = true;

    const degraded = await syncToolNetCliSession({
      project,
      storage,
      nativeSessionId: 'sess_cli_fail',
      sessionsDir,
      bindingFile,
      bind: true,
    });

    expect(degraded.materialization?.status).toBe('failed');

    expect(degraded.materialization?.errorCode).toBe('memory-store-save-failed');

    storage.failMemoryStoreWrites = false;

    const retry = await syncToolNetCliSession({
      project,
      storage,
      nativeSessionId: 'sess_cli_fail',
      sessionsDir,
      bindingFile,
    });

    expect(retry.materialization?.status).not.toBe('failed');

    expect(await memoryCount(storage, project.id)).toBeGreaterThan(0);
  });

  it('keeps secrets out of storage', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { sessionsDir, bindingFile, file } = toolNetCliFixture(project, 'sess_cli_secret');

    const secret = 'sk-live-TOOLNETSECRET1234567890';

    const parsed = JSON.parse(readFileSync(file, 'utf8'));

    parsed.messages = [{ role: 'user', content: `From now on always use API_KEY=${secret}` }];

    writeFileSync(file, JSON.stringify(parsed));

    await syncToolNetCliSession({
      project,
      storage,
      nativeSessionId: 'sess_cli_secret',
      sessionsDir,
      bindingFile,
      bind: true,
    });

    expect(storageText(storage)).not.toContain(secret);
  });
});

describe('CLI sync shared invariants', () => {
  it('does not mutate TaskStore during sync', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const before = taskStoreSnapshot(project);

    const transcript = agyTranscript(project);

    appendAgyLine(transcript, 'user', RULE);

    await syncAgySession({
      project,
      storage,
      conversationId: 'agy-task-check',
      transcriptPath: transcript,
      phase: 'post',
    });

    expect(taskStoreSnapshot(project)).toBe(before);
  });

  it('handles concurrent syncs without duplicate memory', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const transcript = agyTranscript(project);

    appendAgyLine(transcript, 'user', RULE);

    const options = {
      project,
      storage,
      conversationId: 'agy-concurrent',
      transcriptPath: transcript,
      phase: 'post',
    } as const;

    await Promise.all([syncAgySession(options), syncAgySession(options)]);

    expect(await memoryCount(storage, project.id)).toBe(1);
  });

  it('does not write back into the ToolNet CLI native sessions dir', async () => {
    const project = makeProject();

    const storage = new MemoryStorage();

    const { sessionsDir, bindingFile, file } = toolNetCliFixture(project, 'sess_cli_loop');

    const before = readFileSync(file, 'utf8');

    await syncToolNetCliSession({
      project,
      storage,
      nativeSessionId: 'sess_cli_loop',
      sessionsDir,
      bindingFile,
      bind: true,
    });

    /* Materialization must stay disjoint from the native session source:
     * the source file is untouched and no synthetic session appears. */
    expect(readFileSync(file, 'utf8')).toBe(before);

    expect(readdirSync(sessionsDir)).toEqual(['sess_cli_loop.json']);
  });
});
