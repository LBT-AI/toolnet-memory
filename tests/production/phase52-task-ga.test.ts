import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { inspectProductionTaskHealth } from '../../src/production/task-health.js';
import { migrateTaskProjection } from '../../src/production/task-migrate.js';
import { TaskStore, taskProjectionPath } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase52-'));
  roots.push(rootPath);
  return {
    id: `phase52-${roots.length}`,
    name: 'phase52',
    remote: 'phase52',
    rootPath,
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Phase 52 Production GA', () => {
  it('restores guided local storage setup without LLM configuration', () => {
    const home = mkdtempSync(join(tmpdir(), 'toolnet-setup-home-'));
    roots.push(home);
    const executable = join(
      process.cwd(),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
    );
    const result = spawnSync(
      executable,
      [
        'src/production/setup.ts',
        '--section',
        'storage',
        '--provider',
        'local',
        '--non-interactive',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, HOME: home, USERPROFILE: home },
      }
    );
    expect(result.status).toBe(0);
    const envFile = join(home, '.config', 'toolnet-memory', '.env');
    const content = readFileSync(envFile, 'utf8');
    expect(content).toContain('MEMORY_STORAGE_PROVIDER=local');
    expect(content).not.toMatch(/LLM_PROVIDER|EMBEDDING_PROVIDER|OPENAI_API_KEY/u);
    if (process.platform !== 'win32') expect(statSync(envFile).mode & 0o777).toBe(0o600);
  });

  it('exposes setup and migration through npm CLI, standalone CLI, and production bundle', () => {
    const npmCli = readFileSync('bin/toolnet-memory', 'utf8');
    const standalone = readFileSync('src/standalone/cli.ts', 'utf8');
    const bundle = readFileSync('scripts/build-bundle.mjs', 'utf8');
    expect(npmCli).toContain('setup)');
    expect(npmCli).toContain('task:migrate)');
    expect(standalone).toContain("case 'setup':");
    expect(standalone).toContain("case 'task:migrate':");
    expect(bundle).toContain("setup: 'src/production/setup.ts'");
    expect(bundle).toContain("'task-migrate': 'src/production/task-migrate-cli.ts'");
  });

  it('reports Persistent Task health from the canonical TaskStore', async () => {
    const p = project();
    const store = new TaskStore(p);
    await store.createTask({ kind: 'task', title: 'Pending' });
    await store.createTask({ kind: 'task', title: 'Another' });
    expect(inspectProductionTaskHealth(p)).toMatchObject({
      ok: true,
      total: 2,
      pending: 2,
      conflicts: 0,
      operationCount: 2,
    });
  });

  it('rebuilds missing state.json without rewriting Task history', async () => {
    const p = project();
    const store = new TaskStore(p);
    const task = await store.createTask({ kind: 'task', title: 'Migration survives' });
    const operationCount = store.projection().operationCount;
    rmSync(taskProjectionPath(p), { force: true });
    expect(migrateTaskProjection(p)).toMatchObject({
      tasks: 1,
      operations: operationCount,
      rebuilt: true,
    });
    const restarted = new TaskStore(p);
    expect(restarted.getTask(task.id)?.title).toBe('Migration survives');
    expect(restarted.projection().operationCount).toBe(operationCount);
  });
});
