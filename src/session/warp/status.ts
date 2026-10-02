import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { warpConfigPaths } from './config-paths.js';

export interface WarpStatus {
  binaryDetected: boolean;

  blocked: boolean;

  configReady: boolean;

  configPath?: string;
}

export function inspectWarpStatus(): WarpStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v warp >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const configPaths = warpConfigPaths();
  const configReady = configPaths.some((path) => existsSync(path));

  let configPath: string | undefined;

  if (configReady) {
    configPath = configPaths.find((path) => existsSync(path));
  }

  return {
    binaryDetected,
    blocked: true,
    configReady,
    configPath,
  };
}
