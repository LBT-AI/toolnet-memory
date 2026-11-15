import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import {
  codebuffGlobalMcpFile,
  codebuffHomeDirectory,
  codebuffProjectMcpFile,
} from './config-paths.js';

import { codebuffMcpConfigured } from './mcp-installer.js';

import {
  MCP_ONLY_CAPABILITIES,
  type IntegrationCapabilities,
} from '../integration-capabilities.js';

export interface CodebuffIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  capabilities: IntegrationCapabilities;

  errors: string[];
}

export function inspectCodebuffStatus(options: { cwd?: string } = {}): CodebuffIntegrationStatus {
  const binaryDetected =
    spawnSync('sh', ['-lc', 'command -v codebuff >/dev/null 2>&1'], {
      stdio: 'ignore',
    }).status === 0;

  const homeDir = codebuffHomeDirectory();
  const configFile = codebuffGlobalMcpFile();

  const homeExists = existsSync(homeDir);

  const configured =
    codebuffMcpConfigured(configFile) ||
    (options.cwd !== undefined &&
      codebuffMcpConfigured(codebuffProjectMcpFile({ cwd: options.cwd })));

  const errors: string[] = [];

  if (!homeExists) {
    errors.push(`Config directory missing: ${homeDir}`);
  }

  if (!binaryDetected) {
    errors.push('Codebuff binary not found');
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
