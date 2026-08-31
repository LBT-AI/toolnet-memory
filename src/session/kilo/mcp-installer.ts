import { mkdirSync, existsSync } from 'node:fs';

import { dirname } from 'node:path';

import { kiloMcpConfigFile, kiloHomeDirectory } from './config-paths.js';

import {
  atomicWriteJson,
  isJsonObject,
  readJsonObjectConfig,
  type JsonObject,
} from '../json-mcp-config.js';

export interface InstallKiloMcpOptions {
  binary?: string;

  configFile?: string;

  force?: boolean;
}

export interface InstallKiloMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;

  configured: boolean;
}

/**
 * Install ToolNet MCP for Kilo CLI.
 *
 * Kilo supports MCP via mcp.json config file.
 */
export function installKiloMcp(options: InstallKiloMcpOptions = {}): InstallKiloMcpResult {
  const binary = options.binary ?? 'toolnet-memory';

  const configFile = options.configFile ?? kiloMcpConfigFile();

  const configDir = dirname(configFile);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const root = readJsonObjectConfig(configFile, 'Kilo');

  const currentServers = root.mcpServers;

  if (currentServers !== undefined && !isJsonObject(currentServers)) {
    throw new Error('Invalid existing Kilo MCP config: mcpServers must be an object.');
  }

  const mcpServers: JsonObject = isJsonObject(currentServers)
    ? {
        ...currentServers,
      }
    : {};

  const serverName = 'toolnet-memory';

  const hasServer =
    isJsonObject(mcpServers[serverName]) &&
    (mcpServers[serverName] as JsonObject).command === binary;

  if (hasServer && !options.force) {
    return {
      installed: true,

      changed: false,

      configFile,

      configured: true,
    };
  }

  mcpServers[serverName] = {
    command: binary,

    args: ['mcp'],
  };

  atomicWriteJson(configFile, {
    ...root,
    mcpServers,
  });

  return {
    installed: true,

    changed: true,

    configFile,

    configured: true,
  };
}
