import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installKiroMcp } from '../../src/session/kiro/mcp-installer.js';

describe('Kiro MCP installer', () => {
  const roots: string[] = [];

  function tempRoot(): string {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kiro-mcp-'));

    roots.push(root);

    return root;
  }

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('creates a valid Kiro MCP config when none exists', () => {
    const root = tempRoot();

    const configFile = join(root, '.kiro', 'settings', 'mcp.json');

    const result = installKiroMcp({
      configFile,

      binary: '/usr/local/bin/toolnet-memory',
    });

    expect(result.installed).toBe(true);

    expect(result.changed).toBe(true);

    expect(existsSync(configFile)).toBe(true);

    const parsed = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(parsed).toEqual({
      mcpServers: {
        'toolnet-memory': {
          command: '/usr/local/bin/toolnet-memory',

          args: ['mcp'],

          disabled: false,
        },
      },
    });
  });

  it('preserves unrelated top-level settings and existing MCP servers', () => {
    const root = tempRoot();

    const configFile = join(root, '.kiro', 'settings', 'mcp.json');

    mkdirSync(join(root, '.kiro', 'settings'), {
      recursive: true,
    });

    writeFileSync(
      configFile,
      JSON.stringify(
        {
          customSetting: {
            enabled: true,
          },

          mcpServers: {
            'ai-skills': {
              command: 'node',

              args: ['skills.js'],

              disabled: false,
            },
          },
        },
        null,
        2
      )
    );

    installKiroMcp({
      configFile,

      binary: 'toolnet-memory',
    });

    const parsed = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(parsed.customSetting).toEqual({
      enabled: true,
    });

    expect(parsed.mcpServers['ai-skills']).toEqual({
      command: 'node',

      args: ['skills.js'],

      disabled: false,
    });

    expect(parsed.mcpServers['toolnet-memory']).toEqual({
      command: 'toolnet-memory',

      args: ['mcp'],

      disabled: false,
    });
  });

  it('is idempotent when the ToolNet MCP entry is already correct', () => {
    const root = tempRoot();

    const configFile = join(root, '.kiro', 'settings', 'mcp.json');

    const first = installKiroMcp({
      configFile,

      binary: 'toolnet-memory',
    });

    const before = readFileSync(configFile, 'utf8');

    const second = installKiroMcp({
      configFile,

      binary: 'toolnet-memory',
    });

    const after = readFileSync(configFile, 'utf8');

    expect(first.changed).toBe(true);

    expect(second.changed).toBe(false);

    expect(after).toBe(before);
  });

  it('repairs only the ToolNet-owned entry when it is stale', () => {
    const root = tempRoot();

    const configFile = join(root, '.kiro', 'settings', 'mcp.json');

    mkdirSync(join(root, '.kiro', 'settings'), {
      recursive: true,
    });

    writeFileSync(
      configFile,
      JSON.stringify(
        {
          mcpServers: {
            keep: {
              command: 'keep-server',
            },

            'toolnet-memory': {
              command: 'old-toolnet-memory',

              args: ['old-command'],

              disabled: true,
            },
          },
        },
        null,
        2
      )
    );

    const result = installKiroMcp({
      configFile,

      binary: '/new/toolnet-memory',
    });

    const parsed = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(result.changed).toBe(true);

    expect(parsed.mcpServers.keep).toEqual({
      command: 'keep-server',
    });

    expect(parsed.mcpServers['toolnet-memory']).toEqual({
      command: '/new/toolnet-memory',

      args: ['mcp'],

      disabled: false,
    });
  });

  it('fails safely on invalid JSON without overwriting the file', () => {
    const root = tempRoot();

    const configFile = join(root, '.kiro', 'settings', 'mcp.json');

    mkdirSync(join(root, '.kiro', 'settings'), {
      recursive: true,
    });

    const original = '{ invalid-json';

    writeFileSync(configFile, original);

    expect(() =>
      installKiroMcp({
        configFile,
      })
    ).toThrow(/Invalid existing Kiro MCP config/);

    expect(readFileSync(configFile, 'utf8')).toBe(original);
  });

  it('fails safely when mcpServers is not an object', () => {
    const root = tempRoot();

    const configFile = join(root, '.kiro', 'settings', 'mcp.json');

    mkdirSync(join(root, '.kiro', 'settings'), {
      recursive: true,
    });

    const original = JSON.stringify(
      {
        mcpServers: [],
      },
      null,
      2
    );

    writeFileSync(configFile, original);

    expect(() =>
      installKiroMcp({
        configFile,
      })
    ).toThrow(/mcpServers must be an object/);

    expect(readFileSync(configFile, 'utf8')).toBe(original);
  });
});
