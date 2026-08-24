import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  installAutoIntegrations,
  type AutoIntegrationResult,
} from '../../src/production/auto-integrate.js';

import type { AgentDetection } from '../../src/production/integration-detection.js';

describe('Kiro auto integration wiring', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('installs Kiro when detection reports only Kiro', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kiro-auto-'));

    roots.push(root);

    const configFile = join(root, '.kiro', 'settings', 'mcp.json');

    const hooksFile = join(root, '.kiro', 'hooks', 'toolnet-memory.json');

    const agents: AgentDetection['agent'][] = ['agy', 'opencode', 'claude', 'kiro', 'codex'];

    const detections: AgentDetection[] = agents.map((agent) => ({
      agent,

      detected: agent === 'kiro',

      commandDetected: agent === 'kiro',

      configDetected: false,

      evidence: agent === 'kiro' ? ['command:kiro-cli'] : [],
    }));

    const results = installAutoIntegrations({
      binary: '/opt/toolnet-memory',

      detections,

      cwd: root,

      kiro: {
        configFile,

        hooksFile,
      },
    });

    expect(results).toHaveLength(8);

    const kiro = results.find((result): result is AutoIntegrationResult => result.agent === 'kiro');

    expect(kiro?.detected).toBe(true);

    expect(kiro?.installed).toBe(true);

    expect(kiro?.targets).toContain(configFile);

    expect(kiro?.targets).toContain(hooksFile);

    expect(kiro?.targets).toContain('mcp:toolnet-memory');

    expect(
      results
        .filter((result) => result.agent !== 'kiro')
        .every((result) => !result.detected && !result.installed)
    ).toBe(true);
  });
});
