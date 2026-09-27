/*
 * Phase 77 — daemon bootstrap.
 *
 * Clients never require the user to start the daemon manually. Connect first;
 * only spawn when there is definitively no compatible daemon, and never kill an
 * incompatible one.
 */

import { DaemonClient, connectDaemonClient } from './client.js';

import { daemonBuildFingerprint, daemonBuildMarker, daemonPackageVersion } from './fingerprint.js';

import { resolveDaemonLimits, type DaemonLimits } from './limits.js';

import { daemonRuntimeRoot, daemonSocketPath } from './paths.js';

import { startDaemon, type DaemonHandle } from './server.js';

import {
  DaemonError,
  type DaemonClientIdentity,
  type DaemonDiagnosticCode,
  type DaemonRuntimeDependencies,
} from './types.js';

export interface DaemonBootstrapOptions {
  deps: DaemonRuntimeDependencies;
  client: DaemonClientIdentity;
  runtimeRoot?: string;
  socketPath?: string;
  limits?: Partial<DaemonLimits>;
  /** Explicit fingerprint override (admission-barrier tests). */
  fingerprint?: string;
  protocolVersion?: number;
  timeoutMs?: number;
  /** Spawn an in-process daemon when none is reachable (default true). */
  allowSpawn?: boolean;
  /** Test seam: caller owns the started daemon's lifetime. */
  disableWatchers?: boolean;
}

export interface DaemonBootstrapResult {
  client?: DaemonClient;
  /** The daemon this process started, when it won the instance race. */
  daemon?: DaemonHandle;
  started: boolean;
  diagnostic?: DaemonDiagnosticCode;
  detail?: string;
}

function isAdmissionFailure(error: unknown): boolean {
  return (
    error instanceof DaemonError &&
    (error.code === 'DAEMON_BUILD_MISMATCH' || error.code === 'DAEMON_PROTOCOL_MISMATCH')
  );
}

async function tryConnect(
  options: DaemonBootstrapOptions,
  runtimeRoot: string,
  socketPath: string
): Promise<DaemonClient> {
  return connectDaemonClient({
    socketPath,
    runtimeRoot,
    client: options.client,
    timeoutMs: options.timeoutMs ?? 1_000,
    ...(options.fingerprint ? { fingerprint: options.fingerprint } : {}),
    ...(options.protocolVersion !== undefined ? { protocolVersion: options.protocolVersion } : {}),
  });
}

/**
 * Connect to a compatible daemon, starting one only when necessary.
 *
 * Concurrent callers are race-safe: whichever process wins the instance lock
 * serves, and every other caller simply connects to it. An incompatible or
 * protocol-mismatched daemon is reported, never terminated.
 */
export async function connectOrStartDaemon(
  options: DaemonBootstrapOptions
): Promise<DaemonBootstrapResult> {
  const runtimeRoot = options.runtimeRoot ?? daemonRuntimeRoot();

  const socketPath = options.socketPath ?? daemonSocketPath(runtimeRoot);

  /* 1. Existing compatible daemon. */
  try {
    const client = await tryConnect(options, runtimeRoot, socketPath);

    return { client, started: false };
  } catch (error) {
    if (isAdmissionFailure(error)) {
      /* Never restart or kill a mismatched daemon automatically. */
      return {
        started: false,
        diagnostic: (error as DaemonError).code,
        detail: (error as Error).message,
      };
    }
  }

  if (options.allowSpawn === false) {
    return { started: false, diagnostic: 'DAEMON_NOT_RUNNING' };
  }

  /* 2. Start one; losing the instance race is expected and fine. */
  let daemon: DaemonHandle | undefined;
  let startDiagnostic: DaemonDiagnosticCode | undefined;

  try {
    daemon = await startDaemon({
      deps: options.deps,
      runtimeRoot,
      socketPath,
      ...(options.limits ? { limits: options.limits } : {}),
      ...(options.disableWatchers ? { disableWatchers: true } : {}),
    });
  } catch (error) {
    startDiagnostic = error instanceof DaemonError ? error.code : 'DAEMON_START_FAILED';

    if (startDiagnostic !== 'DAEMON_LOCKED') {
      return {
        started: false,
        diagnostic: startDiagnostic,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /* 3. Connect to whoever won (ours or another process's). */
  const deadline = Date.now() + (daemon ? 1_000 : 5_000);

  let attempt = 0;

  for (;;) {
    try {
      const client = await tryConnect(options, runtimeRoot, socketPath);

      return { client, started: Boolean(daemon), ...(daemon ? { daemon } : {}) };
    } catch (error) {
      if (isAdmissionFailure(error)) {
        return {
          started: false,
          diagnostic: (error as DaemonError).code,
          detail: (error as Error).message,
        };
      }

      if (Date.now() >= deadline) {
        return {
          started: Boolean(daemon),
          ...(daemon ? { daemon } : {}),
          diagnostic: startDiagnostic ?? 'DAEMON_NOT_RUNNING',
          detail: error instanceof Error ? error.message : String(error),
        };
      }

      attempt += 1;

      await new Promise((resolve) => setTimeout(resolve, Math.min(25 * attempt, 200)));
    }
  }
}

/** Build a stable client identity for this process. */
export function localClientIdentity(type: string, label?: string): DaemonClientIdentity {
  return {
    type,
    pid: process.pid,
    ...(label ? { label } : {}),
  };
}

/** Human/diagnostic description of the runtime build. */
export function daemonRuntimeDescription(runtimeRoot?: string): {
  fingerprint: string;
  packageVersion: string;
  buildMarker: string;
  limits: DaemonLimits;
} {
  const root = runtimeRoot ?? daemonRuntimeRoot();

  return {
    fingerprint: daemonBuildFingerprint(root).buildHash,
    packageVersion: daemonPackageVersion(),
    buildMarker: daemonBuildMarker(),
    limits: resolveDaemonLimits(),
  };
}

export type { DaemonHandle };

export { DaemonClient };
