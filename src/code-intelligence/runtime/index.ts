/*
 * Phase 77 — CodeIntelligenceRuntime factory.
 *
 * Prefers the shared local daemon. Falls back to an in-process runtime when the
 * daemon is unavailable for a definitive reason (not running, start failed).
 * A build/protocol mismatch is reported rather than silently papered over.
 */

export * from './types.js';

export { LocalCodeIntelligenceRuntime } from './local-runtime.js';

export { DaemonCodeIntelligenceRuntime } from './daemon-runtime.js';

export { daemonProjectStorage, daemonRootStorage } from './storage.js';

import { connectOrStartDaemon, localClientIdentity } from '../../daemon/bootstrap.js';

import type { DaemonHandle } from '../../daemon/server.js';

import { createDaemonRuntimeDependencies } from '../../daemon/dependencies.js';

import type { DaemonDiagnosticCode } from '../../daemon/types.js';

import { DaemonCodeIntelligenceRuntime } from './daemon-runtime.js';

import { LocalCodeIntelligenceRuntime } from './local-runtime.js';

import type { CodeIntelligenceRuntime } from './types.js';

export interface CreateRuntimeOptions {
  runtimeRoot?: string;
  socketPath?: string;
  allowSpawn?: boolean;
  timeoutMs?: number;
  fingerprint?: string;
  protocolVersion?: number;
  disableWatchers?: boolean;
  /** Client type recorded in the daemon session registry. */
  clientType?: string;
}

export interface CreatedRuntime {
  runtime: CodeIntelligenceRuntime;
  /** Set when this process started the shared daemon. */
  daemon?: DaemonHandle;
  diagnostic?: DaemonDiagnosticCode;
  detail?: string;
}

export async function createCodeIntelligenceRuntime(
  options: CreateRuntimeOptions = {}
): Promise<CreatedRuntime> {
  const deps = createDaemonRuntimeDependencies();

  const bootstrap = await connectOrStartDaemon({
    deps,
    client: localClientIdentity(options.clientType ?? 'mcp'),
    ...(options.runtimeRoot ? { runtimeRoot: options.runtimeRoot } : {}),
    ...(options.socketPath ? { socketPath: options.socketPath } : {}),
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    ...(options.fingerprint ? { fingerprint: options.fingerprint } : {}),
    ...(options.protocolVersion !== undefined ? { protocolVersion: options.protocolVersion } : {}),
    ...(options.disableWatchers ? { disableWatchers: true } : {}),
    ...(options.allowSpawn !== undefined ? { allowSpawn: options.allowSpawn } : {}),
  });

  if (bootstrap.client) {
    return {
      runtime: new DaemonCodeIntelligenceRuntime(bootstrap.client),
      ...(bootstrap.daemon ? { daemon: bootstrap.daemon } : {}),
    };
  }

  return {
    runtime: new LocalCodeIntelligenceRuntime(),
    ...(bootstrap.daemon ? { daemon: bootstrap.daemon } : {}),
    ...(bootstrap.diagnostic ? { diagnostic: bootstrap.diagnostic } : {}),
    ...(bootstrap.detail ? { detail: bootstrap.detail } : {}),
  };
}
