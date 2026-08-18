import { existsSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { fileURLToPath } from 'node:url';

import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

import { pingToolNetService } from './client.js';

const PM2_NAME = process.env.TOOLNET_PM2_NAME ?? 'toolnet-memory-service';

function runPm2(args: string[], silent = false): SpawnSyncReturns<string> {
  const result = spawnSync('pm2', args, {
    encoding: 'utf8',

    stdio: silent ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function requirePm2(): void {
  const result = runPm2(['--version'], true);

  if (result.status !== 0) {
    throw new Error('PM2 is not installed. Install it with: npm install -g pm2');
  }
}

function serviceBundle(): string {
  const here = dirname(fileURLToPath(import.meta.url));

  const file = join(here, 'service.js');

  if (!existsSync(file)) {
    throw new Error(`Production service bundle missing: ${file}`);
  }

  return file;
}

function installedInPm2(): boolean {
  const result = runPm2(['describe', PM2_NAME], true);

  return result.status === 0;
}

async function status(json: boolean): Promise<void> {
  try {
    const response = await pingToolNetService({
      timeoutMs: 500,
    });

    if (json) {
      console.log(
        JSON.stringify(
          {
            running: true,
            ...response.stats,
          },
          null,
          2
        )
      );

      return;
    }

    console.log('');
    console.log('◇ ToolNet Memory Service');
    console.log('');
    console.log('◆ Daemon');
    console.log('│');
    console.log('├ ◆ Status        — running');
    console.log(`├ ◆ PID           — ${response.stats.pid}`);
    console.log(`├ ◆ Cache entries — ${response.stats.cacheEntries}`);
    console.log(`├ ◆ Cache hits    — ${response.stats.cacheHits}`);
    console.log(`├ ◆ Cache misses  — ${response.stats.cacheMisses}`);
    console.log('│');
    console.log('└ ◆ Service healthy');
    console.log('');
  } catch {
    if (json) {
      console.log(
        JSON.stringify(
          {
            running: false,
          },
          null,
          2
        )
      );

      return;
    }

    console.log('');
    console.log('◇ ToolNet Memory Service');
    console.log('');
    console.log('◆ Daemon');
    console.log('│');
    console.log('└ ◇ Status — stopped');
    console.log('');
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status';

  const json = process.argv.includes('--json');

  if (command === 'status') {
    await status(json);
    return;
  }

  requirePm2();

  if (command === 'install') {
    if (installedInPm2()) {
      const result = runPm2(['restart', PM2_NAME, '--update-env'], true);

      if (result.status !== 0) {
        throw new Error('PM2 restart failed');
      }
    } else {
      const result = runPm2(
        ['start', serviceBundle(), '--name', PM2_NAME, '--interpreter', process.execPath, '--time'],
        true
      );

      if (result.status !== 0) {
        throw new Error('PM2 install failed');
      }
    }

    runPm2(['save'], true);

    await status(false);

    return;
  }

  if (command === 'start') {
    const result = runPm2(['start', PM2_NAME], true);

    if (result.status !== 0) {
      throw new Error('Service is not installed. Run toolnet-memory service:install');
    }

    return;
  }

  if (command === 'stop') {
    const result = runPm2(['stop', PM2_NAME], true);

    if (result.status !== 0) {
      throw new Error('PM2 stop failed');
    }

    return;
  }

  if (command === 'restart') {
    const result = runPm2(['restart', PM2_NAME, '--update-env'], true);

    if (result.status !== 0) {
      throw new Error('PM2 restart failed');
    }

    return;
  }

  if (command === 'remove') {
    const result = runPm2(['delete', PM2_NAME], true);

    if (result.status !== 0) {
      throw new Error('PM2 delete failed');
    }

    runPm2(['save'], true);

    return;
  }

  throw new Error(`Unknown service command: ${command}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
});
