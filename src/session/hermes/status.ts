import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { hermesConfigFile } from './config-paths.js';

import { spawnSync } from 'node:child_process';

export interface HermesStatus {
  binaryDetected: boolean;

  configReady: boolean;
}

export function inspectHermesStatus(): HermesStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v hermes >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const configFile = hermesConfigFile();
  const configReady = existsSync(configFile);

  return {
    binaryDetected,

    configReady,
  };
}
