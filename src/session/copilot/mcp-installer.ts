import { copilotMcpConfigFile } from './config-paths.js';

import {
  atomicWriteJson,
  isJsonObject,
  readJsonObjectConfig,
  type JsonObject,
} from '../json-mcp-config.js';

export interface InstallCopilotMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;
}

export interface InstallCopilotMcpResult {
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

  const typeOkay = value.type === undefined || value.type === 'local' || value.type === 'stdio';

  return (
    typeOkay &&
    value.command === binary &&
    Array.isArray(value.args) &&
    value.args.length === 1 &&
    value.args[0] === 'mcp' &&
    Array.isArray(value.tools) &&
    value.tools.length === 1 &&
    value.tools[0] === '*'
  );
}

export function installCopilotMcp(options: InstallCopilotMcpOptions = {}): InstallCopilotMcpResult {
  const configFile = options.configFile ?? copilotMcpConfigFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const root = readJsonObjectConfig(configFile, 'GitHub Copilot CLI');

  const currentServers = root.mcpServers;

  if (currentServers !== undefined && !isJsonObject(currentServers)) {
    throw new Error(
      'Invalid existing GitHub Copilot CLI MCP config: mcpServers must be an object.'
    );
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
   * Copilot CLI local MCP servers use the mcpServers JSON schema.
   * tools:["*"] explicitly enables all ToolNet Memory MCP tools.
   */
  mcpServers[serverName] = {
    type: 'stdio',
    command: binary,
    args: ['mcp'],
    tools: ['*'],
  };

  atomicWriteJson(configFile, {
    ...root,
    mcpServers,
  });

  const verify = readJsonObjectConfig(configFile, 'GitHub Copilot CLI');
  const verifyServers = verify.mcpServers;

  if (!isJsonObject(verifyServers) || !sameServer(verifyServers[serverName], binary)) {
    throw new Error('GitHub Copilot CLI MCP configuration was written but verification failed.');
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
