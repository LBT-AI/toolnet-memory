import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installCursorIntegration } from '../../src/session/cursor/installer.js';
import { installCopilotIntegration } from '../../src/session/copilot/installer.js';
import { installGrokIntegration } from '../../src/session/grok/installer.js';

import { inspectNewAgentIntegrationStatus } from '../../src/session/new-agents/status.js';

describe('Phase 05 combined new-agent integrations', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function makeRoot(label: string): string {
    const root = mkdtempSync(join(tmpdir(), `toolnet-p05-${label}-`));
    roots.push(root);
    return root;
  }

  it('installs Cursor and reports ready/idempotent', () => {
    const root = makeRoot('cursor');
    const configFile = join(root, '.cursor', 'mcp.json');
    const hooksFile = join(root, '.cursor', 'hooks.json');

    expect(installCursorIntegration({ configFile, hooksFile }).changed).toBe(true);

    expect(installCursorIntegration({ configFile, hooksFile }).changed).toBe(false);

    const status = inspectNewAgentIntegrationStatus('cursor', {
      configFile,
      hooksFile,
    });

    expect(status.state).toBe('ready');
    expect(status.hooks.events).toHaveLength(6);
  });

  it('installs Copilot and reports ready/idempotent', () => {
    const root = makeRoot('copilot');
    const configFile = join(root, '.copilot', 'mcp-config.json');
    const hooksFile = join(root, '.copilot', 'hooks', 'toolnet-memory.json');

    expect(installCopilotIntegration({ configFile, hooksFile }).changed).toBe(true);

    expect(installCopilotIntegration({ configFile, hooksFile }).changed).toBe(false);

    const status = inspectNewAgentIntegrationStatus('copilot', {
      configFile,
      hooksFile,
    });

    expect(status.state).toBe('ready');
    expect(status.hooks.events).toHaveLength(6);
  });

  it('installs Grok and reports MCP/hooks/skill ready', () => {
    const root = makeRoot('grok');
    const configFile = join(root, '.grok', 'config.toml');
    const hooksFile = join(root, '.grok', 'hooks', 'toolnet-memory.json');
    const skillFile = join(root, '.grok', 'skills', 'toolnet-continuity', 'SKILL.md');

    expect(installGrokIntegration({ configFile, hooksFile, skillFile }).changed).toBe(true);

    expect(installGrokIntegration({ configFile, hooksFile, skillFile }).changed).toBe(false);

    const status = inspectNewAgentIntegrationStatus('grok', {
      configFile,
      hooksFile,
      skillFile,
    });

    expect(status.state).toBe('ready');
    expect(status.hooks.events).toHaveLength(5);
    expect(status.skill?.configured).toBe(true);
  });
});
