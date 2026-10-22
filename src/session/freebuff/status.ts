import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import {
  freebuffGlobalMcpFile,
  freebuffHomeDirectory,
  freebuffProjectMcpFile,
} from './config-paths.js';

import { freebuffMcpConfigured } from './mcp-installer.js';

import {
  MCP_ONLY_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

export interface FreebuffIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  capabilities: IntegrationCapabilities;

  errors: string[];
}

export function inspectFreebuffStatus(options: { cwd?: string } = {}): FreebuffIntegrationStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v freebuff >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const homeDir = freebuffHomeDirectory();
  const configFile = freebuffGlobalMcpFile();

  const homeExists = existsSync(homeDir);

  const configured =
    freebuffMcpConfigured(configFile) ||
    (options.cwd !== undefined &&
      freebuffMcpConfigured(freebuffProjectMcpFile({ cwd: options.cwd })));

  const errors: string[] = [];

  if (!homeExists) {
    errors.push(`Config directory missing: ${homeDir}`);
  }

  if (!binaryDetected) {
    errors.push('Freebuff binary not found');
  }

  return {
    installed: homeExists && binaryDetected,
    state: !homeExists ? 'missing-config' : !binaryDetected ? 'missing-binary' : 'installed',
    mcp: {
      configured,
      configFile,
    },
    capabilities: {
      ...MCP_ONLY_CAPABILITIES,
    },
    errors,
  };
}
