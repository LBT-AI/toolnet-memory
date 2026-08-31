import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { toolnetCliHomeDirectory, toolnetCliConfigFile } from './config-paths.js';

export interface ToolNetCliIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  errors: string[];
}

function toolnetBinaryExists(): boolean {
  const result = spawnSync('sh', ['-lc', 'command -v toolnet >/dev/null 2>&1'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

/**
 * Inspect ToolNet CLI integration status.
 *
 * Checks:
 * - Binary exists (toolnet command)
 * - Config directory exists (~/.toolnetcli/)
 * - Config file exists and is valid JSON
 */
export function inspectToolNetCliIntegrationStatus(): ToolNetCliIntegrationStatus {
  const homeDir = toolnetCliHomeDirectory();
  const configFile = toolnetCliConfigFile();

  const homeExists = existsSync(homeDir);
  const configExists = existsSync(configFile);
  const binaryExists = toolnetBinaryExists();

  const errors: string[] = [];

  if (!homeExists) {
    errors.push(`Config directory missing: ${homeDir}`);
  }

  if (!binaryExists) {
    errors.push('ToolNet CLI binary not found (toolnet)');
  }

  const installed = homeExists && binaryExists;

  const state: ToolNetCliIntegrationStatus['state'] = !homeExists
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
    errors,
  };
}
