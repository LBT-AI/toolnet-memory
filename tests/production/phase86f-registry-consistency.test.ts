/*
 * Phase 86F — README / release-manifest / registry consistency.
 *
 * README and release-manifest must derive from the canonical registry, not
 * from hand-maintained copies. Any drift fails here with the exact delta.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { integrationDisplayName } from '../../src/production/auto-integrate.js';
import {
  AGENT_INTEGRATION_CAPABILITIES,
  SUPPORTED_INTEGRATION_AGENTS,
} from '../../src/session/integration-capabilities.js';
import { buildIntegrationMatrix } from '../../src/session/integration-matrix.js';

function readmeAgentsSection(): string {
  const readme = readFileSync('README.md', 'utf8');
  const start = readme.indexOf('## Supported Coding Agents');
  const end = readme.indexOf('## Quick Start', start);
  return readme.slice(start, end < 0 ? undefined : end);
}

function manifestAgents(): Record<
  string,
  { displayName: string; refreshMode: string; captureMode: string }
> {
  const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8')) as {
    agents: Record<string, { displayName: string; refreshMode: string; captureMode: string }>;
  };
  return manifest.agents;
}

describe('Phase 86F — README matches the canonical registry', () => {
  it('lists exactly the canonical agent set by display name', () => {
    const section = readmeAgentsSection();
    const expected = [...SUPPORTED_INTEGRATION_AGENTS].map((agent) =>
      integrationDisplayName(agent as never)
    );

    const missing = expected.filter((name) => !section.includes(name));
    expect(missing).toEqual([]);

    expect(section).toContain(`${expected.length}-agent continuity ring`);
  });

  it('places every agent in its registry capture-mode row', () => {
    const section = readmeAgentsSection();
    const rows = buildIntegrationMatrix();

    const rowFor = (label: string): string => {
      const line = section.split('\n').find((item) => item.includes(label));
      if (!line) throw new Error(`README capability table has no row for ${label}`);
      return line;
    };

    const nativeRow = rowFor('Native lifecycle / refresh');
    for (const row of rows.filter(
      (item) => item.refreshMode === 'native-lifecycle' && item.agent !== 'junie'
    )) {
      expect(nativeRow, integrationDisplayName(row.agent as never)).toContain(
        integrationDisplayName(row.agent as never)
      );
    }

    const eapRow = rowFor('Native lifecycle (EAP)');
    expect(eapRow).toContain('Junie');

    expect(rowFor('Persistent plugin refresh')).toContain('OpenCode');
    expect(rowFor('Managed wrapper')).toContain('Aider');
    expect(rowFor('Native session capture')).toContain('ToolNet CLI');
    expect(rowFor('Manual recovery')).toContain('Plandex');
    expect(rowFor('MCP continuity')).toContain('Kilo');

    const blockedRow = rowFor('Blocked / unresolved');
    expect(blockedRow).toContain('OpenRouter CLI');
    expect(blockedRow).toContain('Warp Agent CLI');
  });
});

describe('Phase 86F — release manifest matches the canonical registry', () => {
  it('declares exactly the canonical agent set', () => {
    expect(Object.keys(manifestAgents()).sort()).toEqual([...SUPPORTED_INTEGRATION_AGENTS].sort());
  });

  it('matches refresh mode, capture mode, and display name per agent', () => {
    const agents = manifestAgents();

    for (const agent of SUPPORTED_INTEGRATION_AGENTS) {
      const canonical = AGENT_INTEGRATION_CAPABILITIES[agent];
      const entry = agents[agent];

      expect(entry.displayName).toBe(integrationDisplayName(agent as never));
      expect(entry.refreshMode).toBe(canonical.refreshMode);
      expect(entry.captureMode).toBe(canonical.captureMode);
    }
  });

  it('keeps v0.6.2 release provenance historical', () => {
    const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8')) as {
      version: string;
      hardening: {
        releaseEngineering: {
          sourcePhase: number;
          certificationThrough: string;
          releaseBaseline: string;
          targetVersion: string;
        };
      };
    };

    // Provenance of the v0.6.2 release itself — not a claim about this source.
    expect(manifest.version).toBe('0.6.2');
    expect(manifest.hardening.releaseEngineering.sourcePhase).toBe(84);
    expect(manifest.hardening.releaseEngineering.certificationThrough).toBe('Phase85B');
    expect(manifest.hardening.releaseEngineering.releaseBaseline).toBe('v0.6.1');
    expect(manifest.hardening.releaseEngineering.targetVersion).toBe('0.6.2');
  });
});
