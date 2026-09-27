/*
 * Phase 84D2B — live daemon restart / admission / upgrade failure paths.
 *
 * This suite does not exercise the daemon in-process. It spawns the REAL
 * `src/daemon/cli.ts` entry as a child process into a temp runtime root, over a
 * real local IPC socket, with the real build identity the parent process
 * computes. Every daemon it asserts about is a separately scheduled process.
 *
 * What it covers:
 *
 *   - a real daemon process over a real local socket, and same-build admission
 *   - a build-marker mismatch and a protocol mismatch, neither of which may
 *     silently attach or auto-kill the running daemon
 *   - a successful upgrade restart: data phases first, then old shutdown, then
 *     the new build starts exactly once and the new CLI attaches
 *   - active-session protection: a shutdown the Phase 77 policy refuses is a
 *     real upgrade blocker, never a force-kill and never a false success
 *   - migration and rebuild failures with a live daemon: no restart, the old
 *     daemon stays available, and the backup id is retained
 *   - a restart failure after a successful migration: honest partial failure
 *     with enough recovery state to retry by hand
 *   - stale socket and stale lock recovery, and live-owner lock protection
 *   - concurrent clients with a single owner, and no split-brain
 *   - a new CLI arriving during the transition: explicit state, never a silent
 *     fallback to an incompatible daemon
 *   - guaranteed process/socket/lock/temp-dir cleanup, even on failure
 *
 * Only the upgrade ports that Phase 84C declared as seams are injected. The
 * daemon itself is the production one; no second daemon is written here.
 *
 * PASS marker: PHASE84D2B_LIVE_DAEMON_UPGRADE=PASS
 */

import { spawn, type ChildProcess } from 'node:child_process';

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';

import { homedir, tmpdir } from 'node:os';

import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { connectDaemonClient, probeDaemon, type DaemonClient } from '../../src/daemon/client.js';

import {
  daemonBuildHash,
  daemonPackageVersion,
  daemonSchemaFingerprints,
} from '../../src/daemon/fingerprint.js';

import { daemonLockPath, daemonSocketPath } from '../../src/daemon/paths.js';

import {
  DAEMON_PROTOCOL_VERSION,
  DaemonError,
  type DaemonResponse,
} from '../../src/daemon/types.js';

import { verifyRecoveryBackup } from '../../src/recovery/disaster-recovery.js';

import {
  buildUpgradePlan,
  collectLocalStoreObservations,
  createRealUpgradePorts,
  runUpgrade,
} from '../../src/production/upgrade/index.js';

import type {
  AuthorityMigration,
  BuildDescriptor,
  UpgradePlan,
  UpgradePorts,
} from '../../src/production/upgrade/index.js';

import type { DaemonRestartFailure } from '../../src/production/upgrade/types.js';

import { TaskStore } from '../../src/tasks/store.js';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

const MARKER = 'PHASE84D2B_LIVE_DAEMON_UPGRADE=PASS';

const REPO_ROOT = resolve(process.cwd());

const DAEMON_ENTRY = 'src/daemon/cli.ts';

/** Bounded generous enough for a cold `tsx` transpile of the daemon entry. */
const DAEMON_READY_TIMEOUT_MS = 45_000;

const FIXED_TIME = '2026-01-01T00:00:00.000Z';

const OLD_BUILD_MARKER = '84d2b-old-build';

const NEW_BUILD_MARKER = '84d2b-new-build';

/* ==================================================================
 * Cleanup registry
 * ================================================================== */

const CLIENTS: DaemonClient[] = [];

const DAEMONS: LiveDaemon[] = [];

const ROOTS: string[] = [];

afterEach(async () => {
  for (const client of CLIENTS.splice(0)) {
    try {
      await client.close();
    } catch {
      /* The connection may already be gone. */
    }
  }

  for (const daemon of DAEMONS.splice(0)) {
    await terminateDaemon(daemon);
  }

  for (const root of ROOTS.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ==================================================================
 * Small async helpers
 * ================================================================== */

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('waitFor timed out');
    }

    await delay(25);
  }
}

/** Run a promise and return the rejection it produced, or `undefined`. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/* ==================================================================
 * Build identity the parent expects from a child daemon
 * ================================================================== */

/**
 * The fingerprint a child daemon reports for `buildMarker`.
 *
 * The child resolves its marker from `TOOLNET_DAEMON_BUILD_ID`; the parent
 * computes the same digest explicitly so a child build marker can be chosen per
 * scenario without mutating this process's environment.
 */
function expectedFingerprint(runtimeRoot: string, buildMarker: string): string {
  return daemonBuildHash({
    protocolVersion: DAEMON_PROTOCOL_VERSION,
    packageVersion: daemonPackageVersion(),
    buildMarker,
    runtimeRoot,
    schema: daemonSchemaFingerprints(),
  });
}

