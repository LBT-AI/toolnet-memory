import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installKiroIntegration } from '../../src/session/kiro/installer.js';

import { inspectKiroIntegrationStatus } from '../../src/session/kiro/status.js';

describe('Kiro combined integration', () => {
  const roots: string[] = [];

  function paths() {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kiro-integration-'));

    roots.push(root);

    return {
      root,

      configFile: join(root, '.kiro', 'settings', 'mcp.json'),

      hooksFile: join(root, '.kiro', 'hooks', 'toolnet-memory.json'),
    };
  }

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('installs MCP and hooks as one verified Kiro integration', () => {
    const target = paths();

    const result = installKiroIntegration({
      binary: '/opt/toolnet-memory/bin/toolnet-memory',

      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    const status = inspectKiroIntegrationStatus({
      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    expect(result.installed).toBe(true);

    expect(result.changed).toBe(true);

    expect(status.installed).toBe(true);

    expect(status.state).toBe('ready');

    expect(status.mcp.configured).toBe(true);

    expect(status.hooks.configured).toBe(true);

    expect(status.hooks.triggers).toEqual(
      expect.arrayContaining([
        'SessionStart',
        'UserPromptSubmit',
        'PreToolUse',
        'PostToolUse',
        'Stop',
      ])
    );
  });

  it('is idempotent across the complete integration', () => {
    const target = paths();

    installKiroIntegration({
      binary: 'toolnet-memory',

      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    const mcpBefore = readFileSync(target.configFile, 'utf8');

    const hooksBefore = readFileSync(target.hooksFile, 'utf8');

    const second = installKiroIntegration({
      binary: 'toolnet-memory',

      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    expect(second.changed).toBe(false);

    expect(readFileSync(target.configFile, 'utf8')).toBe(mcpBefore);

    expect(readFileSync(target.hooksFile, 'utf8')).toBe(hooksBefore);
  });

  it('reports partial state when only MCP is present', () => {
    const target = paths();

    installKiroIntegration({
      binary: 'toolnet-memory',

      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    rmSync(target.hooksFile, {
      force: true,
    });

    const status = inspectKiroIntegrationStatus({
      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    expect(status.installed).toBe(false);

    expect(status.state).toBe('partial');

    expect(status.mcp.configured).toBe(true);

    expect(status.hooks.configured).toBe(false);
  });

  it('reports invalid state without modifying malformed config', () => {
    const target = paths();

    installKiroIntegration({
      binary: 'toolnet-memory',

      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    writeFileSync(target.hooksFile, '{bad-json');

    const status = inspectKiroIntegrationStatus({
      configFile: target.configFile,

      hooksFile: target.hooksFile,
    });

    expect(status.installed).toBe(false);

    expect(status.state).toBe('invalid');

    expect(status.errors.length).toBeGreaterThan(0);
  });
});
