import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ProjectManager } from '../../src/core/index.js';

import {
  AGENT_INTEGRATION_CAPABILITIES,
  SUPPORTED_INTEGRATION_AGENTS,
  integrationCaptureModeFor,
  requiredHookEventsFor,
} from '../../src/session/integration-capabilities.js';

import { PIPELINE_AGENTS } from '../../src/production/memory-pipeline-status.js';

import { installClaudeIntegration } from '../../src/session/claude/installer.js';

import { handleClaudeHookInput } from '../../src/session/claude/runtime.js';

import { createSessionIdentity } from '../../src/session/identity.js';

import { SessionWal } from '../../src/session/wal.js';

import { syncOpenCodeSession } from '../../src/session/opencode/index.js';

import {
  syncToolNetCliSession,
  toolNetCliSessionFile,
} from '../../src/session/toolnet-cli/adapter.js';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const roots: string[] = [];

let counter = 0;

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));

  roots.push(root);

  return root;
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function writeJson(file: string, value: unknown): void {
  mkdirSync(join(file, '..'), { recursive: true });

  writeFileSync(file, JSON.stringify(value, null, 2));
}

function makeProject(root: string): ProjectManifest {
  counter += 1;

  mkdirSync(join(root, '.git'), { recursive: true });

  mkdirSync(join(root, '.toolnet'), { recursive: true });

  const now = '2026-09-30T00:00:00.000Z';

  const project: ProjectManifest = {
    id: `int-${counter}`,

    name: `int-${counter}`,

    remote: `int-${counter}`,

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };

  writeFileSync(
    join(root, '.toolnet', 'project.json'),
    JSON.stringify({ version: 1, ...project }, null, 2)
  );

  return project;
}

class MemoryStorage implements StorageProvider {
  readonly name = 'integration-hardening';

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

function claudeFiles() {
  const root = tempRoot('int-claude-');

  return {
    settingsFile: join(root, 'settings.json'),

    stateFile: join(root, '.claude.json'),
  };
}

function toolnetHookCount(settingsFile: string): number {
  const text = readFileSync(settingsFile, 'utf8');

  return text.split('session:claude-hook').length - 1;
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

describe('integration registry', () => {
  it('is the single source of supported agents and capture modes', () => {
    expect(SUPPORTED_INTEGRATION_AGENTS).toEqual([
      'claude',
      'cursor',
      'copilot',
      'grok',
      'kiro',
      'opencode',
      'codex',
      'agy',
      'toolnet-cli',
      'kilo',
      'goose',
      'qwen',
      'kimi',
      'hermes',
      'qoder',
      'aider',
      'plandex',
      'openrouter',
      'bob',
    ]);

    for (const spec of PIPELINE_AGENTS) {
      expect(integrationCaptureModeFor(spec.agent), spec.agent).toBe(spec.captureMode);
    }
  });

  it('declares required hook events for hook agents only', () => {
    for (const agent of ['claude', 'cursor', 'copilot', 'grok', 'kiro'] as const) {
      expect(requiredHookEventsFor(agent).length, agent).toBeGreaterThan(0);
    }

    for (const agent of ['toolnet-cli', 'aider', 'plandex', 'openrouter'] as const) {
      expect(requiredHookEventsFor(agent).length, agent).toEqual(0);
    }

    for (const agent of [
      'opencode',
      'codex',
      'agy',
      'goose',
      'qwen',
      'kimi',
      'hermes',
      'qoder',
    ] as const) {
      expect(requiredHookEventsFor(agent).length, agent).toBeGreaterThan(0);
    }

    expect(AGENT_INTEGRATION_CAPABILITIES.claude.captureMode).toBe('hook');
    expect(AGENT_INTEGRATION_CAPABILITIES['toolnet-cli'].captureMode).toBe('manual-sync');
  });
});

/* ------------------------------------------------------------------ */
/* Config safety                                                       */
/* ------------------------------------------------------------------ */

describe('configuration safety', () => {
  it('installs cleanly and is idempotent on the second run', () => {
    const { settingsFile, stateFile } = claudeFiles();

    const first = installClaudeIntegration({
      binary: 'toolnet-memory',
      settingsFile,
      stateFile,
    });

    expect(first.hooks.changed).toBe(true);

    expect(first.mcp.changed).toBe(true);

    expect(toolnetHookCount(settingsFile)).toBe(4);

    const second = installClaudeIntegration({ binary: 'toolnet-memory', settingsFile, stateFile });

    expect(second.hooks.changed).toBe(false);

    expect(second.mcp.changed).toBe(false);

    expect(toolnetHookCount(settingsFile)).toBe(4);
  });

  it('preserves unrelated user config, other MCP servers and custom hooks', () => {
    const { settingsFile, stateFile } = claudeFiles();

    writeJson(settingsFile, {
      theme: 'dark',

      model: 'opus',

      permissions: { allow: ['Bash'] },

      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'my-custom-stop' }] }],
      },
    });

