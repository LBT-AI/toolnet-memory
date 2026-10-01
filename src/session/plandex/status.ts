import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { plandexConfigPaths, plandexBaseDir } from './config-paths.js';

export interface PlandexStatus {
  commandDetected: boolean;
  serverAvailable: boolean;
  configReady: boolean;
  baseDir: string;
}

export function inspectPlandexStatus(): PlandexStatus {
  const commandDetected =
    spawnSync('sh', ['-lc', 'command -v plandex >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const home = homedir();
  const configPaths = plandexConfigPaths(home);
  const configReady = configPaths.some((path) => existsSync(path));

  const baseDir = plandexBaseDir();
  const serverAvailable = existsSync(join(baseDir, 'orgs'));

  return {
    commandDetected,
    serverAvailable,
    configReady,
    baseDir,
  };
}
