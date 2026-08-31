import { mkdirSync, existsSync } from 'node:fs';

import { dirname } from 'node:path';

import { kiloConfigFile } from './config-paths.js';

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
 * Install ToolNet MCP for Kilo Code.
 *
 * Based on audit of Kilo-Org/kilocode:
 * - Config file: ~/.config/kilo/kilo.jsonc
 * - MCP key: top-level "mcp" (NOT "mcpServers")
 * - Server format: { type: "local", command: ["binary", "args"], enabled: true }
 * - Preserves existing MCP servers
 */
export function installKiloMcp(options: InstallKiloMcpOptions = {}): InstallKiloMcpResult {
  const binary = options.binary ?? 'toolnet-memory';

  const configFile = options.configFile ?? kiloConfigFile();

  const configDir = dirname(configFile);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const root = readJsonObjectConfig(configFile, 'Kilo');

  // Kilo uses top-level "mcp" key, not "mcpServers"
  const currentMcp = root.mcp;

  if (currentMcp !== undefined && !isJsonObject(currentMcp)) {
    throw new Error('Invalid existing Kilo config: mcp must be an object.');
  }

  const mcpServers: JsonObject = isJsonObject(currentMcp)
    ? {
        ...currentMcp,
      }
    : {};

  const serverName = 'toolnet-memory';

  const hasServer = isJsonObject(mcpServers[serverName]);

  if (hasServer && !options.force) {
    return {
      installed: true,
      changed: false,
      configFile,
      configured: true,
    };
  }

  // Kilo MCP format: type "local" with command as array
  mcpServers[serverName] = {
    type: 'local',
    command: [binary, 'mcp'],
    enabled: true,
    timeout: 10000,
  };

  atomicWriteJson(configFile, {
    ...root,
    mcp: mcpServers,
  });

  return {
    installed: true,
    changed: true,
    configFile,
    configured: true,
  };
}
