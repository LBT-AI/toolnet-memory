import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { qoderSettingsFile } from './config-paths.js';

import { spawnSync } from 'node:child_process';

export interface QoderStatus {
  binaryDetected: boolean;

  settingsReady: boolean;
}

export function inspectQoderStatus(): QoderStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v qoder >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const settingsFile = qoderSettingsFile();
  const settingsReady = existsSync(settingsFile);

  return {
    binaryDetected,

    settingsReady,
  };
}
