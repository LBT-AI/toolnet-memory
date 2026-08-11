import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { installOpenCodeMcp } from '../../src/session/opencode/mcp-installer.js';

describe('OpenCode MCP installer', () => {
  test('preserves config and other MCP servers', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-mcp-'));

    try {
      const configFile = join(root, 'opencode.json');

      writeFileSync(
        configFile,
        JSON.stringify(
          {
            $schema: 'https://opencode.ai/config.json',

            model: 'openai/test-model',

            permission: {
              bash: 'ask',
            },

            mcp: {
              github: {
                type: 'local',

                command: ['github-mcp', 'serve'],

                enabled: true,
              },
            },
          },
          null,
          2
        )
      );

      const first = installOpenCodeMcp({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.installed).toBe(true);

      expect(first.changed).toBe(true);

      const stored = JSON.parse(readFileSync(configFile, 'utf8'));

      expect(stored.model).toBe('openai/test-model');

      expect(stored.permission).toEqual({
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

      const second = installOpenCodeMcp({
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

  test('refuses invalid existing JSON', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-invalid-'));

    try {
      const configFile = join(root, 'opencode.json');

      writeFileSync(configFile, '{ invalid json');

      expect(() =>
        installOpenCodeMcp({
          configFile,
        })
      ).toThrow('Invalid existing OpenCode opencode.json');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('leaves existing JSONC file untouched', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-opencode-jsonc-'));

    try {
      const configFile = join(root, 'opencode.json');

      const jsoncFile = join(root, 'opencode.jsonc');

      const jsonc = `{
  // user comments must survive
  "autoupdate": false,
}
`;

      writeFileSync(jsoncFile, jsonc);

      const result = installOpenCodeMcp({
        configFile,

        binary: 'toolnet-memory',
      });

      expect(result.preservedJsonc).toBe(jsoncFile);

      expect(readFileSync(jsoncFile, 'utf8')).toBe(jsonc);

      const stored = JSON.parse(readFileSync(configFile, 'utf8'));

      expect(stored.mcp['toolnet-memory'].command).toEqual(['toolnet-memory', 'mcp']);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
