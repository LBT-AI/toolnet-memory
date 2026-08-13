import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { detectAgentIntegrations } from '../../src/production/integration-detection.js';

import {
  openCodeAgentsFile,
  openCodeConfigDirectory,
  openCodeJsonConfigFile,
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
      openCodeJsonConfigFile({
        xdgConfigHome: root,
      })
    ).toBe(join(root, 'opencode', 'opencode.json'));

    expect(
      openCodePluginDirectory({
        xdgConfigHome: root,
      })
    ).toBe(join(root, 'opencode', 'plugins'));

    expect(
      openCodeAgentsFile({
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

  test('migrates only legacy ToolNet mcpServers entry', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-legacy-'));

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

      expect(stored.mcpServers.github).toEqual({
        command: 'github-mcp',
      });

      expect(stored.mcpServers['toolnet-memory']).toBeUndefined();

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

      const plugin = installOpenCodePlugin({
        binary: '/usr/local/bin/toolnet-memory',
      });

      const configRoot = join(root, 'opencode');

      expect(plugin).toBe(join(configRoot, 'plugins', 'toolnet-memory.js'));

      expect(existsSync(plugin)).toBe(true);

      const agentsFile = join(configRoot, 'AGENTS.md');

      expect(existsSync(agentsFile)).toBe(true);

      installOpenCodePlugin({
        binary: '/usr/local/bin/toolnet-memory',
      });

      const agents = readFileSync(agentsFile, 'utf8');

      expect(agents.match(/TOOLNET_MEMORY_BOOTSTRAP_START/gu)).toHaveLength(1);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
