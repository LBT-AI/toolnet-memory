import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { agyMcpConfigFile } from './config-paths.js';

export interface InstallAgyMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;
}

export interface InstallAgyMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;

  serverName: string;

  command: string;

  args: string[];
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), {
    recursive: true,

    mode: 0o700,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  renameSync(temp, file);
}

function readConfig(file: string): JsonObject {
  if (!existsSync(file)) {
    return {};
  }

  const raw = readFileSync(file, 'utf8').trim();

  if (!raw) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid existing Agy MCP config: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!isObject(parsed)) {
    throw new Error('Invalid existing Agy MCP config: root must be a JSON object.');
  }

  return parsed;
}

function sameServer(value: unknown, binary: string): boolean {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.command === binary &&
    Array.isArray(value.args) &&
    value.args.length === 1 &&
    value.args[0] === 'mcp'
  );
}

export function installAgyMcp(options: InstallAgyMcpOptions = {}): InstallAgyMcpResult {
  const configFile = options.configFile ?? agyMcpConfigFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const root = readConfig(configFile);

  const currentServers = root.mcpServers;

  if (currentServers !== undefined && !isObject(currentServers)) {
    throw new Error('Invalid existing Agy MCP config: mcpServers must be an object.');
  }

  const mcpServers: JsonObject = isObject(currentServers)
    ? {
        ...currentServers,
      }
    : {};

  const existing = mcpServers[serverName];

  if (sameServer(existing, binary)) {
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
   * ToolNet owns only the "toolnet-memory" entry.
   *
   * Every other MCP server and every unrelated
   * top-level Agy setting is preserved.
   */
  mcpServers[serverName] = {
    command: binary,

    args: ['mcp'],
  };

  const next = {
    ...root,

    mcpServers,
  };

  atomicWriteJson(configFile, next);

  const verify = readConfig(configFile);

  const verifyServers = verify.mcpServers;

  if (!isObject(verifyServers) || !sameServer(verifyServers[serverName], binary)) {
    throw new Error('Agy MCP configuration was written but verification failed.');
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