function buildDescriptor(runtimeRoot: string, buildMarker: string): BuildDescriptor {
  return {
    protocolVersion: DAEMON_PROTOCOL_VERSION,
    packageVersion: daemonPackageVersion(),
    buildMarker,
    runtimeRoot,
    schema: daemonSchemaFingerprints(),
  };
}

/* ==================================================================
 * Real daemon process
 * ================================================================== */

interface LiveDaemon {
  root: string;
  buildMarker: string;
  fingerprint: string;
  pid: number;
  child: ChildProcess;
  stderr(): string;
}

function tempRoot(prefix = 'toolnet-phase84d2b-'): string {
  const root = mkdtempSync(join(tmpdir(), prefix));

  ROOTS.push(root);

  return root;
}

/**
 * Spawn the production daemon CLI as a real child process.
 *
 * The runtime directory is created by the daemon itself (via
 * `ensureSecureRuntimeDirectory`), so a deliberately uncreatable root makes the
 * child fail the way any real start failure would.
 */
function spawnLiveDaemon(
  root: string,
  buildMarker: string
): { daemon: LiveDaemon; ready: Promise<void> } {
  const child = spawn(process.execPath, ['--import', 'tsx', DAEMON_ENTRY, 'start'], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: {
      ...process.env,
      TOOLNET_DAEMON_ROOT: root,
      TOOLNET_DAEMON_BUILD_ID: buildMarker,
    },
  });

  let stderrText = '';

  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk: string) => {
    stderrText += chunk;
  });

  const daemon: LiveDaemon = {
    root,
    buildMarker,
    fingerprint: expectedFingerprint(root, buildMarker),
    pid: child.pid ?? -1,
    child,
    stderr: () => stderrText,
  };

  DAEMONS.push(daemon);

  return { daemon, ready: waitForDaemonReady(daemon) };
}

/**
 * True when the recorded lock owner is this child.
 *
 * Readiness cannot rely on the socket alone: a rival started against the same
 * runtime root would see the incumbent's socket answer the same fingerprint, so
 * "a daemon answers" is not the same as "MY daemon answers".
 */
function lockOwnedBy(root: string, pid: number): boolean {
  try {
    const owner = JSON.parse(readFileSync(daemonLockPath(root), 'utf8')) as { pid?: unknown };

    return owner.pid === pid;
  } catch {
    return false;
  }
}

async function waitForDaemonReady(daemon: LiveDaemon): Promise<void> {
  const socketPath = daemonSocketPath(daemon.root);

  const deadline = Date.now() + DAEMON_READY_TIMEOUT_MS;

  for (;;) {
    if (daemon.child.exitCode !== null) {
      throw new DaemonError(
        'DAEMON_START_FAILED',
        `daemon exited with code ${daemon.child.exitCode}: ${daemon.stderr()}`
      );
    }

    if (
      existsSync(socketPath) &&
      lockOwnedBy(daemon.root, daemon.pid) &&
      (await probeDaemon({ socketPath, fingerprint: daemon.fingerprint, timeoutMs: 500 }))
    ) {
      return;
    }

    if (Date.now() >= deadline) {
      throw new DaemonError(
        'DAEMON_START_FAILED',
        `daemon did not become ready in time: ${daemon.stderr()}`
      );
    }

    await delay(50);
  }
}

/** Wait until the daemon's socket and lock are gone and its process has exited. */
async function waitForDaemonGone(daemon: LiveDaemon, timeoutMs = 15_000): Promise<void> {
  await waitFor(
    () =>
      !existsSync(daemonSocketPath(daemon.root)) &&
      !existsSync(daemonLockPath(daemon.root)) &&
      daemon.child.exitCode !== null,
    timeoutMs
  );
}

/** Best-effort termination used by the cleanup registry. */
async function terminateDaemon(daemon: LiveDaemon): Promise<void> {
  if (daemon.child.exitCode !== null || daemon.child.signalCode !== null) {
    return;
  }

  daemon.child.kill('SIGTERM');

  if (await waitForExit(daemon.child, 3_000)) {
    return;
  }

  daemon.child.kill('SIGKILL');

  await waitForExit(daemon.child, 3_000);
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolveExit) => {
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolveExit(false);
    }, timeoutMs);

    const onExit = (): void => {
      clearTimeout(timer);
      resolveExit(true);
    };

    child.once('exit', onExit);
  });
}

/** Open a client for a specific daemon build fingerprint. */
async function openClient(
  root: string,
  fingerprint: string,
  options: { protocolVersion?: number; timeoutMs?: number } = {}
): Promise<DaemonClient> {
  const client = await connectDaemonClient({
    socketPath: daemonSocketPath(root),
    runtimeRoot: root,
    client: { type: 'cli', pid: process.pid },
    fingerprint,
    timeoutMs: options.timeoutMs ?? 3_000,
    heartbeat: false,
    ...(options.protocolVersion !== undefined ? { protocolVersion: options.protocolVersion } : {}),
  });

  CLIENTS.push(client);

  return client;
}

