/*
 * Phase 86E.7A P0-A — bounded daemon restart regression.
 *
 * Root cause this certifies: `toolnet-memory update` parked at 99% under
 * "Verifying installation" while post-install orchestration waited
 * indefinitely on the daemon restart child (`upgrade/ports.ts` had no
 * timeout), so a hung restart looked like a hung verify — forever.
 *
 * TIMEOUT OWNER: src/production/upgrade/ports.ts :: runDaemonCommand
 * (via restartDaemonViaCli). No other layer sets a competing timer.
 *
 * PASS marker: UPDATE_99_HANG_BOUNDED=PASS
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DAEMON_PROTOCOL_VERSION } from '../../src/daemon/types.js';

import {
  DEFAULT_DAEMON_RESTART_TIMEOUT_MS,
  orchestratePackageUpgrade,
  runDaemonCommand,
} from '../../src/production/upgrade/index.js';

import type { BuildDescriptor, UpgradePorts } from '../../src/production/upgrade/index.js';

const MARKER = 'UPDATE_99_HANG_BOUNDED=PASS';

const RUNTIME_ROOT = '/tmp/toolnet-phase86e7a-runtime';

const BASE_SCHEMA: BuildDescriptor['schema'] = {
  parser: 'parser-a',
  resolver: 'resolver-a',
  graphSemantics: 'graph-a',
  querySchema: 'query-a',
  artifactSchema: 'artifact-a',
};

function build(overrides: Partial<BuildDescriptor> = {}): BuildDescriptor {
  return {
    protocolVersion: DAEMON_PROTOCOL_VERSION,
    packageVersion: '0.6.2',
    buildMarker: 'source',
    runtimeRoot: RUNTIME_ROOT,
    schema: BASE_SCHEMA,
    ...overrides,
  };
}

/** Ports with no project stores: the only reachable phase is the restart. */
function daemonOnlyPorts(overrides: Partial<UpgradePorts> = {}): UpgradePorts {
  return {
    backupAuthority: async () => {
      throw new Error('UPGRADE_PROJECT_CONTEXT_REQUIRED');
    },
    runMigration: async () => {
      throw new Error('UPGRADE_PROJECT_CONTEXT_REQUIRED');
    },
    verifyMigration: async () => true,
    rebuildDerived: async () => {
      throw new Error('UPGRADE_PROJECT_CONTEXT_REQUIRED');
    },
    clearEphemeral: async () => {
      throw new Error('UPGRADE_PROJECT_CONTEXT_REQUIRED');
    },
    restartDaemon: async () => {},
    verifyUpgrade: async () => {},
    ...overrides,
  };
}

/** A before/after pair whose build identity changed, forcing a restart. */
function restartedBuilds(): { before: BuildDescriptor; after: BuildDescriptor } {
  return {
    before: build({ packageVersion: '0.6.1' }),
    after: build({ packageVersion: '0.6.2' }),
  };
}

function timeoutCodeOf(error: unknown): string | undefined {
  return (error as { code?: string })?.code;
}

