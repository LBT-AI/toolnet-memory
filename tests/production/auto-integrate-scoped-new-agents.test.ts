import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { installAutoIntegrations } from '../../src/production/auto-integrate.js';

import type { AgentDetection } from '../../src/production/integration-detection.js';

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function detections(): AgentDetection[] {
  const enabled = new Set(['cursor', 'copilot', 'grok']);

  return ['agy', 'opencode', 'claude', 'kiro', 'cursor', 'copilot', 'grok', 'codex'].map(
    (agent) => ({
      agent: agent as AgentDetection['agent'],
      detected: enabled.has(agent),
      commandDetected: enabled.has(agent),
      configDetected: false,
      evidence: [],
    })
  );
}

function globalOverrides(home: string) {
  return {
    cursor: {
      configFile: join(home, '.cursor', 'mcp.json'),
      hooksFile: join(home, '.cursor', 'hooks.json'),
    },
    copilot: {
      configFile: join(home, '.copilot', 'mcp-config.json'),
      hooksFile: join(home, '.copilot', 'hooks', 'toolnet-memory.json'),
    },
    grok: {
      configFile: join(home, '.grok', 'config.toml'),
      hooksFile: join(home, '.grok', 'hooks', 'toolnet-memory.json'),
      skillFile: join(home, '.grok', 'skills', 'toolnet-continuity', 'SKILL.md'),
    },
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

describe('integrate:auto applies scoped policy to Cursor/Copilot/Grok', () => {
  test('plain directory installs global only and does not create project config', () => {
    const root = tempRoot('toolnet-auto-global-root-');
    const home = tempRoot('toolnet-auto-global-home-');
    const overrides = globalOverrides(home);

    const results = installAutoIntegrations({
      detections: detections(),
      cwd: root,
      ...overrides,
    });

    expect(results).toHaveLength(8);

    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      const result = results.find((item) => item.agent === agent);

      expect(result?.installed).toBe(true);
      expect(result?.scope).toBe('global');
      expect(result?.projectRoot).toBeUndefined();
    }

    expect(existsSync(join(root, '.cursor'))).toBe(false);
    expect(existsSync(join(root, '.github'))).toBe(false);
    expect(existsSync(join(root, '.grok'))).toBe(false);
  });

  test('ToolNet project automatically installs both scopes for all three', () => {
    const root = tempRoot('toolnet-auto-both-root-');
    const home = tempRoot('toolnet-auto-both-home-');
    const overrides = globalOverrides(home);

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(root, '.toolnet', 'project.json'), '{}\n');

    const results = installAutoIntegrations({
      detections: detections(),
      cwd: root,
      ...overrides,
    });

    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      const result = results.find((item) => item.agent === agent);

      expect(result?.installed).toBe(true);
      expect(result?.scope).toBe('both');
      expect(result?.projectRoot).toBe(root);
    }

    expect(existsSync(join(root, '.cursor', 'mcp.json'))).toBe(true);
    expect(existsSync(join(root, '.cursor', 'hooks.json'))).toBe(true);
    expect(existsSync(join(root, '.cursor', 'rules', 'toolnet-memory.mdc'))).toBe(true);

    expect(existsSync(join(root, '.github', 'mcp.json'))).toBe(true);
    expect(existsSync(join(root, '.github', 'hooks', 'toolnet-memory.json'))).toBe(true);
    expect(
      existsSync(join(root, '.github', 'instructions', 'toolnet-memory.instructions.md'))
    ).toBe(true);

    expect(existsSync(join(root, '.grok', 'config.toml'))).toBe(true);
    expect(existsSync(join(root, '.grok', 'hooks', 'toolnet-memory.json'))).toBe(true);
    expect(existsSync(join(root, '.grok', 'skills', 'toolnet-continuity', 'SKILL.md'))).toBe(true);
  });

  test('explicit global overrides ToolNet-project automatic both', () => {
    const root = tempRoot('toolnet-auto-force-global-root-');
    const home = tempRoot('toolnet-auto-force-global-home-');
    const overrides = globalOverrides(home);

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(root, '.toolnet', 'project.json'), '{}\n');

    const results = installAutoIntegrations({
      detections: detections(),
      cwd: root,
      scope: 'global',
      ...overrides,
    });

    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      expect(results.find((item) => item.agent === agent)?.scope).toBe('global');
    }

    expect(existsSync(join(root, '.cursor'))).toBe(false);
    expect(existsSync(join(root, '.github'))).toBe(false);
    expect(existsSync(join(root, '.grok'))).toBe(false);
  });

  test('explicit project installs project-only without writing global overrides', () => {
    const root = tempRoot('toolnet-auto-project-only-root-');
    const home = tempRoot('toolnet-auto-project-only-home-');
    const overrides = globalOverrides(home);

    const results = installAutoIntegrations({
      detections: detections(),
      scope: 'project',
      projectRoot: root,
      ...overrides,
    });

    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      expect(results.find((item) => item.agent === agent)?.scope).toBe('project');
      expect(results.find((item) => item.agent === agent)?.projectRoot).toBe(root);
    }

    expect(existsSync(overrides.cursor.configFile)).toBe(false);
    expect(existsSync(overrides.cursor.hooksFile)).toBe(false);
    expect(existsSync(overrides.copilot.configFile)).toBe(false);
    expect(existsSync(overrides.copilot.hooksFile)).toBe(false);
    expect(existsSync(overrides.grok.configFile)).toBe(false);
    expect(existsSync(overrides.grok.hooksFile)).toBe(false);
    expect(existsSync(overrides.grok.skillFile)).toBe(false);

    expect(existsSync(join(root, '.cursor', 'mcp.json'))).toBe(true);
    expect(existsSync(join(root, '.github', 'mcp.json'))).toBe(true);
    expect(existsSync(join(root, '.grok', 'config.toml'))).toBe(true);
  });
});
