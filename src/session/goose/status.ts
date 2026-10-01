import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { goosePluginRoot, gooseHooksFile } from './config-paths.js';

import { spawnSync } from 'node:child_process';

export interface GooseStatus {
  binaryDetected: boolean;

  pluginReady: boolean;

  hooksReady: boolean;
}

export function inspectGooseStatus(): GooseStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v goose >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const pluginDir = goosePluginRoot();
  const pluginReady = existsSync(pluginDir);

  const hooksFile = gooseHooksFile();
  const hooksReady = existsSync(hooksFile);

  return {
    binaryDetected,

    pluginReady,

    hooksReady,
  };
}
