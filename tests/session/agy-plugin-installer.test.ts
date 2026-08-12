import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { AGY_CONTINUITY_RULE, installAgyPlugin } from '../../src/session/agy/plugin-installer.js';

describe('Agy native plugin installer', () => {
  test('installs plugin with MCP, hooks and continuity rule', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-plugin-'));

    try {
      const pluginRoot = join(root, 'plugins', 'toolnet-memory');

      const legacyMcpFile = join(root, 'legacy', 'mcp_config.json');

      const legacyHooksFile = join(root, 'legacy', 'hooks.json');

      mkdirSync(join(root, 'legacy'), {
        recursive: true,
      });

      writeFileSync(
        legacyMcpFile,
        JSON.stringify({
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
        })
      );

      writeFileSync(
        legacyHooksFile,
        JSON.stringify({
          existing: {
            enabled: true,
          },

          'toolnet-memory': {
            enabled: true,
          },
        })
      );

      const result = installAgyPlugin({
        pluginRoot,

        binary: '/usr/local/bin/toolnet-memory',

        legacyMcpFile,

        legacyHooksFile,
      });

      expect(result.installed).toBe(true);

      const manifest = JSON.parse(readFileSync(join(pluginRoot, 'plugin.json'), 'utf8'));

      expect(manifest.name).toBe('toolnet-memory');

      const mcp = JSON.parse(readFileSync(join(pluginRoot, 'mcp_config.json'), 'utf8'));

      expect(mcp.mcpServers['toolnet-memory']).toEqual({
        command: '/usr/local/bin/toolnet-memory',

        args: ['mcp'],
      });

      const hooks = JSON.parse(readFileSync(join(pluginRoot, 'hooks.json'), 'utf8'));

      expect(hooks['toolnet-memory'].PreInvocation).toBeDefined();

      expect(hooks['toolnet-memory'].PreToolUse).toBeDefined();

      const rule = readFileSync(join(pluginRoot, 'rules', 'toolnet-memory-continuity.md'), 'utf8');

      expect(rule).toContain('FIRST call');

      expect(rule).toContain('memory_agent_ask');

      expect(rule).toContain('~/.gemini/antigravity-cli/brain/**');

      expect(rule).toContain('transcript.jsonl');

      const migratedMcp = JSON.parse(readFileSync(legacyMcpFile, 'utf8'));

      expect(migratedMcp.customSetting).toBe(true);

      expect(migratedMcp.mcpServers.github).toBeDefined();

      expect(migratedMcp.mcpServers['toolnet-memory']).toBeUndefined();

      const migratedHooks = JSON.parse(readFileSync(legacyHooksFile, 'utf8'));

      expect(migratedHooks.existing).toBeDefined();

      expect(migratedHooks['toolnet-memory']).toBeUndefined();
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  test('continuity rule is compact and explicit', () => {
    expect(AGY_CONTINUITY_RULE.length).toBeLessThan(12000);

    expect(AGY_CONTINUITY_RULE).toContain('mode="local"');

    expect(AGY_CONTINUITY_RULE).toContain('mode="ai"');

    expect(AGY_CONTINUITY_RULE).toContain('Current repository evidence overrides stale memory');
  });
});
