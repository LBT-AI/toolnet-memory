import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { autoGcConfig, autoGcDue, runAutoGcProject } from '../../src/retention/scheduler.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-auto-gc-'));
  roots.push(rootPath);
  mkdirSync(join(rootPath, '.toolnet', 'runtime'), { recursive: true });
  return {
    id: 'auto-gc-project',
    name: 'auto-gc-project',
    remote: 'auto-gc-project',
    rootPath,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 29 automatic GC', () => {
  it('is disabled by default', () => {
    expect(autoGcConfig({}).enabled).toBe(false);
  });

  it('defaults to weekly interval', () => {
    const config = autoGcConfig({ TOOLNET_AUTO_GC: 'on' });
    expect(config.intervalMs).toBe(168 * 60 * 60_000);
    expect(config.includeRemote).toBe(false);
  });

  it('first enabled run is due', () => {
    const p = project();
    expect(autoGcDue(p, autoGcConfig({ TOOLNET_AUTO_GC: 'on' }))).toBe(true);
  });

  it('deletes eligible old runtime temp artifacts', async () => {
    const p = project();
    const temporary = join(p.rootPath, '.toolnet', 'runtime', '.tmp-old');
    writeFileSync(temporary, 'old');
    const old = new Date(Date.now() - 40 * 86_400_000);
    utimesSync(temporary, old, old);
    const result = await runAutoGcProject(
      p,
      autoGcConfig({
        TOOLNET_AUTO_GC: 'on',
        TOOLNET_AUTO_GC_RUNTIME_DAYS: '30',
      }),
      { force: true }
    );
    expect(result.status).toBe('success');
    expect(result.result?.deleted).toBe(1);
  });
});
