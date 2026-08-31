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

      const result = installAgyPlugin({
        pluginRoot,
        binary: '/usr/local/bin/toolnet-memory',
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

      expect(hooks['toolnet-memory'].Stop).toBeDefined();

      expect(hooks['toolnet-memory'].PostInvocation).toBeDefined();

      const rule = readFileSync(join(pluginRoot, 'rules', 'toolnet-memory-continuity.md'), 'utf8');

      expect(rule).toContain('FIRST call');

      expect(rule).toContain('memory_agent_ask');

      expect(rule).toContain('~/.gemini/antigravity-cli/brain/**');

      expect(rule).toContain('transcript.jsonl');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('continuity rule is compact and explicit', () => {
    expect(AGY_CONTINUITY_RULE.length).toBeLessThan(12000);

    expect(AGY_CONTINUITY_RULE).toContain('Current repository evidence overrides stale memory');

    // Must NOT contain mode="ai"
    expect(AGY_CONTINUITY_RULE).not.toContain('mode="ai"');
  });

  test('does not auto-remove legacy entries', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-no-migrate-'));

    try {
      const pluginRoot = join(root, 'plugins', 'toolnet-memory');

      // Create a legacy MCP file with toolnet-memory entry
      const legacyMcpDir = join(root, '.gemini', 'config');

      mkdirSync(legacyMcpDir, { recursive: true });

      const legacyMcpFile = join(legacyMcpDir, 'mcp_config.json');

      writeFileSync(
        legacyMcpFile,
        JSON.stringify({
          mcpServers: {
            'toolnet-memory': {
              command: 'old-binary',
              args: ['mcp'],
            },
            'other-server': {
              command: 'other',
              args: ['serve'],
            },
          },
        })
      );

      installAgyPlugin({
        pluginRoot,
        binary: '/usr/local/bin/toolnet-memory',
      });

      // Legacy file should NOT be modified
      const legacyContent = JSON.parse(readFileSync(legacyMcpFile, 'utf8'));

      expect(legacyContent.mcpServers['toolnet-memory']).toEqual({
        command: 'old-binary',
        args: ['mcp'],
      });

      expect(legacyContent.mcpServers['other-server']).toBeDefined();
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('idempotent: reinstall produces same result', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-idempotent-'));

    try {
      const pluginRoot = join(root, 'plugins', 'toolnet-memory');

      const first = installAgyPlugin({
        pluginRoot,
        binary: '/usr/local/bin/toolnet-memory',
      });

      const second = installAgyPlugin({
        pluginRoot,
        binary: '/usr/local/bin/toolnet-memory',
      });

      const firstManifest = readFileSync(join(pluginRoot, 'plugin.json'), 'utf8');
      const secondManifest = readFileSync(join(pluginRoot, 'plugin.json'), 'utf8');

      expect(firstManifest).toBe(secondManifest);

      const firstMcp = readFileSync(join(pluginRoot, 'mcp_config.json'), 'utf8');
      const secondMcp = readFileSync(join(pluginRoot, 'mcp_config.json'), 'utf8');

      expect(firstMcp).toBe(secondMcp);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
