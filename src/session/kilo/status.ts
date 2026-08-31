import { existsSync } from 'node:fs';

import { kiloMcpConfigFile, kiloHomeDirectory } from './config-paths.js';

export interface KiloIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  errors: string[];
}

export function inspectKiloIntegrationStatus(): KiloIntegrationStatus {
  const configDir = kiloHomeDirectory();

  const mcpConfigFile = kiloMcpConfigFile();

  const configExists = existsSync(configDir);

  const mcpExists = existsSync(mcpConfigFile);

  const errors: string[] = [];

  if (!configExists) {
    errors.push(`Config directory missing: ${configDir}`);
  }

  const installed = configExists;

  const state: KiloIntegrationStatus['state'] = !configExists ? 'missing-config' : 'installed';

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
