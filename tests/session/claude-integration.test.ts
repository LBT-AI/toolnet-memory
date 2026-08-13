import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { detectAgentIntegrations } from '../../src/production/integration-detection.js';

import { installClaudeHooks } from '../../src/session/claude/hook-installer.js';

import { installClaudeMcp } from '../../src/session/claude/mcp-installer.js';

describe('Claude Code integration', () => {
  test('detects Claude from ~/.claude without command', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-claude-detect-'));

    try {
      mkdirSync(join(home, '.claude'), {
        recursive: true,
      });

      const detections = detectAgentIntegrations({
        home,

        commandExists: () => false,
      });

      const claude = detections.find((item) => item.agent === 'claude');

      expect(claude?.detected).toBe(true);

      expect(claude?.commandDetected).toBe(false);

      expect(claude?.configDetected).toBe(true);
    } finally {
      rmSync(home, {
        recursive: true,

        force: true,
      });
    }
  });

  test('installs and repairs only ToolNet user MCP entry', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-claude-mcp-'));

    try {
      const stateFile = join(root, '.claude.json');

      writeFileSync(
        stateFile,
        JSON.stringify(
          {
            theme: 'dark',

            mcpServers: {
              github: {
                type: 'stdio',

                command: 'github-mcp',

                args: [],
              },

              'toolnet-memory': {
                type: 'stdio',

                command: 'old-toolnet',

                args: ['mcp'],
              },
            },
          },
          null,
          2
        )
      );

      const first = installClaudeMcp({
        stateFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.changed).toBe(true);

      expect(first.repaired).toBe(true);

      const stored = JSON.parse(readFileSync(stateFile, 'utf8'));

      expect(stored.theme).toBe('dark');

      expect(stored.mcpServers.github).toEqual({
        type: 'stdio',

        command: 'github-mcp',

        args: [],
      });

      expect(stored.mcpServers['toolnet-memory']).toEqual({
        type: 'stdio',

        command: '/usr/local/bin/toolnet-memory',

        args: ['mcp'],
      });

      const second = installClaudeMcp({
        stateFile,

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

  test('preserves unrelated Claude settings and hooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-claude-hooks-'));

    try {
      const settingsFile = join(root, 'settings.json');

      writeFileSync(
        settingsFile,
        JSON.stringify(
          {
            permissions: {
              defaultMode: 'acceptEdits',
            },

            hooks: {
              PostToolUse: [
                {
                  matcher: 'Bash',

                  hooks: [
                    {
                      type: 'command',

                      command: 'custom-hook',
                    },
                  ],
                },
              ],
            },
          },
          null,
          2
        )
      );

      installClaudeHooks({
        settingsFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      const first = JSON.parse(readFileSync(settingsFile, 'utf8'));

      expect(first.permissions).toEqual({
        defaultMode: 'acceptEdits',
      });

      expect(JSON.stringify(first)).toContain('custom-hook');

      expect(JSON.stringify(first)).toContain('session:claude-hook');

      installClaudeHooks({
        settingsFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      const secondText = readFileSync(settingsFile, 'utf8');

      const occurrences = secondText.match(/session:claude-hook/gu) ?? [];

      expect(occurrences).toHaveLength(3);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  test('refuses malformed settings root', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-claude-invalid-'));

    try {
      const settingsFile = join(root, 'settings.json');

      writeFileSync(settingsFile, '[]\n');

      expect(() =>
        installClaudeHooks({
          settingsFile,
        })
      ).toThrow(/root must be a JSON object/u);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
