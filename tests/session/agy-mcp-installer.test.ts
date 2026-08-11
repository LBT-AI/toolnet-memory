import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { installAgyMcp } from '../../src/session/agy/mcp-installer.js';

describe('Agy MCP installer', () => {
  test('preserves existing servers and is idempotent', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-mcp-'));

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
            },
          },
          null,
          2
        )
      );

      const first = installAgyMcp({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.installed).toBe(true);

      expect(first.changed).toBe(true);

      const stored = JSON.parse(readFileSync(configFile, 'utf8'));

      expect(stored.customSetting).toBe(true);

      expect(stored.mcpServers.github).toEqual({
        command: 'github-mcp',

        args: ['serve'],
      });

      expect(stored.mcpServers['toolnet-memory']).toEqual({
        command: '/usr/local/bin/toolnet-memory',

        args: ['mcp'],
      });

      const second = installAgyMcp({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(second.installed).toBe(true);

      expect(second.changed).toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('refuses invalid existing JSON instead of overwriting it', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-mcp-invalid-'));

    try {
      const configFile = join(root, 'mcp_config.json');

      writeFileSync(configFile, '{ invalid json');

      expect(() =>
        installAgyMcp({
          configFile,
        })
      ).toThrow('Invalid existing Agy MCP config');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