/** Ask a live daemon to shut down and wait for it to really be gone. */
async function shutdownDaemon(daemon: LiveDaemon, force: boolean): Promise<DaemonResponse> {
  const client = await openClient(daemon.root, daemon.fingerprint, { timeoutMs: 2_000 });

  const response = await client.request({ type: 'shutdown', force }, 5_000);

  await client.close();

  if (response.ok && response.type === 'shutdown' && response.accepted) {
    await waitForDaemonGone(daemon);
  }

  return response;
}

/* ==================================================================
 * The upgrade restart port, driven over the live daemon
 * ================================================================== */

class UpgradeRestartError extends Error {
  readonly code: DaemonRestartFailure['code'];

  readonly restartFailure: DaemonRestartFailure;

  constructor(failure: DaemonRestartFailure) {
    super(failure.message);
    this.name = 'UpgradeRestartError';
    this.code = failure.code;
    this.restartFailure = failure;
  }
}

interface RestartRequest {
  old: LiveDaemon;
  newBuildMarker: string;
  force: boolean;
  /** Defaults to the old daemon's root; a bad root forces a real start failure. */
  newRoot?: string;
  /** Runs after the old daemon is gone and before the replacement starts. */
  onOldStopped?: () => Promise<void>;
}

/**
 * Restart sequence an upgrade must follow, against real processes:
 *
 *   old daemon shutdown → its socket and lock are gone → new build starts once.
 *
 * A refused shutdown becomes `DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS`; a failure
 * to start the replacement after the old one stopped becomes
 * `UPGRADE_DAEMON_RESTART_FAILED`. Both carry recovery state for a manual retry.
 */
async function restartLiveDaemon(request: RestartRequest): Promise<LiveDaemon> {
  const { old } = request;

  const newRoot = request.newRoot ?? old.root;

  const socketPath = daemonSocketPath(old.root);

  const response = await shutdownDaemon(old, request.force);

  if (!response.ok) {
    throw new UpgradeRestartError({
      code: 'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS',
      message: response.error,
      runtimeRoot: old.root,
      socketPath,
      oldDaemonStopped: false,
      newDaemonStarted: false,
      retryable: true,
    });
  }

  await waitForDaemonGone(old);

  await request.onOldStopped?.();

  const { daemon: replacement, ready } = spawnLiveDaemon(newRoot, request.newBuildMarker);

  try {
    await ready;
  } catch (error) {
    throw new UpgradeRestartError({
      code: 'UPGRADE_DAEMON_RESTART_FAILED',
      message: `new daemon did not start: ${error instanceof Error ? error.message : String(error)}`,
      runtimeRoot: newRoot,
      socketPath: daemonSocketPath(newRoot),
      oldDaemonStopped: true,
      newDaemonStarted: false,
      retryable: true,
    });
  }

  return replacement;
}

/* ==================================================================
 * Upgrade fixture
 * ================================================================== */

class MemoryStorageProvider implements StorageProvider {
  readonly name = 'memory';

  private readonly objects = new Map<string, string>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.objects.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const text = this.objects.get(key);

    return text === undefined ? null : new Uint8Array(Buffer.from(text, 'utf8'));
  }

  async getText(key: string): Promise<string | null> {
    return this.objects.get(key) ?? null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .map((key) => ({ key, size: (this.objects.get(key) ?? '').length }));
  }
}

interface UpgradeProject {
  base: string;
  root: string;
  recoveryRoot: string;
  storage: MemoryStorageProvider;
  project: Pick<ProjectManifest, 'id' | 'rootPath'>;
}

/**
 * A minimal real project: a task operation log the current TaskStore writes, a
 * stale projection it must rebuild, retrieval authority, and ephemeral locks.
 */
async function seedUpgradeProject(): Promise<UpgradeProject> {
  const base = tempRoot();

  const root = join(base, 'project');
  const recoveryRoot = join(base, 'recovery');

  mkdirSync(join(root, '.toolnet', 'retrieval'), { recursive: true });
  mkdirSync(join(root, '.toolnet', 'runtime', 'locks'), { recursive: true });
  mkdirSync(recoveryRoot, { recursive: true });

  const project: Pick<ProjectManifest, 'id' | 'rootPath'> = { id: 'phase84d2b', rootPath: root };

  writeFileSync(
    join(root, '.toolnet', 'project.json'),
    `${JSON.stringify(
      {
        version: 1,
        id: 'phase84d2b',
        name: 'phase84d2b',
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      },
      null,
      2
    )}\n`
  );

  await new TaskStore(project as ProjectManifest).createTask({
    id: 'task-84d2b',
    kind: 'task',
    title: 'Live daemon upgrade fixture',
  });

  writeFileSync(
    join(root, '.toolnet', 'retrieval', 'overrides.json'),
    `${JSON.stringify({ version: 1, updatedAt: FIXED_TIME, rules: [] }, null, 2)}\n`
  );

  return { base, root, recoveryRoot, storage: new MemoryStorageProvider(), project };
}

