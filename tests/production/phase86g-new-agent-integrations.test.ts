/*
 * Phase 86G — Gemini, Junie, Codebuff, Freebuff, and Continue integrations.
 *
 * Host binaries are not installed on the certification host, so these are
 * SOURCE_CONTRACT_CERTIFIED: the real installers, adapters, and recovery
 * entrypoints are driven with synthetic native fixtures. No claim of
 * LIVE_HOST_CERTIFIED is made here.
 *
 * PASS marker: PHASE86G_NEW_AGENT_INTEGRATIONS=PASS
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import {
  AGENT_INTEGRATION_CAPABILITIES,
  REQUIRED_HOOK_EVENTS,
} from '../../src/session/integration-capabilities.js';

import { buildIntegrationMatrix } from '../../src/session/integration-matrix.js';

import { syncGeminiSession } from '../../src/session/gemini/adapter.js';
import { installGeminiHooks } from '../../src/session/gemini/hook-installer.js';

import { syncJunieSession } from '../../src/session/junie/adapter.js';
import { installJunieHooks } from '../../src/session/junie/hook-installer.js';

import { installCodebuffMcp } from '../../src/session/codebuff/mcp-installer.js';
import { installFreebuffMcp } from '../../src/session/freebuff/mcp-installer.js';

import { syncContinueSession } from '../../src/session/continue/adapter.js';
import { recoverContinueProject } from '../../src/session/continue/recovery.js';

const MARKER = 'PHASE86G_NEW_AGENT_INTEGRATIONS=PASS';
const SESSION_ID = '4d9b6c2e-0000-4000-8000-000000000001';

class MemoryStorage implements StorageProvider {
  readonly name = 'phase86g-memory';

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
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.byteLength }));
  }
}

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function makeProject(id = 'phase86g-project'): ProjectManifest {
  const root = tempRoot('toolnet-86g-project-');
  const now = new Date().toISOString();

  return {
    id,
    name: 'Phase86G',
    remote: 'Phase86G',
    rootPath: root,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

describe('Phase 86G — registry truth for the new integrations', () => {
  it('declares Gemini and Junie as hooks, Codebuff/Freebuff as MCP-only, Continue as manual sync', () => {
    const expected = {
      gemini: ['native-lifecycle', 'hook'],
      junie: ['native-lifecycle', 'hook'],
      codebuff: ['mcp-only', 'mcp-only'],
      freebuff: ['mcp-only', 'mcp-only'],
      continue: ['native-session', 'manual-sync'],
    } as const;

    for (const [agent, [refreshMode, captureMode]] of Object.entries(expected)) {
      const capabilities = AGENT_INTEGRATION_CAPABILITIES[agent as keyof typeof expected];
      expect(capabilities.refreshMode).toBe(refreshMode);
      expect(capabilities.captureMode).toBe(captureMode);
    }

    expect(REQUIRED_HOOK_EVENTS.gemini).toEqual(['SessionStart', 'SessionEnd']);
    expect(REQUIRED_HOOK_EVENTS.junie).toEqual(['SessionStart', 'Stop', 'SessionEnd']);
    expect(REQUIRED_HOOK_EVENTS.codebuff).toEqual([]);
    expect(REQUIRED_HOOK_EVENTS.freebuff).toEqual([]);
    expect(REQUIRED_HOOK_EVENTS.continue).toEqual([]);

    const rows = buildIntegrationMatrix();
    expect(rows.find((row) => row.agent === 'gemini')?.gaClass).toBe('AUTO_NATIVE');
    expect(rows.find((row) => row.agent === 'junie')?.gaClass).toBe('AUTO_NATIVE');
    expect(rows.find((row) => row.agent === 'codebuff')?.gaClass).toBe('MCP_ONLY');
    expect(rows.find((row) => row.agent === 'freebuff')?.gaClass).toBe('MCP_ONLY');
    expect(rows.find((row) => row.agent === 'continue')?.gaClass).toBe('MANUAL_RECOVERY');
  });
});

describe('Phase 86G — Gemini CLI hook installer and transcript adapter', () => {
  it('merges its hooks into existing settings and is idempotent', () => {
    const settingsFile = join(tempRoot('toolnet-gemini-settings-'), 'settings.json');
    writeFileSync(settingsFile, JSON.stringify({ theme: 'dark', hooks: { BeforeAgent: [] } }));

    const first = installGeminiHooks({ settingsFile, binary: '/opt/toolnet-memory' });
    expect(first.changed).toBe(true);

    const afterFirst = readJson(settingsFile);
    expect(afterFirst.theme).toBe('dark');

    const hooks = afterFirst.hooks as Record<string, unknown>;
    expect(hooks.SessionStart).toBeDefined();
    expect(hooks.SessionEnd).toBeDefined();
    expect(JSON.stringify(hooks.SessionStart)).toContain('session:gemini-hook');
    expect(JSON.stringify(hooks.SessionStart)).toContain('/opt/toolnet-memory');
    expect(JSON.stringify(hooks.SessionEnd)).toContain('session:gemini-hook');

    const second = installGeminiHooks({ settingsFile, binary: '/opt/toolnet-memory' });
    expect(second.changed).toBe(false);

    const text = readFileSync(settingsFile, 'utf8');
    expect(text.match(/session:gemini-hook/g)).toHaveLength(2);
  });

  it('imports user and model turns once from a native transcript', async () => {
    const project = makeProject('gemini-project');
    const storage = new MemoryStorage();
    const transcriptPath = join(tempRoot('toolnet-gemini-transcript-'), 'session-1.json');

    writeFileSync(
      transcriptPath,
      JSON.stringify({
        messages: [
          {
            type: 'user',
            content: 'Implement Gemini session capture.',
            timestamp: '2026-10-22T09:00:00Z',
          },
          {
            type: 'gemini',
            content: [{ text: 'Capture now writes through the shared SessionCore boundary.' }],
            timestamp: '2026-10-22T09:00:01Z',
          },
          { type: 'info', content: 'progress noise' },
        ],
      })
    );

    const first = await syncGeminiSession({
      project,
      storage,
      sessionId: SESSION_ID,
      transcriptPath,
      hookEvent: 'SessionEnd',
    });

    expect(first.imported).toBe(4);
    expect(first.status).toBe('idle');
    expect(first.materialization?.status).not.toBe('failed');

    const second = await syncGeminiSession({
      project,
      storage,
      sessionId: SESSION_ID,
      transcriptPath,
      hookEvent: 'SessionEnd',
    });

    expect(second.imported).toBe(0);
  });
});

describe('Phase 86G — Junie hook installer and adapter', () => {
  it('installs project-scoped hooks without dropping existing config', () => {
    const configFile = join(tempRoot('toolnet-junie-config-'), 'config.json');
    writeFileSync(configFile, JSON.stringify({ model: 'default', hooks: { PreToolUse: [] } }));

    const result = installJunieHooks({
      configFile,
      binary: 'toolnet-memory',
      projectRoot: '/workspace/app',
    });

    expect(result.events).toEqual(['SessionStart', 'Stop', 'SessionEnd']);

    const config = readJson(configFile);
    expect(config.model).toBe('default');

    const hooks = config.hooks as Record<string, unknown>;
    for (const event of ['SessionStart', 'Stop', 'SessionEnd']) {
      const text = JSON.stringify(hooks[event]);
      expect(text).toContain('session:junie-hook');
      expect(text).toContain('/workspace/app');
    }

    const second = installJunieHooks({
      configFile,
      binary: 'toolnet-memory',
      projectRoot: '/workspace/app',
    });
    expect(second.changed).toBe(false);
  });

  it('records session start, stop message, and session end through one session', async () => {
    const project = makeProject('junie-project');
    const storage = new MemoryStorage();

    const start = await syncJunieSession({
      project,
      storage,
      sessionId: 'junie-session-1',
      event: 'SessionStart',
    });
    expect(start.imported).toBe(1);

    const stop = await syncJunieSession({
      project,
      storage,
      sessionId: 'junie-session-1',
      event: 'Stop',
      lastAssistantMessage: 'Implemented the Junie hook path and verified the tests.',
    });
    expect(stop.imported).toBe(1);

    const end = await syncJunieSession({
      project,
      storage,
      sessionId: 'junie-session-1',
      event: 'SessionEnd',
      reason: 'user_exit',
    });
    expect(end.imported).toBe(1);
    expect(end.status).toBe('idle');
  });
});

describe('Phase 86G — Codebuff and Freebuff MCP installers', () => {
  for (const [name, install] of [
    ['Codebuff', installCodebuffMcp],
    ['Freebuff', installFreebuffMcp],
  ] as const) {
    it(`${name} writes the standard .agents/mcp.json entry and preserves other servers`, () => {
      const configFile = join(tempRoot(`toolnet-${name.toLowerCase()}-mcp-`), 'mcp.json');
      writeFileSync(
        configFile,
        JSON.stringify({ mcpServers: { existing: { command: 'keep-me' } } })
      );

      const result = install({ configFile, binary: '/usr/local/bin/toolnet-memory' });
      expect(result.changed).toBe(true);

      const root = readJson(configFile);
      const servers = root.mcpServers as Record<string, unknown>;
      expect(servers.existing).toEqual({ command: 'keep-me' });
      expect(servers['toolnet-memory']).toEqual({
        command: '/usr/local/bin/toolnet-memory',
        args: ['mcp'],
      });

      const second = install({ configFile, binary: '/usr/local/bin/toolnet-memory' });
      expect(second.changed).toBe(false);
    });
  }
});

describe('Phase 86G — Continue session recovery', () => {
  it('syncs a native session file once and ignores other workspaces', async () => {
    const project = makeProject('continue-project');
    const storage = new MemoryStorage();
    const sessionsDirectory = tempRoot('toolnet-continue-sessions-');
    const previous = process.env.TOOLNET_CONTINUE_SESSIONS_DIR;
    process.env.TOOLNET_CONTINUE_SESSIONS_DIR = sessionsDirectory;

    try {
      writeFileSync(
        join(sessionsDirectory, 'mine.json'),
        JSON.stringify({
          sessionId: 'continue-session-1',
          title: 'Implement Continue sync',
          workspaceDirectory: project.rootPath,
          history: [
            { message: { role: 'user', content: 'Continue session sync.' } },
            {
              message: {
                role: 'assistant',
                content: [{ type: 'text', text: 'Imported through the shared session core.' }],
              },
            },
          ],
        })
      );

      writeFileSync(
        join(sessionsDirectory, 'other.json'),
        JSON.stringify({
          sessionId: 'continue-session-2',
          workspaceDirectory: '/somewhere/else',
          history: [{ message: { role: 'user', content: 'Other project.' } }],
        })
      );

      const results = await recoverContinueProject(project, storage, 10);
      expect(results).toHaveLength(1);
      expect(results[0]?.sessionId).toBe('continue-session-1');
      expect(results[0]?.imported).toBe(4);

      const direct = await syncContinueSession({
        project,
        storage,
        sessionFile: join(sessionsDirectory, 'mine.json'),
      });
      expect(direct.imported).toBe(0);
    } finally {
      if (previous === undefined) {
        delete process.env.TOOLNET_CONTINUE_SESSIONS_DIR;
      } else {
        process.env.TOOLNET_CONTINUE_SESSIONS_DIR = previous;
      }
    }
  });

  it('parses sessions with a flat history shape without fabricating content', async () => {
    const project = makeProject('continue-flat-project');
    const storage = new MemoryStorage();
    const sessionFile = join(tempRoot('toolnet-continue-flat-'), 'flat.json');

    writeFileSync(
      sessionFile,
      JSON.stringify({
        sessionId: 'continue-flat-1',
        workspaceDirectory: project.rootPath,
        history: [
          { role: 'user', content: 'Flat history prompt.' },
          { role: 'assistant', content: 'Flat history answer.' },
          { role: 'tool', content: 'ignored tool output' },
        ],
      })
    );

    const result = await syncContinueSession({ project, storage, sessionFile });
    expect(result.imported).toBe(4);
  });
});

describe('Phase 86G — source contract marker', () => {
  it('emits the phase marker', () => {
    expect(existsSync('src/session/gemini/adapter.ts')).toBe(true);
    console.log(MARKER);
  });
});
