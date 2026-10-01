import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { certifyWikiFleetState } from '../../src/production/wiki-fleet-certify.js';
import { runWikiRepair } from '../../src/production/wiki-state.js';
import type { ProjectManifest } from '../../src/core/types.js';

class FakeStorage {
  readonly data = new Map<string, string>();

  readonly writes: string[] = [];

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.writes.push(key);
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }
}

function project(): ProjectManifest {
  return {
    id: 'phase86e-cert',
    name: 'phase86e-cert',
    remote: 'phase86e-cert',
    rootPath: '/tmp/phase86e-cert',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

describe('Phase 86E — Wiki / Fleet certification', () => {
  it('certifies the Wiki and Fleet state-recovery contract', async () => {
    const result = await certifyWikiFleetState();

    expect(result.checks.map((item) => item.id)).toEqual([
      'wiki-state-recovery',
      'fleet-state-recovery',
    ]);
    expect(result.passed, JSON.stringify(result.checks, null, 2)).toBe(true);
  });

  it('a wiki:repair dry run never mutates storage', async () => {
    const storage = new FakeStorage();

    const report = await runWikiRepair(storage, project(), { dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.statusBefore).toBe('unused');
    expect(storage.writes).toEqual([]);
    expect(storage.data.size).toBe(0);
  });

  it('wires the new lifecycle commands into the CLI without duplicates', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');

    expect(bin).toContain('fleet:build)');
    expect(bin).toContain('bundle/fleet-cli.js');
    expect(bin).toContain('wiki:inspect)');
    expect(bin).toContain('wiki:repair)');
    expect(bin).toContain('bundle/wiki-cli.js');

    /* One command each — no duplicate lifecycle entries. */
    expect(bin.match(/fleet:build\)/g)?.length).toBe(1);
    expect(bin.match(/wiki:repair\)/g)?.length).toBe(1);
  });

  it('keeps status and doctor surfaces read-only', () => {
    const statusSource = readFileSync('src/production/status-cli.ts', 'utf8');
    const doctorSource = readFileSync('src/production/doctor.ts', 'utf8');

    for (const source of [statusSource, doctorSource]) {
      expect(source).not.toContain('publishFleetSnapshot');
      expect(source).not.toContain('runWikiRepair');
      expect(source).not.toContain('runFleetBuild(');
    }

    expect(statusSource).toContain('inspectFleetState');
    expect(statusSource).toContain('inspectWikiState');
    expect(doctorSource).toContain('inspectFleetState');
    expect(doctorSource).toContain('inspectWikiState');
  });

  it('read-only Fleet MCP tools never publish', () => {
    for (const file of [
      'src/mcp/tools/fleet-projects.ts',
      'src/mcp/tools/fleet-status.ts',
      'src/mcp/tools/analyze-impact.ts',
    ]) {
      const source = readFileSync(file, 'utf8');

      expect(source).not.toContain('persist: true');
      expect(source).not.toContain('publishFleetSnapshot');
    }
  });
});