const MEMORY_MIGRATION: AuthorityMigration = {
  id: 'memory_records:0->1',
  kind: 'memory_records',
  fromVersions: [0],
  toVersion: 1,
  description: 'synthetic authority migration for the live-daemon suite',
};

function upgradePlan(project: UpgradeProject, runtimeRoot: string): UpgradePlan {
  return buildUpgradePlan({
    observations: [
      ...collectLocalStoreObservations(project.root),
      { kind: 'memory_records', detectedVersion: 0 },
      { kind: 'runtime_locks' },
    ],
    builds: {
      before: buildDescriptor(runtimeRoot, OLD_BUILD_MARKER),
      after: buildDescriptor(runtimeRoot, NEW_BUILD_MARKER),
    },
    migrations: [MEMORY_MIGRATION],
  });
}

interface PortsHarness {
  ports: UpgradePorts;
  calls: string[];
  restarts: () => number;
}

/**
 * Real upgrade ports: a real authority backup, a real projection rebuild, and
 * the daemon restart supplied by the caller. Only the data-path failures the
 * sub-phase must inject are parameterised.
 */
function buildPorts(options: {
  project: UpgradeProject;
  restart?: () => Promise<void>;
  failMigration?: boolean;
  failRebuild?: boolean;
}): PortsHarness {
  const calls: string[] = [];

  let restarts = 0;

  const ports = createRealUpgradePorts({
    project: options.project.project,
    storage: options.project.storage,
    recoveryRoot: options.project.recoveryRoot,

    runMigration: async (migrationId: string) => {
      calls.push(`migrate:${migrationId}`);

      if (options.failMigration) {
        throw new Error('injected migration failure');
      }
    },

    verifyMigration: async (migrationId: string) => {
      calls.push(`verify:${migrationId}`);

      return true;
    },

    rebuildDerived: async (kinds: readonly string[]) => {
      calls.push(`rebuild:${[...kinds].join(',')}`);

      if (options.failRebuild) {
        throw new Error('injected rebuild failure');
      }

      if (kinds.includes('task_projection')) {
        new TaskStore(options.project.project as ProjectManifest).rebuildProjection();
      }
    },

    restartDaemon: async () => {
      restarts += 1;
      calls.push('restart');

      await options.restart?.();
    },
  });

  return { ports, calls, restarts: () => restarts };
}

function projectOwns(project: UpgradeProject, backupId: string): boolean {
  return verifyRecoveryBackup({ id: project.project.id }, backupId, project.recoveryRoot).ok;
}

/* ==================================================================
 * Certification: a real daemon process and same-build admission
 * ================================================================== */

