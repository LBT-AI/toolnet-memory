import { existsSync, mkdirSync } from 'node:fs';

import { dirname } from 'node:path';

import { freebuffProjectMcpFile } from './config-paths.js';

import {
  atomicWriteJson,
  isJsonObject,
  readJsonObjectConfig,
  type JsonObject,
} from '../json-mcp-config.js';

export interface InstallFreebuffMcpOptions {
  binary?: string;

  configFile?: string;

  cwd?: string;

  force?: boolean;
}

export interface InstallFreebuffMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;

  configured: boolean;
}

/**
 * Install ToolNet MCP for Freebuff.
 *
 * Freebuff has no native lifecycle hooks; project MCP servers live in
 * `.agents/mcp.json` under the standard `mcpServers` key.
 */
export function installFreebuffMcp(
  options: InstallFreebuffMcpOptions = {}
): InstallFreebuffMcpResult {
  const binary = options.binary ?? 'toolnet-memory';

  const configFile = options.configFile ?? freebuffProjectMcpFile({ cwd: options.cwd });

  mkdirSync(dirname(configFile), { recursive: true, mode: 0o700 });

  const root = readJsonObjectConfig(configFile, 'Freebuff');

  const currentMcp = root.mcpServers;

  if (currentMcp !== undefined && !isJsonObject(currentMcp)) {
    throw new Error('Invalid existing Freebuff .agents/mcp.json: mcpServers must be an object.');
  }

  const servers: JsonObject = isJsonObject(currentMcp) ? { ...currentMcp } : {};

  const serverName = 'toolnet-memory';

  if (isJsonObject(servers[serverName]) && !options.force) {
    return {
      installed: true,
      changed: false,
      configFile,
      configured: true,
    };
  }

  servers[serverName] = {
    command: binary,
    args: ['mcp'],
  };

  atomicWriteJson(configFile, {
    ...root,
    mcpServers: servers,
  });

  return {
    installed: true,
    changed: true,
    configFile,
    configured: true,
  };
}

export function freebuffMcpConfigured(configFile: string): boolean {
  if (!existsSync(configFile)) {
    return false;
  }

  try {
    const root = readJsonObjectConfig(configFile, 'Freebuff');

    return isJsonObject(root.mcpServers) && isJsonObject(root.mcpServers['toolnet-memory']);
  } catch {
    return false;
  }
}
