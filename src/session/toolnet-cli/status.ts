import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { toolnetCliHomeDirectory, toolnetCliProjectMcpConfigFile } from './config-paths.js';

import {
  NATIVE_SESSION_IMPORT_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

import { defaultToolNetCliSessionsDir } from './adapter.js';

export interface ToolNetCliIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  nativeSource: {
    available: boolean;

    sessionsDir: string;
  };

  capabilities: IntegrationCapabilities;

  errors: string[];
}

function toolnetBinaryExists(): boolean {
  const result = spawnSync('sh', ['-lc', 'command -v toolnet >/dev/null 2>&1'], {
    stdio: 'ignore',
  });

  return result.status === 0;
}

export function inspectToolNetCliIntegrationStatus(
  options: {
    cwd?: string;
  } = {}
): ToolNetCliIntegrationStatus {
  const homeDir = toolnetCliHomeDirectory();

  const mcpConfigFile = toolnetCliProjectMcpConfigFile({
    cwd: options.cwd,
  });

  const sessionsDir = defaultToolNetCliSessionsDir();

  const homeExists = existsSync(homeDir);

  const binaryExists = toolnetBinaryExists();

  const mcpConfigured = existsSync(mcpConfigFile);

  const nativeSourceAvailable = existsSync(sessionsDir);

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
      configured: mcpConfigured,

      configFile: mcpConfigFile,
    },

    nativeSource: {
      available: nativeSourceAvailable,

      sessionsDir,
    },

    capabilities: {
      ...NATIVE_SESSION_IMPORT_CAPABILITIES,
    },

    errors,
  };
}
