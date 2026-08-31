import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installAutoIntegrations } from '../../src/production/auto-integrate.js';
import type { AgentDetection } from '../../src/production/integration-detection.js';

describe('Phase 05 new-agent auto-integrate', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns 10 agents and installs Cursor/Copilot/Grok when detected', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-p05-auto-'));
    roots.push(root);

    const enabled = new Set(['cursor', 'copilot', 'grok']);

    const detections: AgentDetection[] = [
      'agy',
      'opencode',
      'claude',
      'kiro',
      'cursor',
      'copilot',
      'grok',
      'codex',
    ].map((agent) => ({
      agent: agent as AgentDetection['agent'],
      detected: enabled.has(agent),
      commandDetected: enabled.has(agent),
      configDetected: false,
      evidence: [],
    }));

    const results = installAutoIntegrations({
      detections,
      cwd: root,
      cursor: {
        configFile: join(root, '.cursor', 'mcp.json'),
        hooksFile: join(root, '.cursor', 'hooks.json'),
      },
      copilot: {
        configFile: join(root, '.copilot', 'mcp-config.json'),
        hooksFile: join(root, '.copilot', 'hooks', 'toolnet-memory.json'),
      },
      grok: {
        configFile: join(root, '.grok', 'config.toml'),
        hooksFile: join(root, '.grok', 'hooks', 'toolnet-memory.json'),
        skillFile: join(root, '.grok', 'skills', 'toolnet-continuity', 'SKILL.md'),
      },
    });

    expect(results).toHaveLength(10);

    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      const result = results.find((item) => item.agent === agent);
      expect(result?.detected).toBe(true);
      expect(result?.installed).toBe(true);
      expect(result?.error).toBeUndefined();
    }
  });
});
