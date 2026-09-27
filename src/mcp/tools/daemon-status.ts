import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { connectDaemonClient } from '../../daemon/client.js';

import { localClientIdentity } from '../../daemon/bootstrap.js';

import { daemonSocketPath } from '../../daemon/paths.js';

export const daemonStatusSchema = {
  scope: z
    .enum(['daemon', 'project'])
    .optional()
    .describe(
      [
        'daemon: shared runtime instance, sessions, resident projects and active jobs.',
        'project: this project runtime state, generation and watcher status.',
        'Defaults to daemon.',
      ].join(' ')
    ),

  spawn: z
    .boolean()
    .optional()
    .describe(
      'Allow starting the shared daemon when it is not running (default false for this read-only tool).'
    ),
};

export interface DaemonStatusInput {
  scope?: 'daemon' | 'project';
  spawn?: boolean;
}

export type DaemonStatusResult =
  | { ok: true; scope: 'daemon' | 'project'; status: unknown }
  | { ok: false; diagnostic: string; message: string };

/**
 * Read-only daemon diagnostics.
 *
 * This tool never starts, stops or restarts the daemon: shutting down a shared
 * runtime other agents depend on must go through the trusted local CLI
 * (`toolnet-memory daemon stop`), never an agent tool call.
 */
export async function daemonStatus(
  ctx: MCPContext,
  input: DaemonStatusInput = {}
): Promise<DaemonStatusResult> {
  const scope = input.scope ?? 'daemon';

  const runtimeStatus = await ctx.codeRuntime?.status(
    scope === 'project'
      ? {
          id: ctx.project.id,
          name: ctx.project.name,
          rootPath: ctx.project.rootPath,
          ...(ctx.project.remote ? { remote: ctx.project.remote } : {}),
        }
      : undefined
  );

  if (runtimeStatus !== undefined) {
    return { ok: true, scope, status: runtimeStatus };
  }

  /* No runtime attached yet: probe read-only without spawning. */
  if (input.spawn) {
    return {
      ok: false,
      diagnostic: 'DAEMON_NOT_RUNNING',
      message: 'Daemon spawning is not enabled for this read-only tool.',
    };
  }

  try {
    const client = await connectDaemonClient({
      socketPath: daemonSocketPath(),
      client: localClientIdentity('mcp', 'daemon-status'),
      timeoutMs: 500,
    });

    const response = await client.request({ type: 'daemon_status' }, 1_000);

    await client.close();

    if (!response.ok) {
      return { ok: false, diagnostic: response.code, message: response.error };
    }

    if (response.type !== 'daemon_status') {
      return {
        ok: false,
        diagnostic: 'PROTOCOL_MALFORMED',
        message: 'Unexpected daemon status response.',
      };
    }

    return { ok: true, scope, status: response.status };
  } catch (error) {
    return {
      ok: false,
      diagnostic: 'DAEMON_NOT_RUNNING',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
