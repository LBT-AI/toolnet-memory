import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { detectAgentIntegrations } from '../../src/production/integration-detection.js';

import {
  agyAntigravityDirectory,
  agyLegacyConfigDirectory,
  agyDetectionPaths,
  agyLegacyHooksFile,
  agyGlobalMcpConfigFile,
  agyPluginRoot,
} from '../../src/session/agy/config-paths.js';

import { installAgyHooks } from '../../src/session/agy/hook-installer.js';

import { installAgyMcp } from '../../src/session/agy/mcp-installer.js';

const ORIGINAL_BIN = process.env.TOOLNET_MEMORY_BIN;

afterEach(() => {
  if (ORIGINAL_BIN === undefined) {
    delete process.env.TOOLNET_MEMORY_BIN;
  } else {
    process.env.TOOLNET_MEMORY_BIN = ORIGINAL_BIN;
  }
});

describe('Agy / Antigravity adapter hardening', () => {
  test('resolves native and legacy Agy paths consistently', () => {
    const home = '/tmp/toolnet-agy-home';

    expect(
      agyLegacyConfigDirectory({
        home,
      })
    ).toBe(join(home, '.gemini', 'config'));

    expect(
      agyGlobalMcpConfigFile({
        home,
      })
    ).toBe(join(home, '.gemini', 'config', 'mcp_config.json'));

    expect(
      agyLegacyHooksFile({
        home,
      })
    ).toBe(join(home, '.gemini', 'config', 'hooks.json'));

    expect(
      agyAntigravityDirectory({
        home,
      })
    ).toBe(join(home, '.gemini', 'antigravity-cli'));

    expect(
      agyPluginRoot('toolnet-memory', {
        home,
      })
    ).toBe(join(home, '.gemini', 'antigravity-cli', 'plugins', 'toolnet-memory'));

    const paths = agyDetectionPaths({ home });

    expect(paths).toContain(join(home, '.gemini', 'antigravity-cli'));
    expect(paths).toContain(join(home, '.gemini', 'config', 'mcp_config.json'));
    expect(paths).toContain(join(home, '.gemini', 'config'));
  });

  test('keeps I3 legacy Agy config detection compatible', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-agy-detect-'));

    try {
      mkdirSync(join(home, '.gemini', 'config'), {
        recursive: true,
      });

      const detections = detectAgentIntegrations({
        home,
        commandExists: () => false,
      });

      const agy = detections.find((item) => item.agent === 'agy');

      expect(agy?.detected).toBe(true);

      expect(agy?.configDetected).toBe(true);
    } finally {
      rmSync(home, {
        recursive: true,
        force: true,
      });
    }
  });

  test('rejects non-object hooks config instead of silently corrupting it', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-hooks-invalid-'));

    try {
      const hooksFile = join(root, 'hooks.json');

      writeFileSync(hooksFile, '[]\n');

      expect(() =>
        installAgyHooks({
          hooksFile,
        })
      ).toThrow(/root must be a JSON object/u);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('preserves unrelated hooks and uses TOOLNET_MEMORY_BIN', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-hooks-safe-'));

    try {
      const hooksFile = join(root, 'hooks.json');

      writeFileSync(
        hooksFile,
        JSON.stringify(
          {
            custom: {
              enabled: true,
              Stop: [
                {
                  type: 'command',
                  command: 'custom-stop',
                },
              ],
            },
          },
          null,
          2
        ) + '\n'
      );

      process.env.TOOLNET_MEMORY_BIN = '/opt/toolnet/bin/toolnet-memory';

      installAgyHooks({
        hooksFile,
      });

      const first = readFileSync(hooksFile, 'utf8');

      const parsed = JSON.parse(first);

      expect(parsed.custom).toEqual({
        enabled: true,
        Stop: [
          {
            type: 'command',
            command: 'custom-stop',
          },
        ],
      });

      expect(parsed['toolnet-memory'].PreInvocation[0].command).toContain(
        '/opt/toolnet/bin/toolnet-memory'
      );

      /*
       * Reinstall is idempotent:
       * no duplicate managed hook blocks.
       */
      installAgyHooks({
        hooksFile,
      });

      const second = readFileSync(hooksFile, 'utf8');

      expect(second).toBe(first);

      expect(
        Object.keys(JSON.parse(second)).filter((key) => key === 'toolnet-memory')
      ).toHaveLength(1);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('repairs only stale ToolNet MCP entry and preserves other servers', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-mcp-repair-'));

    try {
      const configFile = join(root, 'mcp_config.json');

      writeFileSync(
        configFile,
        JSON.stringify(
          {
            customSetting: true,
            mcpServers: {
              github: {
                command: 'github-mcp',
                args: ['serve'],
              },
              'toolnet-memory': {
                command: 'old-toolnet',
                args: ['mcp'],
              },
            },
          },
          null,
          2
        ) + '\n'
      );

      const first = installAgyMcp({
        configFile,
        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.changed).toBe(true);

      const parsed = JSON.parse(readFileSync(configFile, 'utf8'));

      expect(parsed.customSetting).toBe(true);

      expect(parsed.mcpServers.github).toEqual({
        command: 'github-mcp',
        args: ['serve'],
      });

      expect(parsed.mcpServers['toolnet-memory']).toEqual({
        command: '/usr/local/bin/toolnet-memory',
        args: ['mcp'],
      });

      const second = installAgyMcp({
        configFile,
        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(second.changed).toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
