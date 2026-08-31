import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { detectAgentIntegrations } from '../../src/production/integration-detection.js';

import {
  openCodeGlobalAgentsFile,
  openCodeConfigDirectory,
  openCodeGlobalConfigFile,
  openCodePluginDirectory,
} from '../../src/session/opencode/config-paths.js';

import { installOpenCodeMcp } from '../../src/session/opencode/mcp-installer.js';

import { installOpenCodePlugin } from '../../src/session/opencode/plugin-installer.js';

const ORIGINAL_XDG = process.env.XDG_CONFIG_HOME;

afterEach(() => {
  if (ORIGINAL_XDG === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = ORIGINAL_XDG;
  }
});

describe('OpenCode adapter hardening', () => {
  test('resolves all OpenCode paths from one XDG root', () => {
    const root = '/tmp/toolnet-xdg-test';

    expect(
      openCodeConfigDirectory({
        home: '/unused-home',
        xdgConfigHome: root,
      })
    ).toBe(join(root, 'opencode'));

    expect(
      openCodeGlobalConfigFile({
        xdgConfigHome: root,
      })
    ).toBe(join(root, 'opencode', 'opencode.json'));

    expect(
      openCodePluginDirectory({
        xdgConfigHome: root,
      })
    ).toBe(join(root, 'opencode', 'plugins'));

    expect(
      openCodeGlobalAgentsFile({
        xdgConfigHome: root,
      })
    ).toBe(join(root, 'opencode', 'AGENTS.md'));
  });

  test('I3 detection respects XDG_CONFIG_HOME', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-detect-'));

    try {
      mkdirSync(join(root, 'opencode'), {
        recursive: true,
      });

      const result = detectAgentIntegrations({
        home: '/definitely-not-used',
        xdgConfigHome: root,
        commandExists: () => false,
      });

      const openCode = result.find((item) => item.agent === 'opencode');

      expect(openCode?.detected).toBe(true);

      expect(openCode?.commandDetected).toBe(false);

      expect(openCode?.configDetected).toBe(true);

      expect(openCode?.evidence).toContain(`config:${join(root, 'opencode')}`);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('repairs stale ToolNet MCP while preserving user config', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-repair-'));

    try {
      const configFile = join(root, 'opencode.json');

      writeFileSync(
        configFile,
        JSON.stringify({
          model: 'custom/model',
          permissions: {
            bash: 'ask',
          },
          mcp: {
            github: {
              type: 'local',
              command: ['github-mcp', 'serve'],
              enabled: true,
            },
            'toolnet-memory': {
              type: 'local',
              command: ['old-toolnet', 'mcp'],
              enabled: false,
            },
          },
        })
      );

      const result = installOpenCodeMcp({
        configFile,
        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(result.changed).toBe(true);

      const stored = JSON.parse(readFileSync(configFile, 'utf8'));

      expect(stored.model).toBe('custom/model');

      expect(stored.permissions).toEqual({
        bash: 'ask',
      });

      expect(stored.mcp.github).toEqual({
        type: 'local',
        command: ['github-mcp', 'serve'],
        enabled: true,
      });

      expect(stored.mcp['toolnet-memory']).toEqual({
        type: 'local',
        command: ['/usr/local/bin/toolnet-memory', 'mcp'],
        enabled: true,
      });
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('does not auto-remove legacy mcpServers entries', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-no-migrate-'));

    try {
      const configFile = join(root, 'opencode.json');

      writeFileSync(
        configFile,
        JSON.stringify({
          provider: {
            custom: {
              api: 'https://example.test',
            },
          },
          mcpServers: {
            github: {
              command: 'github-mcp',
            },
            'toolnet-memory': {
              command: 'old-toolnet',
            },
          },
          mcp: {
            other: {
              type: 'local',
              command: ['other-mcp', 'serve'],
              enabled: true,
            },
          },
        })
      );

      const first = installOpenCodeMcp({
        configFile,
        binary: 'toolnet-memory',
      });

      expect(first.changed).toBe(true);

      const stored = JSON.parse(readFileSync(configFile, 'utf8'));

      expect(stored.provider).toEqual({
        custom: {
          api: 'https://example.test',
        },
      });

      // Legacy mcpServers should NOT be auto-removed
      expect(stored.mcpServers.github).toEqual({
        command: 'github-mcp',
      });

      expect(stored.mcpServers['toolnet-memory']).toEqual({
        command: 'old-toolnet',
      });

      expect(stored.mcp.other).toEqual({
        type: 'local',
        command: ['other-mcp', 'serve'],
        enabled: true,
      });

      expect(stored.mcp['toolnet-memory']).toEqual({
        type: 'local',
        command: ['toolnet-memory', 'mcp'],
        enabled: true,
      });

      const second = installOpenCodeMcp({
        configFile,
        binary: 'toolnet-memory',
      });

      expect(second.changed).toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('plugin and AGENTS use the same XDG root and reinstall safely', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-plugin-'));

    try {
      process.env.XDG_CONFIG_HOME = root;

      const pluginFiles = installOpenCodePlugin({
        binary: '/usr/local/bin/toolnet-memory',
      });

      const configRoot = join(root, 'opencode');

      expect(pluginFiles.length).toBeGreaterThan(0);

      const pluginFile = pluginFiles.find((f) => f.endsWith('toolnet-memory.js'));

      expect(pluginFile).toBeDefined();

      expect(existsSync(pluginFile!)).toBe(true);

      const agentsFile = join(configRoot, 'AGENTS.md');

      expect(existsSync(agentsFile)).toBe(true);

      installOpenCodePlugin({
        binary: '/usr/local/bin/toolnet-memory',
      });

      const agents = readFileSync(agentsFile, 'utf8');

      expect(agents.match(/TOOLNET_MEMORY_BOOTSTRAP_START/gu)).toHaveLength(1);

      const pluginText = readFileSync(pluginFile!, 'utf8');

      expect(pluginText).toContain('const LOCAL_CAPTURE_MS = 15000');

      expect(pluginText).toContain('const REMOTE_SYNC_MS = 60000');

      expect(pluginText).toContain('const REMOTE_TIMEOUT_MS = 120000');

      expect(pluginText).toContain('"--local-only"');

      expect(pluginText).toContain('queueCapture');

      expect(pluginText).toContain('queueRemote');

      expect(pluginText).not.toContain('const SYNC_TIMEOUT_MS = 15000');

      expect(pluginText).toContain('const injectedSessions');

      expect(pluginText).toContain('function contextSessionKey');

      expect(pluginText).toContain('injectedSessions.has');

      expect(pluginText).toContain('injectedSessions.add');

      expect(pluginText).toContain('projectStatusFile');

      expect(pluginText).toContain('opencode-status.json');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('system transform merges in-place without extra message', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-transform-'));

    try {
      process.env.XDG_CONFIG_HOME = root;

      const pluginFiles = installOpenCodePlugin({
        binary: '/usr/local/bin/toolnet-memory',
      });

      const pluginFile = pluginFiles.find((f) => f.endsWith('toolnet-memory.js'));

      expect(pluginFile).toBeDefined();

      const pluginText = readFileSync(pluginFile!, 'utf8');

      // Should use in-place merge, not push
      expect(pluginText).toContain('output.system[output.system.length - 1]');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('dispose does not pass --idle flag', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-dispose-'));

    try {
      process.env.XDG_CONFIG_HOME = root;

      const pluginFiles = installOpenCodePlugin({
        binary: '/usr/local/bin/toolnet-memory',
      });

      const pluginFile = pluginFiles.find((f) => f.endsWith('toolnet-memory.js'));

      expect(pluginFile).toBeDefined();

      const pluginText = readFileSync(pluginFile!, 'utf8');

      // dispose should use dispose:local-flush, not --idle
      expect(pluginText).toContain('"dispose:local-flush"');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('session.deleted does not run DB sync', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-deleted-'));

    try {
      process.env.XDG_CONFIG_HOME = root;

      const pluginFiles = installOpenCodePlugin({
        binary: '/usr/local/bin/toolnet-memory',
      });

      const pluginFile = pluginFiles.find((f) => f.endsWith('toolnet-memory.js'));

      expect(pluginFile).toBeDefined();

      const pluginText = readFileSync(pluginFile!, 'utf8');

      // session.deleted should return early
      expect(pluginText).toContain('session.deleted');
      expect(pluginText).toContain('return');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('plugin continues working even if ToolNet binary fails', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-failopen-'));

    try {
      process.env.XDG_CONFIG_HOME = root;

      const pluginFiles = installOpenCodePlugin({
        binary: '/nonexistent/binary',
      });

      expect(pluginFiles.length).toBeGreaterThan(0);

      // Plugin should still be written even with bad binary
      for (const file of pluginFiles) {
        expect(existsSync(file)).toBe(true);
      }
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
