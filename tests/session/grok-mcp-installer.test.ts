import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installGrokMcp } from '../../src/session/grok/mcp-installer.js';

describe('Grok Build MCP installer', () => {
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
    const root = mkdtempSync(join(tmpdir(), 'toolnet-grok-mcp-'));
    roots.push(root);

    return join(root, '.grok', 'config.toml');
  }

  it('creates the official mcp_servers ToolNet section', () => {
    const configFile = fixture();

    const result = installGrokMcp({
      configFile,
      binary: '/usr/local/bin/toolnet-memory',
    });

    expect(result.changed).toBe(true);

    const toml = readFileSync(configFile, 'utf8');

    expect(toml).toContain('[mcp_servers."toolnet-memory"]');
    expect(toml).toContain('command = "/usr/local/bin/toolnet-memory"');
    expect(toml).toContain('args = ["mcp"]');
    expect(toml).toContain('enabled = true');
  });

  it('preserves unrelated Grok TOML content exactly outside ToolNet section', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });

    const original = [
      '# user Grok config',
      '[models]',
      'default = "grok-build"',
      '',
      '[ui]',
      'compact_mode = false',
      '',
    ].join('\n');

    writeFileSync(configFile, original);

    installGrokMcp({ configFile });

    const toml = readFileSync(configFile, 'utf8');

    expect(toml).toContain('# user Grok config');
    expect(toml).toContain('[models]');
    expect(toml).toContain('default = "grok-build"');
    expect(toml).toContain('[ui]');
    expect(toml).toContain('compact_mode = false');
  });

  it('is idempotent', () => {
    const configFile = fixture();

    const first = installGrokMcp({ configFile });
    const firstText = readFileSync(configFile, 'utf8');

    const second = installGrokMcp({ configFile });
    const secondText = readFileSync(configFile, 'utf8');

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(secondText).toBe(firstText);
  });

  it('replaces only an existing ToolNet MCP section', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });

    writeFileSync(
      configFile,
      [
        '[models]',
        'default = "grok-build"',
        '',
        '[mcp_servers."toolnet-memory"]',
        'command = "old-toolnet"',
        'args = ["wrong"]',
        'enabled = false',
        '',
        '[mcp_servers.linear]',
        'url = "https://mcp.linear.app/mcp"',
        '',
      ].join('\n')
    );

    installGrokMcp({
      configFile,
      binary: 'toolnet-memory',
    });

    const toml = readFileSync(configFile, 'utf8');

    expect(toml).toContain('[models]');
    expect(toml).toContain(
      '[mcp_servers."toolnet-memory"]\ncommand = "toolnet-memory"\nargs = ["mcp"]\nenabled = true'
    );
    expect(toml).toContain('[mcp_servers.linear]');
    expect(toml).toContain('url = "https://mcp.linear.app/mcp"');
    expect(toml).not.toContain('old-toolnet');
  });

  it('recognizes an unquoted existing ToolNet section', () => {
    const configFile = fixture();
    mkdirSync(dirname(configFile), { recursive: true });

    writeFileSync(
      configFile,
      [
        '[mcp_servers.toolnet-memory]',
        'command = "toolnet-memory"',
        'args = ["mcp"]',
        'enabled = true',
        '',
      ].join('\n')
    );

    const result = installGrokMcp({ configFile });

    expect(result.changed).toBe(false);
  });

  it('escapes a custom binary safely as a TOML string', () => {
    const configFile = fixture();

    installGrokMcp({
      configFile,
      binary: '/tmp/path with "quote"/toolnet-memory',
    });

    const toml = readFileSync(configFile, 'utf8');

    expect(toml).toContain('command = "/tmp/path with \\"quote\\"/toolnet-memory"');
  });
});
