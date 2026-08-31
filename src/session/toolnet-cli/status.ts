import { existsSync } from 'node:fs';

import { toolnetCliMcpConfigFile, toolnetCliConfigDirectory } from './config-paths.js';

export interface ToolNetCliIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  errors: string[];
}

export function inspectToolNetCliIntegrationStatus(): ToolNetCliIntegrationStatus {
  const configDir = toolnetCliConfigDirectory();

  const mcpConfigFile = toolnetCliMcpConfigFile();

  const configExists = existsSync(configDir);

  const mcpExists = existsSync(mcpConfigFile);

  const errors: string[] = [];

  if (!configExists) {
    errors.push(`Config directory missing: ${configDir}`);
  }

  const installed = configExists;

  const state: ToolNetCliIntegrationStatus['state'] = !configExists
    ? 'missing-config'
    : 'installed';

  return {
    installed,

    state,

    mcp: {
      configured: mcpExists,

      configFile: mcpConfigFile,
    },

    errors,
  };
}
