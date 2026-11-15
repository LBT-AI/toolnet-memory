/*
 * Phase 86E.7B — standalone route parity regression.
 *
 * The standalone router must mirror every public bin/toolnet-memory route
 * through canonical dispatch (same module, same subcommand argv). Thirteen
 * routes were missing (daemon family, identity, fleet:build,
 * integrate:codex, session:codex sync/recover, wiki inspect/repair,
 * memory:backfill); the static route audit is the primary gate and these
 * assertions pin the restored dispatch targets.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const cli = readFileSync('src/standalone/cli.ts', 'utf8');

function hasCase(command: string): boolean {
  return cli.includes(`case '${command}':`);
}

describe('Phase 86E.7B — standalone route parity', () => {
  it('routes every previously missing command', () => {
    for (const command of [
      'daemon',
      'daemon:status',
      'daemon:start',
      'daemon:stop',
      'daemon:restart',
      'fleet:build',
      'identity',
      'integrate:codex',
      'memory:backfill',
      'session:codex-recover',
      'session:codex-sync',
      'wiki:inspect',
      'wiki:repair',
    ]) {
      expect(hasCase(command), `standalone case '${command}'`).toBe(true);
    }
  });

  it('dispatches through canonical modules with canonical argv', () => {
    expect(cli).toContain("() => import('../daemon/cli.js')");
    expect(cli).toContain("['restart', ...args], () => import('../daemon/cli.js')");
    expect(cli).toContain("['install-notify', ...args], () => import('../session/codex/cli.js')");
    expect(cli).toContain("['sync', ...args], () => import('../session/codex/cli.js')");
    expect(cli).toContain("['recover', ...args], () => import('../session/codex/cli.js')");
    expect(cli).toContain("() => import('../production/identity-cli.js')");
    expect(cli).toContain("() => import('../production/fleet-cli.js')");
    expect(cli).toContain("['inspect', ...args], () => import('../production/wiki-cli.js')");
    expect(cli).toContain("['repair', ...args], () => import('../production/wiki-cli.js')");
    expect(cli).toContain("['backfill', ...args], () => import('../session/learner/cli.js')");
  });

  it('keeps the static route audit green', async () => {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(process.execPath, ['scripts/standalone-route-audit.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('STANDALONE_ROUTE_PARITY=PASS');
  });
});
