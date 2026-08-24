import { cursorMcpConfigFile } from './config-paths.js';

import {
  atomicWriteJson,
  isJsonObject,
  readJsonObjectConfig,
  type JsonObject,
} from '../json-mcp-config.js';

export interface InstallCursorMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;
}

export interface InstallCursorMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;

  serverName: string;

  command: string;

  args: string[];
}

function sameServer(value: unknown, binary: string): boolean {
  if (!isJsonObject(value)) {
    return false;
  }

  const typeOkay = value.type === undefined || value.type === 'stdio';

  return (
    typeOkay &&
    value.command === binary &&
    Array.isArray(value.args) &&
    value.args.length === 1 &&
    value.args[0] === 'mcp'
  );
}

export function installCursorMcp(options: InstallCursorMcpOptions = {}): InstallCursorMcpResult {
  const configFile = options.configFile ?? cursorMcpConfigFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const root = readJsonObjectConfig(configFile, 'Cursor');

  const currentServers = root.mcpServers;

  if (currentServers !== undefined && !isJsonObject(currentServers)) {
    throw new Error('Invalid existing Cursor MCP config: mcpServers must be an object.');
  }

  const mcpServers: JsonObject = isJsonObject(currentServers)
    ? {
        ...currentServers,
      }
    : {};

  if (sameServer(mcpServers[serverName], binary)) {
    return {
      installed: true,
      changed: false,
      configFile,
      serverName,
      command: binary,
      args: ['mcp'],
    };
  }

  /*
   * ToolNet owns only its own server entry.
   * Cursor shares this global mcp.json between editor and CLI.
   */
  mcpServers[serverName] = {
    type: 'stdio',
    command: binary,
    args: ['mcp'],
  };

  atomicWriteJson(configFile, {
    ...root,
    mcpServers,
  });

  const verify = readJsonObjectConfig(configFile, 'Cursor');
  const verifyServers = verify.mcpServers;

  if (!isJsonObject(verifyServers) || !sameServer(verifyServers[serverName], binary)) {
    throw new Error('Cursor MCP configuration was written but verification failed.');
  }

  return {
    installed: true,
    changed: true,
    configFile,
    serverName,
    command: binary,
    args: ['mcp'],
  };
}
