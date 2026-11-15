import { existsSync, readFileSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { geminiSettingsFile } from './config-paths.js';

import {
  AGENT_INTEGRATION_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

export interface GeminiIntegrationStatus {
  binaryDetected: boolean;

  settingsReady: boolean;

  hooksConfigured: boolean;

  settingsFile: string;

  capabilities: IntegrationCapabilities;
}

export function inspectGeminiStatus(): GeminiIntegrationStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v gemini >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const settingsFile = geminiSettingsFile();
  const settingsReady = existsSync(settingsFile);

  let hooksConfigured = false;

  if (settingsReady) {
    try {
      hooksConfigured = readFileSync(settingsFile, 'utf8').includes('session:gemini-hook');
    } catch {
      hooksConfigured = false;
    }
  }

  return {
    binaryDetected,
    settingsReady,
    hooksConfigured,
    settingsFile,
    capabilities: {
      ...AGENT_INTEGRATION_CAPABILITIES.gemini,
    },
  };
}
