import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installCopilotMcp } from '../../src/session/copilot/mcp-installer.js';

describe('GitHub Copilot CLI MCP installer', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-copilot-mcp-'));
    roots.push(root);

    return join(root, '.copilot', 'mcp-config.json');
  }

  it('creates a valid Copilot stdio MCP entry with all tools', () => {
    const configFile = fixture();

    installCopilotMcp({
      configFile,
      binary: '/usr/local/bin/toolnet-memory',
    });

    const json = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(json.mcpServers['toolnet-memory']).toEqual({
      type: 'stdio',
      command: '/usr/local/bin/toolnet-memory',
      args: ['mcp'],
      tools: ['*'],
    });
  });

  it('preserves unrelated Copilot settings and MCP servers', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });

    writeFileSync(
      configFile,
      JSON.stringify({
        futureSetting: true,
        mcpServers: {
          github: {
            type: 'http',
            url: 'https://example.invalid/mcp',
            tools: ['*'],
          },
        },
      })
    );

    installCopilotMcp({ configFile });

    const json = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(json.futureSetting).toBe(true);
    expect(json.mcpServers.github.url).toBe('https://example.invalid/mcp');
  });

  it('is idempotent', () => {
    const configFile = fixture();

    const first = installCopilotMcp({ configFile });
    const firstText = readFileSync(configFile, 'utf8');

    const second = installCopilotMcp({ configFile });
    const secondText = readFileSync(configFile, 'utf8');

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(secondText).toBe(firstText);
  });

  it('repairs stale ToolNet config', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });

    writeFileSync(
      configFile,
      JSON.stringify({
        mcpServers: {
          'toolnet-memory': {
            command: 'wrong',
            args: [],
            tools: [],
          },
        },
      })
    );

    installCopilotMcp({
      configFile,
      binary: 'toolnet-memory',
    });

    const json = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(json.mcpServers['toolnet-memory']).toEqual({
      type: 'stdio',
      command: 'toolnet-memory',
      args: ['mcp'],
      tools: ['*'],
    });
  });

  it('fails safely on invalid JSON', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });
    writeFileSync(configFile, '{ broken');

    expect(() => installCopilotMcp({ configFile })).toThrow(
      /Invalid existing GitHub Copilot CLI MCP config/
    );

    expect(readFileSync(configFile, 'utf8')).toBe('{ broken');
  });

  it('fails when mcpServers is not an object', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });
    writeFileSync(configFile, JSON.stringify({ mcpServers: 'bad' }));

    expect(() => installCopilotMcp({ configFile })).toThrow(/mcpServers must be an object/);
  });
});
