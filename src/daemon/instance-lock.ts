/*
 * Phase 77 — daemon instance lock.
 *
 * Exactly one daemon may serve a runtime identity. The lock uses real
 * inter-process file creation semantics, and a "pid file exists" check is never
 * sufficient on its own:
 *
 *   - the recorded pid must actually be alive, AND
 *   - that process must handshake as the daemon that wrote the lock.
 *
 * A live pid that fails the handshake means the pid was reused by an unrelated
 * process. The lock is then stale. The unrelated process is never touched.
 */

import { closeSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

import { DaemonError } from './types.js';

export interface DaemonLockOwner {
  instanceId: string;
  pid: number;
  startedAt: string;
  socketPath: string;
  fingerprint: string;
}

export interface InstanceLockHandle {
  path: string;
  owner: DaemonLockOwner;
  release(): void;
}

export interface AcquireDaemonLockOptions {
  lockPath: string;
  owner: DaemonLockOwner;
  /** Confirm the running daemon at `socketPath` is the recorded instance. */
  probe?: (owner: DaemonLockOwner) => Promise<boolean>;
  /** Injectable liveness check; defaults to a signal-0 probe. */
  isProcessAlive?: (pid: number) => boolean;
}

/**
 * Instances this process is currently running.
 *
 * Needed because a same-process startup race cannot be told apart by pid
 * liveness alone: the winner may not be listening yet when a loser probes it.
 */
const liveInstances = new Set<string>();

export function isLiveLocalInstance(instanceId: string): boolean {
  return liveInstances.has(instanceId);
}

export function defaultProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    /* EPERM means the process exists but is owned by another user. */
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function readOwner(lockPath: string): DaemonLockOwner | null {
  try {
    const parsed = JSON.parse(readFileSync(lockPath, 'utf8')) as Partial<DaemonLockOwner>;

    if (
      typeof parsed.instanceId !== 'string' ||
      typeof parsed.pid !== 'number' ||
      typeof parsed.socketPath !== 'string'
    ) {
      return null;
    }

    return {
      instanceId: parsed.instanceId,
      pid: parsed.pid,
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : '',
      socketPath: parsed.socketPath,
      fingerprint: typeof parsed.fingerprint === 'string' ? parsed.fingerprint : '',
    };
  } catch {
    return null;
  }
}

function tryCreate(lockPath: string, owner: DaemonLockOwner): InstanceLockHandle | null {
  let descriptor: number;

  try {
    descriptor = openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return null;
    }

    throw new DaemonError('DAEMON_START_FAILED', `Cannot create daemon lock: ${lockPath}`);
  }

  try {
    writeFileSync(descriptor, JSON.stringify(owner));
  } finally {
    closeSync(descriptor);
  }

  liveInstances.add(owner.instanceId);

  return {
    path: lockPath,
    owner,
    release: () => {
      liveInstances.delete(owner.instanceId);

      const current = readOwner(lockPath);

      /* Only ever remove our own lock. */
      if (!current || current.instanceId === owner.instanceId) {
        try {
          unlinkSync(lockPath);
        } catch {
          /* Already gone. */
        }
      }
    },
  };
}

export async function acquireDaemonInstanceLock(
  options: AcquireDaemonLockOptions
): Promise<InstanceLockHandle> {
  const isProcessAlive = options.isProcessAlive ?? defaultProcessAlive;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const acquired = tryCreate(options.lockPath, options.owner);

    if (acquired) {
      return acquired;
    }

    const existing = readOwner(options.lockPath);

    if (existing) {
      /*
       * Same-process race: another in-process daemon holds the lock. If it is
       * genuinely live in this process it is a hard conflict; if it is a leftover
       * record from a crashed run, it is stale.
       */
      if (existing.pid === process.pid) {
        if (isLiveLocalInstance(existing.instanceId)) {
          throw new DaemonError(
            'DAEMON_LOCKED',
            `A ToolNet daemon is already running in this process (${existing.instanceId}).`
          );
        }

        try {
          unlinkSync(options.lockPath);
        } catch {
          /* Ignore. */
        }

        continue;
      }

      const alive = isProcessAlive(existing.pid);

      if (alive) {
        /**
         * A live pid is not proof: it may be an unrelated process that inherited
         * a recycled pid. Only a successful handshake proves the daemon.
         */
        const confirmed = options.probe ? await options.probe(existing) : false;

        if (confirmed) {
          throw new DaemonError(
            'DAEMON_LOCKED',
            `A compatible ToolNet daemon is already running (pid ${existing.pid}).`
          );
        }

        /*
         * PID reuse (or an unresponsive/foreign process): the lock is stale.
         * Never kill it — just retake the lock.
         */
      }
    }

    /*
     * Stale or unreadable lock. Remove it and retry exactly once; if another
     * process wins the race in between, the next attempt reports DAEMON_LOCKED.
     */
    try {
      unlinkSync(options.lockPath);
    } catch {
      /* Someone else already recovered it. */
    }
  }

  throw new DaemonError('DAEMON_LOCKED', 'Could not acquire the ToolNet daemon instance lock.');
}

/** Read the current owner without taking the lock (diagnostics only). */
export function readDaemonLockOwner(lockPath: string): DaemonLockOwner | null {
  return readOwner(lockPath);
}
