import { existsSync, readFileSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { junieConfigFile } from './config-paths.js';

import {
  AGENT_INTEGRATION_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

export interface JunieIntegrationStatus {
  binaryDetected: boolean;

  configReady: boolean;

  hooksConfigured: boolean;

  configFile: string;

  capabilities: IntegrationCapabilities;
}

export function inspectJunieStatus(): JunieIntegrationStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v junie >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const configFile = junieConfigFile();
  const configReady = existsSync(configFile);

  let hooksConfigured = false;

  if (configReady) {
    try {
      hooksConfigured = readFileSync(configFile, 'utf8').includes('session:junie-hook');
    } catch {
      hooksConfigured = false;
    }
  }

  return {
    binaryDetected,
    configReady,
    hooksConfigured,
    configFile,
    capabilities: {
      ...AGENT_INTEGRATION_CAPABILITIES.junie,
    },
  };
}
