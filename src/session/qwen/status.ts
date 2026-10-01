import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { qwenHooksFile } from './config-paths.js';

import { spawnSync } from 'node:child_process';

export interface QwenStatus {
  binaryDetected: boolean;

  hooksReady: boolean;
}

export function inspectQwenStatus(): QwenStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v qwen >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const hooksFile = qwenHooksFile();
  const hooksReady = existsSync(hooksFile);

  return {
    binaryDetected,

    hooksReady,
  };
}