    writeJson(stateFile, {
      mcpServers: { github: { type: 'stdio', command: 'gh-mcp', args: ['serve'] } },
    });

    installClaudeIntegration({ binary: 'toolnet-memory', settingsFile, stateFile });

    const settings = readJson(settingsFile);

    const servers = asRecord(readJson(stateFile).mcpServers);

    expect(settings.theme).toBe('dark');

    expect(settings.model).toBe('opus');

    expect(settings.permissions).toEqual({ allow: ['Bash'] });

    expect(JSON.stringify(settings)).toContain('my-custom-stop');

    expect(toolnetHookCount(settingsFile)).toBe(4);

    expect(servers.github).toEqual({ type: 'stdio', command: 'gh-mcp', args: ['serve'] });

    expect(servers['toolnet-memory']).toBeDefined();
  });

  it('preserves unknown/future config fields round-trip', () => {
    const { settingsFile, stateFile } = claudeFiles();

    writeJson(settingsFile, { hooks: {}, experimentalFutureField: { nested: true } });

    installClaudeIntegration({ binary: 'toolnet-memory', settingsFile, stateFile });

    expect(readJson(settingsFile).experimentalFutureField).toEqual({ nested: true });
  });

  it('refuses to overwrite a malformed user config', () => {
    const { settingsFile, stateFile } = claudeFiles();

    const malformed = '{ this is not json';

    writeFileSync(settingsFile, malformed);

    expect(() =>
      installClaudeIntegration({ binary: 'toolnet-memory', settingsFile, stateFile })
    ).toThrow(/Invalid existing Claude settings/);

    expect(readFileSync(settingsFile, 'utf8')).toBe(malformed);
  });

  it('repairs a stale ToolNet binary path without touching custom hooks', () => {
    const { settingsFile, stateFile } = claudeFiles();

    writeJson(settingsFile, {
      hooks: {
        Stop: [
          { hooks: [{ type: 'command', command: 'old-toolnet session:claude-hook' }] },
          { hooks: [{ type: 'command', command: 'keep-me' }] },
        ],
      },
    });

    writeJson(stateFile, {
      mcpServers: { 'toolnet-memory': { type: 'stdio', command: 'old-toolnet', args: ['mcp'] } },
    });

    installClaudeIntegration({ binary: '/opt/toolnet-memory/bin', settingsFile, stateFile });

    const settings = readJson(settingsFile);

    const servers = asRecord(readJson(stateFile).mcpServers);

    expect(JSON.stringify(settings)).toContain('/opt/toolnet-memory/bin session:claude-hook');

    expect(JSON.stringify(settings)).not.toContain('old-toolnet session:claude-hook');

    expect(JSON.stringify(settings)).toContain('keep-me');

    expect(asRecord(servers['toolnet-memory']).command).toBe('/opt/toolnet-memory/bin');
  });

  it('converges duplicate ToolNet hook groups to one per event', () => {
    const { settingsFile, stateFile } = claudeFiles();

    writeJson(settingsFile, {
      hooks: {
        Stop: [
          { hooks: [{ type: 'command', command: 'toolnet-memory session:claude-hook' }] },
          { hooks: [{ type: 'command', command: 'toolnet-memory session:claude-hook' }] },
        ],
      },
    });

    installClaudeIntegration({ binary: 'toolnet-memory', settingsFile, stateFile });

    const hooks = asRecord(readJson(settingsFile).hooks);

    const stopHandlers = (hooks.Stop as Array<{ hooks: unknown[] }>).flatMap(
      (group) => group.hooks
    );

    expect(stopHandlers).toHaveLength(1);
  });

  it('quotes binary paths with spaces safely', () => {
    const { settingsFile, stateFile } = claudeFiles();

    installClaudeIntegration({
      binary: '/tmp/tool net/bin/toolnet-memory',
      settingsFile,
      stateFile,
    });

    const settings = readJson(settingsFile);

    const command = JSON.stringify(settings);

    expect(command).toContain("'/tmp/tool net/bin/toolnet-memory' session:claude-hook");

    expect(() => JSON.parse(readFileSync(settingsFile, 'utf8'))).not.toThrow();
  });

  it('repair dry-run reports changes without writing', () => {
    const { settingsFile, stateFile } = claudeFiles();

    expect(existsSync(settingsFile)).toBe(false);

    const plan = installClaudeIntegration({
      binary: 'toolnet-memory',
      settingsFile,
      stateFile,
      dryRun: true,
    });

    expect(plan.hooks.changed).toBe(true);

    expect(plan.mcp.changed).toBe(true);

    expect(existsSync(settingsFile)).toBe(false);

    expect(existsSync(stateFile)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Project identity                                                    */
/* ------------------------------------------------------------------ */

describe('project identity', () => {
  it('resolves the same project id from a subdirectory', () => {
    const root = tempRoot('int-subdir-');

    const manager = new ProjectManager();

    const atRoot = manager.detect(root);

    const subdir = join(root, 'src', 'components');

    mkdirSync(subdir, { recursive: true });

    const fromSubdir = manager.detect(subdir);

    expect(fromSubdir.id).toBe(atRoot.id);

    expect(fromSubdir.rootPath).toBe(atRoot.rootPath);
  });

  it('keeps separate projects isolated', () => {
    const a = tempRoot('int-proj-a-');

    const b = tempRoot('int-proj-b-');

    const manager = new ProjectManager();

    expect(manager.detect(a).id).not.toBe(manager.detect(b).id);
  });

  it('keeps session cursors isolated between sessions of one project', () => {
    const root = tempRoot('int-sessions-');

    const project = makeProject(root);

    const one = new SessionWal(createSessionIdentity(project, 'claude', 's1'));

    const two = new SessionWal(createSessionIdentity(project, 'claude', 's2'));

    one.append([{ type: 'user_prompt', role: 'user', data: { content: 'first session' } }]);

    expect(two.loadState().lastSequence).toBe(0);

    expect(one.loadState().lastSequence).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Native event contract                                               */
/* ------------------------------------------------------------------ */

describe('native event contract', () => {
  const projectRoot = () => {
    const root = tempRoot('int-native-');

    makeProject(root);

    return root;
  };

  it('ignores unknown future events without throwing', async () => {
    const cwd = projectRoot();

    const result = await handleClaudeHookInput({
      hook_event_name: 'FutureUnknownEvent',
      cwd,
      session_id: 'native-1',
      extra_future_field: { nested: true },
    });

    expect(result).toBeDefined();
  });

  it('rejects a malformed event missing identity without creating state', async () => {
    /* No cwd: the hook must fail closed instead of guessing a project. */
    const result = await handleClaudeHookInput({ hook_event_name: 'PostToolUse' });

    expect(result).toEqual({});
  });

  it('deduplicates duplicate native event delivery', () => {
    const root = tempRoot('int-dedupe-');

    const project = makeProject(root);

    const wal = new SessionWal(createSessionIdentity(project, 'claude', 'dedupe-1'));

    const first = wal.append([
      {
        type: 'user_prompt',
        role: 'user',
        sourceEventId: 'evt-1',
        data: { content: 'hello world rule' },
      },
    ]);

    const second = wal.append([
      {
        type: 'user_prompt',
        role: 'user',
        sourceEventId: 'evt-1',
        data: { content: 'hello world rule' },
      },
    ]);

    expect(first).toHaveLength(1);

    expect(second).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* Sync source behavior & self-loop                                    */
/* ------------------------------------------------------------------ */

describe('sync integrations', () => {
  it('fails safely when an OpenCode database is unavailable', async () => {
    const root = tempRoot('int-oc-');

    const project = makeProject(root);

    const storage = new MemoryStorage();

    await expect(
      syncOpenCodeSession({
        project,
        storage,
        nativeSessionId: 'oc-missing',
        dbPath: join(root, 'does-not-exist.db'),
      })
    ).rejects.toThrow();

    expect(storage.objects.size).toBe(0);
  });

  it('does not write back into the ToolNet CLI native source (no self-capture loop)', async () => {
    const root = tempRoot('int-cli-');

    const project = makeProject(root);

    const storage = new MemoryStorage();

    const sessionsDir = join(root, 'native-sessions');

    const bindingFile = join(root, 'bindings.json');

    mkdirSync(sessionsDir, { recursive: true });

    const file = toolNetCliSessionFile('cli-loop', sessionsDir);

    writeFileSync(
      file,
      JSON.stringify({ sessionId: 'cli-loop', messages: [{ role: 'user', content: 'a rule' }] })
    );

    const before = readFileSync(file, 'utf8');

    await syncToolNetCliSession({
      project,
      storage,
      nativeSessionId: 'cli-loop',
      sessionsDir,
      bindingFile,
      bind: true,
    });

    expect(readFileSync(file, 'utf8')).toBe(before);
  });
});
