/*
 * Phase 77 — daemon CLI.
 *
 * Deliberately does NOT require systemd/PM2: `start` runs the daemon in the
 * foreground of its own process. Lazy start through MCP/CLI clients remains the
 * primary user experience.
 */

import { connectOrStartDaemon, localClientIdentity } from './bootstrap.js';

import { DaemonClient, connectDaemonClient } from './client.js';

import { createDaemonRuntimeDependencies } from './dependencies.js';

import { daemonRuntimeDescription } from './bootstrap.js';

import { daemonRuntimeRoot, daemonSocketPath } from './paths.js';

import { startDaemon } from './server.js';

import { DaemonError, type DaemonStatusReport } from './types.js';

function printStatus(status: DaemonStatusReport): void {
  console.log('');
  console.log('◇ ToolNet Local Coordination Daemon');
  console.log('');
  console.log(`├ ◆ Instance   — ${status.instance.instanceId}`);
  console.log(`├ ◆ PID        — ${status.instance.pid}`);
  console.log(`├ ◆ Protocol   — v${status.instance.protocolVersion}`);
  console.log(`├ ◆ Build      — ${status.instance.buildHash.slice(0, 16)}…`);
  console.log(`├ ◆ Sessions   — ${status.sessions}`);
  console.log(`├ ◆ Projects   — ${status.projects}`);
  console.log(`├ ◆ Active jobs— ${status.activeJobs}`);
  console.log(`├ ◆ Watchers   — ${status.watchers}`);
  console.log(`└ ◆ Draining   — ${status.draining ? 'yes' : 'no'}`);
  console.log('');
}

async function status(json: boolean): Promise<number> {
  const runtimeRoot = daemonRuntimeRoot();

  const socketPath = daemonSocketPath(runtimeRoot);

  try {
    const client = await connectDaemonClient({
      socketPath,
      runtimeRoot,
      client: localClientIdentity('cli', 'daemon:status'),
      timeoutMs: 750,
    });

    const response = await client.request({ type: 'daemon_status' }, 2_000);

    await client.close();

    if (!response.ok || response.type !== 'daemon_status') {
      console.error('Daemon returned an unexpected status response.');
      return 1;
    }

    if (json) {
      console.log(JSON.stringify({ running: true, ...response.status }, null, 2));
    } else {
      printStatus(response.status);
    }

    return 0;
  } catch (error) {
    if (json) {
      console.log(JSON.stringify({ running: false, diagnostic: diagnosticOf(error) }, null, 2));
    } else {
      console.log('');
      console.log('◇ ToolNet Local Coordination Daemon');
      console.log('');
      console.log(`└ ◇ Status — stopped (${diagnosticOf(error)})`);
      console.log('');
    }

    return 0;
  }
}

function diagnosticOf(error: unknown): string {
  return error instanceof DaemonError ? error.code : 'DAEMON_NOT_RUNNING';
}

async function start(foreground: boolean): Promise<number> {
  const runtimeRoot = daemonRuntimeRoot();

  const deps = createDaemonRuntimeDependencies();

  try {
    const daemon = await startDaemon({ deps, runtimeRoot });

    console.log(`[toolnet-memory] daemon ready: ${daemon.socketPath}`);

    if (!foreground) {
      /* Keep the process alive; the daemon is the foreground responsibility. */
      return 0;
    }

    const shutdown = () => {
      void daemon.close().finally(() => process.exit(0));
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);

    /* Hang until a signal arrives. */
    await new Promise<void>(() => undefined);

    return 0;
  } catch (error) {
    console.error(
      `[toolnet-memory] daemon failed: ${error instanceof Error ? error.message : String(error)}`
    );

    return 1;
  }
}

async function stop(force: boolean): Promise<number> {
  const runtimeRoot = daemonRuntimeRoot();

  const socketPath = daemonSocketPath(runtimeRoot);

  let client: DaemonClient;

  try {
    client = await connectDaemonClient({
      socketPath,
      runtimeRoot,
      client: localClientIdentity('cli', 'daemon:stop'),
      timeoutMs: 750,
    });
  } catch (error) {
    console.log(`[toolnet-memory] daemon is not running (${diagnosticOf(error)})`);
    return 0;
  }

  const response = await client.request({ type: 'shutdown', force }, 5_000);

  await client.close();

  if (!response.ok) {
    console.error(`[toolnet-memory] shutdown rejected: ${response.code} — ${response.error}`);
    return 2;
  }

  console.log('[toolnet-memory] daemon shutdown requested');
  return 0;
}

async function restart(force: boolean): Promise<number> {
  const stopCode = await stop(force);

  if (stopCode !== 0) {
    return stopCode;
  }

  await new Promise((resolve) => setTimeout(resolve, 250));

  const runtimeRoot = daemonRuntimeRoot();

  const deps = createDaemonRuntimeDependencies();

  const result = await connectOrStartDaemon({
    deps,
    runtimeRoot,
    client: localClientIdentity('cli', 'daemon:restart'),
    timeoutMs: 1_000,
    allowSpawn: true,
  });

  if (!result.client) {
    console.error(`[toolnet-memory] restart failed: ${result.diagnostic ?? 'unknown'}`);
    return 1;
  }

  await result.client.close();

  console.log('[toolnet-memory] daemon restarted');
  return 0;
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status';

  const json = process.argv.includes('--json');

  const force = process.argv.includes('--force');

  let code: number;

  switch (command) {
    case 'status':
      code = await status(json);
      break;

    case 'start':
      code = await start(true);
      break;

    case 'stop':
      code = await stop(force);
      break;

    case 'restart':
      code = await restart(force);
      break;

    case 'info': {
      console.log(JSON.stringify(daemonRuntimeDescription(), null, 2));
      code = 0;
      break;
    }

    default:
      console.error(`Unknown daemon command: ${command}`);
      code = 1;
  }

  process.exitCode = code;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
