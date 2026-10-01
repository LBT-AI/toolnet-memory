import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { kimiConfigFile } from './config-paths.js';

import { spawnSync } from 'node:child_process';

export interface KimiStatus {
  binaryDetected: boolean;

  configReady: boolean;
}

export function inspectKimiStatus(): KimiStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v kimi-code >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const configFile = kimiConfigFile();
  const configReady = existsSync(configFile);

  return {
    binaryDetected,

    configReady,
  };
}
