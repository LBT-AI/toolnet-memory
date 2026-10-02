import { existsSync, readFileSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { rovoConfigPaths } from './config-paths.js';

export interface RovoStatus {
  binaryDetected: boolean;

  configReady: boolean;

  hooksAvailable: boolean;

  configPath?: string;
}

export function inspectRovoStatus(): RovoStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v rovo >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const configPaths = rovoConfigPaths();
  const configReady = configPaths.some((path) => existsSync(path));

  let configPath: string | undefined;

  if (configReady) {
    configPath = configPaths.find((path) => existsSync(path));
  }

  const hooksAvailable =
    configReady && configPath
      ? readFileSync(configPath, 'utf8').includes('toolnet-memory hook rovo')
      : false;

  return {
    binaryDetected,
    configReady,
    hooksAvailable,
    configPath,
  };
}