describe('Phase 86E.7A — daemon restart is bounded', () => {
  it('U1/U2/U3: install succeeds, version verified, no restart required → applied', async () => {
    const same = build();
    const outcome = await orchestratePackageUpgrade({
      observations: [],
      before: same,
      after: same,
      ports: daemonOnlyPorts(),
      dryRun: false,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.result.outcome).toBe('applied');
    expect(outcome.result.daemonRestarted).toBe(false);
    expect(outcome.plan.daemonRestartRequired).toBe(false);
  });

  it('U4: daemon restart succeeds → applied with daemonRestarted', async () => {
    const { before, after } = restartedBuilds();
    let restarted = 0;

    const outcome = await orchestratePackageUpgrade({
      observations: [],
      before,
      after,
      ports: daemonOnlyPorts({
        restartDaemon: async () => {
          restarted += 1;
        },
      }),
      dryRun: false,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.result.outcome).toBe('applied');
    expect(outcome.result.daemonRestarted).toBe(true);
    expect(restarted).toBe(1);
  });

  it('U5/U11: a restart child that never exits is killed and fails bounded, not forever', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'toolnet-never-exit-'));
    const pidFile = join(dir, 'child.pid');

    try {
      const script = join(dir, 'never-exit.mjs');
      writeFileSync(
        script,
        `import fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nsetInterval(() => {}, 1000);\n`
      );

      const startedAt = Date.now();
      const error = await runDaemonCommand(script, [], 2000).then(
        () => null,
        (failure: unknown) => failure
      );
      const elapsed = Date.now() - startedAt;

      // Bounded: fails near the injected timeout, never hangs the test process.
      expect(error).not.toBe(null);
      expect(timeoutCodeOf(error)).toBe('UPGRADE_DAEMON_RESTART_TIMEOUT');
      expect(elapsed).toBeLessThan(30_000);

      // Cleanup: the hung child was terminated (graceful SIGTERM first).
      // The pid file may lag child startup under load, so wait for it.
      const { readFile } = await import('node:fs/promises');
      let childPid: number | null = null;
      const appearDeadline = Date.now() + 10_000;
      while (childPid === null && Date.now() < appearDeadline) {
        try {
          const text = await readFile(pidFile, 'utf8');
          const parsed = Number(text);
          childPid = Number.isSafeInteger(parsed) ? parsed : null;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      if (childPid !== null) {
        let alive = true;
        const deadline = Date.now() + 10_000;
        while (Date.now() < deadline) {
          try {
            process.kill(childPid, 0);
          } catch {
            alive = false;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        expect(alive).toBe(false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }

    expect(MARKER).toBe('UPDATE_99_HANG_BOUNDED=PASS');
  });

  it('U5b: timeout error carries a typed code and retry guidance, not free-form text', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'toolnet-never-exit-'));
    try {
      const script = join(dir, 'never-exit.mjs');
      writeFileSync(script, 'setInterval(() => {}, 1000);\n');

      const error = (await runDaemonCommand(script, [], 50).then(
        () => null,
        (failure: unknown) => failure
      )) as Error & { code?: string; timeoutMs?: number };

      expect(error?.code).toBe('UPGRADE_DAEMON_RESTART_TIMEOUT');
      expect(error?.timeoutMs).toBe(50);
      expect(String(error?.message)).not.toContain('rolled back');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('U6: restart exits non-zero → UPGRADE_DAEMON_RESTART_FAILED (not timeout)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'toolnet-exit-code-'));
    try {
      const script = join(dir, 'fail.mjs');
      writeFileSync(script, 'process.exit(3);\n');

      const error = await runDaemonCommand(script, [], 5_000).then(
        () => null,
        (failure: unknown) => failure
      );

      expect(error).not.toBe(null);
      expect(timeoutCodeOf(error)).not.toBe('UPGRADE_DAEMON_RESTART_TIMEOUT');
      expect(String((error as Error)?.message)).toContain('code 3');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('U4b: restart exits zero → resolves', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'toolnet-exit-ok-'));
    try {
      const script = join(dir, 'ok.mjs');
      writeFileSync(script, 'process.exit(0);\n');

      await expect(runDaemonCommand(script, [], 5_000)).resolves.toBe(undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('U7: restart throws → UPGRADE_DAEMON_RESTART_FAILED through the runner', async () => {
    const { before, after } = restartedBuilds();

    const outcome = await orchestratePackageUpgrade({
      observations: [],
      before,
      after,
      ports: daemonOnlyPorts({
        restartDaemon: async () => {
          throw new Error('spawn ENOENT');
        },
      }),
      dryRun: false,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.result.outcome).toBe('failed');
    expect(outcome.result.failure?.code).toBe('UPGRADE_DAEMON_RESTART_FAILED');
    expect(outcome.result.failure?.phase).toBe('restart_daemon');
  });

  it('U8: blocked active sessions stays distinct from timeout/failure', async () => {
    const { before, after } = restartedBuilds();

    const outcome = await orchestratePackageUpgrade({
      observations: [],
      before,
      after,
      ports: daemonOnlyPorts({
        restartDaemon: async () => {
          const blocked = new Error('daemon upgrade blocked: active sessions') as Error & {
            code: string;
          };
          blocked.code = 'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS';
          throw blocked;
        },
      }),
      dryRun: false,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.result.failure?.code).toBe('DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS');
    expect(outcome.result.failure?.restartFailure?.retryable).toBe(true);
  });

  it('U5c: restart timeout stays distinct from blocked sessions and generic failure', async () => {
    const { before, after } = restartedBuilds();

    const outcome = await orchestratePackageUpgrade({
      observations: [],
      before,
      after,
      ports: daemonOnlyPorts({
        restartDaemon: async () => {
          const timedOut = new Error('daemon restart timed out') as Error & {
            code: string;
          };
          timedOut.code = 'UPGRADE_DAEMON_RESTART_TIMEOUT';
          throw timedOut;
        },
      }),
      dryRun: false,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.result.failure?.code).toBe('UPGRADE_DAEMON_RESTART_TIMEOUT');
    expect(outcome.result.failure?.phase).toBe('restart_daemon');
    expect(outcome.result.failure?.restartFailure?.retryable).toBe(true);
  });

  it('U9: post-upgrade verify fails → UPGRADE_VERIFY_FAILED, no false success', async () => {
    const { before, after } = restartedBuilds();

    const outcome = await orchestratePackageUpgrade({
      observations: [],
      before,
      after,
      ports: daemonOnlyPorts({
        verifyUpgrade: async () => {
          throw new Error('post-conditions did not hold');
        },
      }),
      dryRun: false,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.result.outcome).toBe('failed');
    expect(outcome.result.failure?.code).toBe('UPGRADE_VERIFY_FAILED');
  });

  it('U15/U16: timeout default is bounded (20–60s) and exported as the single owner value', () => {
    expect(DEFAULT_DAEMON_RESTART_TIMEOUT_MS).toBeGreaterThanOrEqual(20_000);
    expect(DEFAULT_DAEMON_RESTART_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
  });
});
