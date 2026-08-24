import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installCursorMcp } from '../../src/session/cursor/mcp-installer.js';

describe('Cursor MCP installer', () => {
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
    const root = mkdtempSync(join(tmpdir(), 'toolnet-cursor-mcp-'));
    roots.push(root);

    return join(root, '.cursor', 'mcp.json');
  }

  it('creates a valid Cursor stdio MCP entry', () => {
    const configFile = fixture();

    const result = installCursorMcp({
      configFile,
      binary: '/usr/local/bin/toolnet-memory',
    });

    expect(result.changed).toBe(true);

    const json = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(json.mcpServers['toolnet-memory']).toEqual({
      type: 'stdio',
      command: '/usr/local/bin/toolnet-memory',
      args: ['mcp'],
    });
  });

  it('preserves unrelated Cursor settings and MCP servers', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });

    writeFileSync(
      configFile,
      JSON.stringify(
        {
          custom: {
            keep: true,
          },
          mcpServers: {
            existing: {
              command: 'existing-server',
              args: [],
            },
          },
        },
        null,
        2
      )
    );

    installCursorMcp({ configFile });

    const json = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(json.custom).toEqual({ keep: true });
    expect(json.mcpServers.existing.command).toBe('existing-server');
    expect(json.mcpServers['toolnet-memory'].command).toBe('toolnet-memory');
  });

  it('is idempotent', () => {
    const configFile = fixture();

    const first = installCursorMcp({ configFile });
    const firstText = readFileSync(configFile, 'utf8');

    const second = installCursorMcp({ configFile });
    const secondText = readFileSync(configFile, 'utf8');

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(secondText).toBe(firstText);
  });

  it('repairs a stale ToolNet entry without touching other servers', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });

    writeFileSync(
      configFile,
      JSON.stringify({
        mcpServers: {
          other: {
            command: 'other',
          },
          'toolnet-memory': {
            command: 'old-toolnet',
            args: ['bad'],
          },
        },
      })
    );

    installCursorMcp({
      configFile,
      binary: 'toolnet-memory',
    });

    const json = JSON.parse(readFileSync(configFile, 'utf8'));

    expect(json.mcpServers.other.command).toBe('other');
    expect(json.mcpServers['toolnet-memory']).toEqual({
      type: 'stdio',
      command: 'toolnet-memory',
      args: ['mcp'],
    });
  });

  it('fails safely on invalid JSON', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });
    writeFileSync(configFile, '{ nope');

    expect(() => installCursorMcp({ configFile })).toThrow(/Invalid existing Cursor MCP config/);

    expect(readFileSync(configFile, 'utf8')).toBe('{ nope');
  });

  it('fails when mcpServers is not an object', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });
    writeFileSync(configFile, JSON.stringify({ mcpServers: [] }));

    expect(() => installCursorMcp({ configFile })).toThrow(/mcpServers must be an object/);
  });
});
