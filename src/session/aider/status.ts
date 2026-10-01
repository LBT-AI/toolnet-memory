import { existsSync, readdirSync, statSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { aiderConfigPaths } from './config-paths.js';

export interface AiderStatus {
  binaryDetected: boolean;
  configured: boolean;
  lastCapture?: string;
  launcherReady: boolean;
}

export function inspectAiderStatus(): AiderStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v aider >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const home = homedir();
  const configPaths = aiderConfigPaths(home);
  const configured = configPaths.some((path) => existsSync(path));

  const toolnetHome = process.env.TOOLNET_HOME ?? join(home, '.toolnet');
  const launcherPath = join(toolnetHome, 'bin', 'aider-wrapper');
  const launcherReady = existsSync(launcherPath);

  let lastCapture: string | undefined;

  try {
    const historyDir = join(toolnetHome, 'aider-history');
    const entries = readdirSync(historyDir);
    if (entries.length > 0) {
      const latest = entries.sort().reverse()[0];
      const stats = statSync(join(historyDir, latest));
      lastCapture = stats.mtime.toISOString();
    }
  } catch {
    // No captures yet.
  }

  return {
    binaryDetected,
    configured,
    lastCapture,
    launcherReady,
  };
}
