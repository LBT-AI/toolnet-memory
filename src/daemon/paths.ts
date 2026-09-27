/*
 * Phase 77 — daemon runtime directory.
 *
 * The runtime directory is controlled by ToolNet configuration/account only.
 * A repository can never point the daemon at an arbitrary socket: the only
 * override is the process environment, which repository source cannot set.
 *
 *   ~/.toolnet-memory/runtime/
 *     daemon.lock
 *     daemon.pid
 *     daemon.sock
 *     daemon-state.json
 *     logs/
 *
 * Everything in this directory is rebuildable coordination metadata. No Memory,
 * Task or ADR authority is ever written here.
 */

import { chmodSync, existsSync, mkdirSync, statSync } from 'node:fs';

import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

import { DaemonError } from './types.js';

export function daemonRuntimeRoot(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.TOOLNET_DAEMON_ROOT;

  if (override && override.trim()) {
    return resolve(override.trim());
  }

  return join(homedir(), '.toolnet-memory', 'runtime');
}

export function daemonSocketPath(runtimeRoot: string = daemonRuntimeRoot()): string {
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\toolnet-memory-daemon-${shortHash(runtimeRoot)}`;
  }

  return join(runtimeRoot, 'daemon.sock');
}

export function daemonLockPath(runtimeRoot: string = daemonRuntimeRoot()): string {
  return join(runtimeRoot, 'daemon.lock');
}

export function daemonPidPath(runtimeRoot: string = daemonRuntimeRoot()): string {
  return join(runtimeRoot, 'daemon.pid');
}

export function daemonStatePath(runtimeRoot: string = daemonRuntimeRoot()): string {
  return join(runtimeRoot, 'daemon-state.json');
}

export function daemonLogPath(runtimeRoot: string = daemonRuntimeRoot()): string {
  return join(runtimeRoot, 'logs', 'daemon.log');
}

function shortHash(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

/**
 * Create the runtime directory and refuse to operate when its permissions or
 * ownership are insecure.
 *
 * POSIX: the directory must be owned by this user and not group/world writable.
 * Windows has no POSIX mode bits, so the check is skipped there.
 */
export function ensureSecureRuntimeDirectory(runtimeRoot: string = daemonRuntimeRoot()): string {
  mkdirSync(runtimeRoot, {
    recursive: true,
    mode: 0o700,
  });

  if (process.platform !== 'win32') {
    const stats = statSync(runtimeRoot);

    if (typeof process.getuid === 'function' && stats.uid !== process.getuid()) {
      throw new DaemonError(
        'DAEMON_RUNTIME_DIR_INSECURE',
        `Daemon runtime directory is not owned by the current user: ${runtimeRoot}`
      );
    }

    /* Group/world writable is a local privilege hazard. */
    if ((stats.mode & 0o022) !== 0) {
      try {
        chmodSync(runtimeRoot, 0o700);
      } catch {
        /* Fall through to the post-condition check below. */
      }
    }

    if ((statSync(runtimeRoot).mode & 0o022) !== 0) {
      throw new DaemonError(
        'DAEMON_RUNTIME_DIR_INSECURE',
        `Daemon runtime directory is group/world writable: ${runtimeRoot}`
      );
    }
  }

  return runtimeRoot;
}

/** True when the runtime directory already exists. */
export function daemonRuntimeExists(runtimeRoot: string = daemonRuntimeRoot()): boolean {
  return existsSync(runtimeRoot);
}
