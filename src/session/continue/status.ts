import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { continueConfigFile, continueSessionsDirectory } from './config-paths.js';

import {
  AGENT_INTEGRATION_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

export interface ContinueIntegrationStatus {
  binaryDetected: boolean;

  configReady: boolean;

  sessionsReady: boolean;

  sessionsDirectory: string;

  configFile: string;

  capabilities: IntegrationCapabilities;
}

export function inspectContinueStatus(): ContinueIntegrationStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v cn >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  return {
    binaryDetected,
    configReady: existsSync(continueConfigFile()),
    sessionsReady: existsSync(continueSessionsDirectory()),
    sessionsDirectory: continueSessionsDirectory(),
    configFile: continueConfigFile(),
    capabilities: {
      ...AGENT_INTEGRATION_CAPABILITIES.continue,
    },
  };
}
