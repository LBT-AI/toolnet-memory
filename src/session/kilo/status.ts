import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { kiloHomeDirectory, kiloConfigFile } from './config-paths.js';

import {
  MCP_ONLY_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

export interface KiloIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  capabilities: IntegrationCapabilities;

  errors: string[];
}

function kiloBinaryExists(): boolean {
  const result = spawnSync(
    'sh',
    ['-lc', 'command -v kilo >/dev/null 2>&1 || command -v kilo-code >/dev/null 2>&1'],
    {
      stdio: 'ignore',
    }
  );

  return result.status === 0;
}

/**
 * Inspect Kilo integration status.
 *
 * Host detection:
 * - Binary: kilo or kilo-code
 * - Config dir: ~/.config/kilo/
 * - Config file: ~/.config/kilo/kilo.jsonc
 *
 * ToolNet Memory integration:
 * - MCP only
 *
 * Native lifecycle capture is not currently implemented.
 */
export function inspectKiloIntegrationStatus(): KiloIntegrationStatus {
  const homeDir = kiloHomeDirectory();
  const configFile = kiloConfigFile();

  const homeExists = existsSync(homeDir);
  const configExists = existsSync(configFile);
  const binaryExists = kiloBinaryExists();

  const errors: string[] = [];

  if (!homeExists) {
    errors.push(`Config directory missing: ${homeDir}`);
  }

  if (!binaryExists) {
    errors.push('Kilo binary not found (kilo or kilo-code)');
  }

  const installed = homeExists && binaryExists;

  const state: KiloIntegrationStatus['state'] = !homeExists
    ? 'missing-config'
    : !binaryExists
      ? 'missing-binary'
      : 'installed';

  return {
    installed,
    state,

    mcp: {
      configured: configExists,
      configFile,
    },

    capabilities: {
      ...MCP_ONLY_CAPABILITIES,
    },

    errors,
  };
}