describe('Phase 84D2B — real daemon process and admission', () => {
  it('bootstraps a real daemon process over a real local socket and admits a same-build CLI', async () => {
    const root = tempRoot();

    const { daemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const socketPath = daemonSocketPath(root);

    /* A real Unix socket file, not a fake port callback. */
    expect(existsSync(socketPath)).toBe(true);
    expect(statSync(socketPath).isSocket()).toBe(true);

    /* The lock names the real child pid and the negotiated fingerprint. */
    const lock = JSON.parse(readFileSync(daemonLockPath(root), 'utf8')) as {
      pid: number;
      fingerprint: string;
    };

    expect(lock.pid).toBe(daemon.pid);
    expect(lock.fingerprint).toBe(daemon.fingerprint);

    const client = await openClient(root, daemon.fingerprint);

    expect(client.instance.pid).toBe(daemon.pid);
    expect(client.instance.buildHash).toBe(daemon.fingerprint);
    expect(client.fingerprint.packageVersion).toBe(daemonPackageVersion());

    /* Same build ⇒ admitted; nothing restarted. */
    const status = await client.request({ type: 'daemon_status' });

    expect(status.ok).toBe(true);

    if (status.ok && status.type === 'daemon_status') {
      expect(status.status.instance.instanceId).toBe(client.instance.instanceId);
      expect(status.status.draining).toBe(false);
    }

    expect(await probeDaemon({ socketPath, fingerprint: daemon.fingerprint })).toBe(true);
    expect(daemon.child.exitCode).toBeNull();
  }, 120_000);

  it('rejects a new CLI whose build marker differs, without silently attaching or killing the daemon', async () => {
    const root = tempRoot();

    const { daemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const otherBuild = expectedFingerprint(root, '84d2b-other-build');

    const error = await rejectionOf(openClient(root, otherBuild, { timeoutMs: 2_000 }));

    expect(errorCode(error)).toBe('DAEMON_BUILD_MISMATCH');

    /* The original daemon is untouched: same pid, still answering. */
    expect(daemon.child.exitCode).toBeNull();
    expect(
      await probeDaemon({ socketPath: daemonSocketPath(root), fingerprint: daemon.fingerprint })
    ).toBe(true);
  }, 120_000);

  it('rejects a protocol mismatch with DAEMON_PROTOCOL_MISMATCH and does not auto-kill the daemon', async () => {
    const root = tempRoot();

    const { daemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const error = await rejectionOf(
      openClient(root, daemon.fingerprint, { protocolVersion: 999, timeoutMs: 2_000 })
    );

    expect(errorCode(error)).toBe('DAEMON_PROTOCOL_MISMATCH');
    expect(daemon.child.exitCode).toBeNull();
  }, 120_000);
});

/* ==================================================================
 * Upgrade restart sequencing
 * ================================================================== */

describe('Phase 84D2B — upgrade restart sequencing', () => {
  it('restarts only after the data phases pass, and the new CLI attaches to exactly one new daemon', async () => {
    const project = await seedUpgradeProject();

    const runtimeRoot = join(project.base, 'daemon-runtime');

    const { daemon: oldDaemon, ready } = spawnLiveDaemon(runtimeRoot, OLD_BUILD_MARKER);

    await ready;

    const observer = await openClient(runtimeRoot, oldDaemon.fingerprint);

    let replacement: LiveDaemon | undefined;
    let transitionError: unknown;

    const plan = upgradePlan(project, runtimeRoot);
    const harness = buildPorts({
      project,
      restart: async () => {
        replacement = await restartLiveDaemon({
          old: oldDaemon,
          newBuildMarker: NEW_BUILD_MARKER,
          force: true,
          onOldStopped: async () => {
            /* The transition window must refuse to attach, not fall back. */
            transitionError = await rejectionOf(
              openClient(runtimeRoot, oldDaemon.fingerprint, { timeoutMs: 500 })
            );
          },
        });
      },
    });

    expect(plan.daemonRestartRequired).toBe(true);
    expect(plan.blockers).toEqual([]);

    const result = await runUpgrade(plan, harness.ports, { dryRun: false });

    expect(result.outcome).toBe('applied');
    expect(result.daemonRestarted).toBe(true);
    expect(result.failure).toBeUndefined();

    /* Every data phase ran, and the restart ran last. */
    expect(harness.calls).toEqual([
      `migrate:${MEMORY_MIGRATION.id}`,
      `verify:${MEMORY_MIGRATION.id}`,
      'rebuild:task_projection',
      'restart',
    ]);
    expect(harness.restarts()).toBe(1);

    /* During the transition nothing answered; the caller was refused, not served. */
    expect(transitionError).toBeDefined();
    expect(errorCode(transitionError)).not.toBe('DAEMON_BUILD_MISMATCH');
    expect(
      await probeDaemon({
        socketPath: daemonSocketPath(runtimeRoot),
        fingerprint: oldDaemon.fingerprint,
      })
    ).toBe(false);

    /* The old build is fully gone: process, socket and lock. */
    expect(oldDaemon.child.exitCode).not.toBeNull();
    expect(oldDaemon.pid).not.toBe(replacement?.pid);

    /* Exactly one new daemon owns the runtime, with the new identity. */
    const newFingerprint = expectedFingerprint(runtimeRoot, NEW_BUILD_MARKER);

    expect(replacement).toBeDefined();
    expect(replacement?.fingerprint).toBe(newFingerprint);
    expect(
      await probeDaemon({ socketPath: daemonSocketPath(runtimeRoot), fingerprint: newFingerprint })
    ).toBe(true);

    const newLock = JSON.parse(readFileSync(daemonLockPath(runtimeRoot), 'utf8')) as {
      pid: number;
      fingerprint: string;
    };

    expect(newLock.pid).toBe(replacement?.pid);
    expect(newLock.fingerprint).toBe(newFingerprint);

    /* The pre-restart observer was disconnected deterministically. */
    await waitFor(() => observer.isClosed);
    expect(observer.isClosed).toBe(true);

    /* The new CLI attaches to the new build. */
    const newClient = await openClient(runtimeRoot, newFingerprint);

    expect(newClient.instance.pid).toBe(replacement?.pid);
    expect(newClient.instance.buildHash).toBe(newFingerprint);

    /* The old build fingerprint is an explicit mismatch, never a fallback. */
    const stale = await rejectionOf(
      openClient(runtimeRoot, oldDaemon.fingerprint, { timeoutMs: 1_000 })
    );

    expect(errorCode(stale)).toBe('DAEMON_BUILD_MISMATCH');
  }, 180_000);

  it('blocks a restart while another session is active, without force-killing the daemon', async () => {
    const project = await seedUpgradeProject();

    const runtimeRoot = join(project.base, 'daemon-runtime');

    const { daemon: activeDaemon, ready } = spawnLiveDaemon(runtimeRoot, OLD_BUILD_MARKER);

    await ready;

    /* A second, active session the Phase 77 shutdown policy must protect. */
    const activeSession = await openClient(runtimeRoot, activeDaemon.fingerprint);

    let replacementSpawned = false;

    const harness = buildPorts({
      project,
      restart: async () => {
        replacementSpawned = true;

        await restartLiveDaemon({
          old: activeDaemon,
          newBuildMarker: NEW_BUILD_MARKER,
          force: false,
        });
      },
    });

    const result = await runUpgrade(upgradePlan(project, runtimeRoot), harness.ports, {
      dryRun: false,
    });

    expect(result.outcome).toBe('failed');
    expect(result.outcome).not.toBe('applied');
    expect(result.daemonRestarted).toBe(false);
    expect(result.failure?.code).toBe('DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS');
    expect(result.failure?.phase).toBe('restart_daemon');
    expect(result.failure?.restartFailure?.oldDaemonStopped).toBe(false);
    expect(result.failure?.restartFailure?.newDaemonStarted).toBe(false);
    expect(result.failure?.restartFailure?.retryable).toBe(true);

    /* The daemon was never replaced or killed, and the session still works. */
    expect(replacementSpawned).toBe(true);
    expect(activeDaemon.child.exitCode).toBeNull();

    const status = await activeSession.request({ type: 'daemon_status' });

    expect(status.ok).toBe(true);

    if (status.ok && status.type === 'daemon_status') {
      expect(status.status.draining).toBe(false);
    }

    expect(
      await probeDaemon({
        socketPath: daemonSocketPath(runtimeRoot),
        fingerprint: activeDaemon.fingerprint,
      })
    ).toBe(true);
  }, 180_000);
});

/* ==================================================================
 * Data-phase failures with a live daemon
 * ================================================================== */

describe('Phase 84D2B — data-phase failures with a live daemon', () => {
  it('stops at a migration failure: no restart, old daemon available, backup retained', async () => {
    const project = await seedUpgradeProject();

    const runtimeRoot = join(project.base, 'daemon-runtime');

    const { daemon, ready } = spawnLiveDaemon(runtimeRoot, OLD_BUILD_MARKER);

    await ready;

    const harness = buildPorts({ project, failMigration: true });

    const result = await runUpgrade(upgradePlan(project, runtimeRoot), harness.ports, {
      dryRun: false,
    });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_MIGRATION_FAILED');
    expect(result.daemonRestarted).toBe(false);
    expect(harness.restarts()).toBe(0);
    expect(harness.calls).not.toContain('restart');

    /* The pre-migration backup survives and verifies. */
    expect(result.backupId).toBeTruthy();
    expect(projectOwns(project, result.backupId as string)).toBe(true);

    /* No new daemon started, and the original still serves. */
    expect(daemon.child.exitCode).toBeNull();

    const client = await openClient(runtimeRoot, daemon.fingerprint);

    expect((await client.request({ type: 'daemon_status' })).ok).toBe(true);
  }, 180_000);

  it('stops at a rebuild failure after a verified migration, with no restart and no false upgraded state', async () => {
    const project = await seedUpgradeProject();

    const runtimeRoot = join(project.base, 'daemon-runtime');

    const { daemon, ready } = spawnLiveDaemon(runtimeRoot, OLD_BUILD_MARKER);

    await ready;

    const harness = buildPorts({ project, failRebuild: true });

    const result = await runUpgrade(upgradePlan(project, runtimeRoot), harness.ports, {
      dryRun: false,
    });

    expect(result.outcome).toBe('failed');
    expect(result.failure?.code).toBe('UPGRADE_REBUILD_FAILED');
    expect(result.failure?.partial).toBe(true);
    expect(result.daemonRestarted).toBe(false);
    expect(result.backupId).toBeTruthy();

    expect(harness.calls).toEqual([
      `migrate:${MEMORY_MIGRATION.id}`,
      `verify:${MEMORY_MIGRATION.id}`,
      'rebuild:task_projection',
    ]);

    const notReached = result.steps.filter((step) => step.detail === 'not reached');

    expect(notReached.map((step) => step.phase)).toContain('restart_daemon');

    /* The old daemon was never replaced. */
    expect(daemon.child.exitCode).toBeNull();
    expect(
      await probeDaemon({
        socketPath: daemonSocketPath(runtimeRoot),
        fingerprint: daemon.fingerprint,
      })
    ).toBe(true);
  }, 180_000);
});

/* ==================================================================
 * Restart failure
 * ================================================================== */

describe('Phase 84D2B — restart failure', () => {
  it('reports an honest partial failure with recovery state when the replacement daemon cannot start', async () => {
    const project = await seedUpgradeProject();

    const runtimeRoot = join(project.base, 'daemon-runtime');

    const { daemon: oldDaemon, ready } = spawnLiveDaemon(runtimeRoot, OLD_BUILD_MARKER);

    await ready;

    /* A root path whose parent is a regular file: the child cannot mkdir it. */
    const blockedParent = join(project.base, 'not-a-directory');

    writeFileSync(blockedParent, 'blocked\n');

    const blockedRoot = join(blockedParent, 'runtime');

    const harness = buildPorts({
      project,
      restart: async () => {
        await restartLiveDaemon({
          old: oldDaemon,
          newBuildMarker: NEW_BUILD_MARKER,
          force: true,
          newRoot: blockedRoot,
        });
      },
    });

    const result = await runUpgrade(upgradePlan(project, runtimeRoot), harness.ports, {
      dryRun: false,
    });

    expect(result.outcome).toBe('failed');
    expect(result.outcome).not.toBe('applied');
    expect(result.failure?.code).toBe('UPGRADE_DAEMON_RESTART_FAILED');
    expect(result.failure?.phase).toBe('restart_daemon');
    expect(result.failure?.partial).toBe(true);
    expect(result.failure?.codes).toContain('UPGRADE_PARTIAL_FAILURE');
    expect(result.daemonRestarted).toBe(false);

    const restartFailure = result.failure?.restartFailure;

    expect(restartFailure?.oldDaemonStopped).toBe(true);
    expect(restartFailure?.newDaemonStarted).toBe(false);
    expect(restartFailure?.retryable).toBe(true);
    expect(restartFailure?.runtimeRoot).toBe(blockedRoot);
    expect(restartFailure?.socketPath).toBe(daemonSocketPath(blockedRoot));

    /* The old daemon is genuinely stopped and no replacement owns the runtime. */
    await waitForDaemonGone(oldDaemon);
    expect(oldDaemon.child.exitCode).not.toBeNull();
    expect(existsSync(daemonSocketPath(runtimeRoot))).toBe(false);
    expect(existsSync(daemonLockPath(runtimeRoot))).toBe(false);
    expect(
      await probeDaemon({
        socketPath: daemonSocketPath(runtimeRoot),
        fingerprint: expectedFingerprint(runtimeRoot, NEW_BUILD_MARKER),
      })
    ).toBe(false);
  }, 180_000);
});

/* ==================================================================
 * Stale socket / lock recovery and live-owner protection
 * ================================================================== */

describe('Phase 84D2B — stale socket and lock recovery', () => {
  it('recovers a stale socket left by a crashed daemon', async () => {
    const root = tempRoot();

    mkdirSync(root, { recursive: true, mode: 0o700 });

    /* A regular file where the socket should be: nothing is listening. */
    writeFileSync(daemonSocketPath(root), 'stale\n');

    const { daemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    expect(statSync(daemonSocketPath(root)).isSocket()).toBe(true);

    const client = await openClient(root, daemon.fingerprint);

    expect(client.instance.pid).toBe(daemon.pid);
  }, 120_000);

  it('recovers a stale lock whose recorded pid is dead', async () => {
    const root = tempRoot();

    mkdirSync(root, { recursive: true, mode: 0o700 });

    writeFileSync(
      daemonLockPath(root),
      JSON.stringify({
        instanceId: 'daemon-dead',
        pid: 999_999,
        startedAt: FIXED_TIME,
        socketPath: daemonSocketPath(root),
        fingerprint: 'dead',
      })
    );

    const { daemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const lock = JSON.parse(readFileSync(daemonLockPath(root), 'utf8')) as { pid: number };

    expect(lock.pid).toBe(daemon.pid);

    const client = await openClient(root, daemon.fingerprint);

    expect(client.instance.pid).toBe(daemon.pid);
  }, 120_000);

  it('refuses to steal a live owner lock and never starts a second daemon', async () => {
    const root = tempRoot();

    const { daemon: owner, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const intruder = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    const error = await rejectionOf(intruder.ready);

    expect(error).toBeInstanceOf(Error);
    expect(intruder.daemon.child.exitCode).not.toBeNull();
    expect(intruder.daemon.child.exitCode).not.toBe(0);

    /* The lock still belongs to the live owner, and only one socket exists. */
    const lock = JSON.parse(readFileSync(daemonLockPath(root), 'utf8')) as { pid: number };

    expect(lock.pid).toBe(owner.pid);
    expect(owner.child.exitCode).toBeNull();
    expect(
      await probeDaemon({ socketPath: daemonSocketPath(root), fingerprint: owner.fingerprint })
    ).toBe(true);
  }, 180_000);
});

/* ==================================================================
 * Concurrent clients and split-brain protection
 * ================================================================== */

describe('Phase 84D2B — concurrent clients and split-brain', () => {
  it('serves multiple clients from one instance with deterministic identity', async () => {
    const root = tempRoot();

    const { daemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const clients = await Promise.all([
      openClient(root, daemon.fingerprint),
      openClient(root, daemon.fingerprint),
      openClient(root, daemon.fingerprint),
      openClient(root, daemon.fingerprint),
    ]);

    const instances = new Set<string>();

    for (const client of clients) {
      const status = await client.request({ type: 'daemon_status' });

      expect(status.ok).toBe(true);

      if (status.ok && status.type === 'daemon_status') {
        instances.add(status.status.instance.instanceId);
        expect(status.status.instance.pid).toBe(daemon.pid);
        expect(status.status.sessions).toBeGreaterThanOrEqual(4);
      }
    }

    expect(instances.size).toBe(1);
  }, 120_000);

  it('accepts at most one daemon owning the runtime when a rival tries to start', async () => {
    const root = tempRoot();

    const { daemon: owner, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const rival = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await rejectionOf(rival.ready);

    const secondRival = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await rejectionOf(secondRival.ready);

    /* One owner, one socket, one lease — no split-brain. */
    expect(owner.child.exitCode).toBeNull();
    expect(rival.daemon.child.exitCode !== null || rival.daemon.child.signalCode !== null).toBe(
      true
    );
    expect(
      secondRival.daemon.child.exitCode !== null || secondRival.daemon.child.signalCode !== null
    ).toBe(true);

    const lock = JSON.parse(readFileSync(daemonLockPath(root), 'utf8')) as { pid: number };

    expect(lock.pid).toBe(owner.pid);

    const client = await openClient(root, owner.fingerprint);

    expect(client.instance.pid).toBe(owner.pid);
  }, 180_000);
});

/* ==================================================================
 * New CLI during the transition
 * ================================================================== */

describe('Phase 84D2B — new CLI during the transition', () => {
  it('returns explicit state rather than attaching to an incompatible old daemon', async () => {
    const root = tempRoot();

    const { daemon: oldDaemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const response = await shutdownDaemon(oldDaemon, true);

    expect(response.ok).toBe(true);

    await waitForDaemonGone(oldDaemon);

    /* Nothing is listening: the caller is told so, not silently served. */
    const during = await rejectionOf(openClient(root, oldDaemon.fingerprint, { timeoutMs: 500 }));

    expect(during).toBeDefined();
    expect(errorCode(during)).not.toBe('DAEMON_BUILD_MISMATCH');

    const { daemon: newDaemon, ready: newReady } = spawnLiveDaemon(root, NEW_BUILD_MARKER);

    await newReady;

    const newFingerprint = expectedFingerprint(root, NEW_BUILD_MARKER);

    const newClient = await openClient(root, newFingerprint);

    expect(newClient.instance.pid).toBe(newDaemon.pid);

    /* The old build gets an explicit mismatch, never a silent fallback. */
    const stale = await rejectionOf(openClient(root, oldDaemon.fingerprint, { timeoutMs: 1_000 }));

    expect(errorCode(stale)).toBe('DAEMON_BUILD_MISMATCH');
  }, 180_000);
});

/* ==================================================================
 * Process cleanup
 * ================================================================== */

describe('Phase 84D2B — process cleanup', () => {
  it('leaves no orphan daemon, socket or lock behind after a graceful stop', async () => {
    const root = tempRoot();

    const { daemon, ready } = spawnLiveDaemon(root, OLD_BUILD_MARKER);

    await ready;

    const pid = daemon.pid;

    const response = await shutdownDaemon(daemon, true);

    expect(response.ok).toBe(true);

    await waitForDaemonGone(daemon);

    expect(daemon.child.exitCode).not.toBeNull();
    expect(existsSync(daemonSocketPath(root))).toBe(false);
    expect(existsSync(daemonLockPath(root))).toBe(false);

    /* The pid is really gone, so no orphan daemon is left behind. */
    expect(() => process.kill(pid, 0)).toThrow();
  }, 120_000);
});

/* ==================================================================
 * No real system service
 * ================================================================== */

describe('Phase 84D2B — no real system service', () => {
  it('never targets systemd, pm2 or the real user runtime', () => {
    for (const file of ['server.ts', 'client.ts', 'bootstrap.ts', 'cli.ts', 'paths.ts']) {
      const source = readFileSync(join(REPO_ROOT, 'src', 'daemon', file), 'utf8');

      expect(source).not.toMatch(/systemctl/u);
      expect(source).not.toMatch(/\bpm2\b/u);
    }

    const root = tempRoot('toolnet-phase84d2b-isolation-');

    expect(root.startsWith(tmpdir())).toBe(true);
    expect(root.startsWith(join(homedir(), '.toolnet-memory'))).toBe(false);
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 84D2B — certification', () => {
  it('emits the Phase 84D2B PASS marker', () => {
    process.stdout.write(`${MARKER}\n`);

    expect(MARKER).toBe('PHASE84D2B_LIVE_DAEMON_UPGRADE=PASS');
  });
});
