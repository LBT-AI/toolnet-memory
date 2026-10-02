import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { clineHooksDir } from './config-paths.js';

export interface ClineStatus {
  binaryDetected: boolean;

  hooksReady: boolean;

  configPresent: boolean;

  hooksDir?: string;
}

export function inspectClineStatus(): ClineStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v cline >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const hooksDir = clineHooksDir();
  const hooksReady = existsSync(join(hooksDir, 'toolnet-memory.sh'));

  const configDir = join(homedir(), '.cline', 'data', 'settings');
  const configPresent = existsSync(configDir);

  return {
    binaryDetected,
    hooksReady,
    configPresent,
    hooksDir,
  };
}
