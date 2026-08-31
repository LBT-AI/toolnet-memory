import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { toolnetCliProjectMcpConfigFile } from './config-paths.js';

export interface InstallToolNetCliMcpOptions {
  binary?: string;

  configFile?: string;

  force?: boolean;

  cwd?: string;
}

export interface InstallToolNetCliMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  } catch {
    throw new Error(
      `Invalid existing ToolNet CLI MCP config at ${file}: parse error. Not overwriting.`
    );
  }

  if (!isObject(parsed)) {
    throw new Error(
      `Invalid existing ToolNet CLI MCP config at ${file}: root must be a JSON object. Not overwriting.`
    );
  }

  return parsed;
}

function writeConfig(file: string, config: JsonObject): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, `${JSON.stringify(config, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
}

/**
 * Install ToolNet MCP for ToolNet CLI.
 *
 * Based on audit of LBT-AI/Toolnet-CLI:
 * - Writes MCP config to project-level .toolnet/mcp.json
 * - Preserves existing MCP servers
 * - Stops on invalid JSON (never overwrites corrupt config)
 * - Uses mcpServers format (ToolNet CLI standard)
 */
export function installToolNetCliMcp(
  options: InstallToolNetCliMcpOptions = {}
): InstallToolNetCliMcpResult {
  const binary = options.binary ?? 'toolnet-memory';

  const configFile = options.configFile ?? toolnetCliProjectMcpConfigFile({ cwd: options.cwd });

  const config = readConfig(configFile);

  const serverName = 'toolnet-memory';

  const hasServer = isObject(config.mcpServers) && config.mcpServers[serverName] != null;

  if (hasServer && !options.force) {
    return {
      installed: true,
      changed: false,
      configFile,
    };
  }

  const mcpServers: JsonObject = isObject(config.mcpServers) ? { ...config.mcpServers } : {};

  mcpServers[serverName] = {
    command: binary,
    args: ['mcp'],
  };

  config.mcpServers = mcpServers;

  writeConfig(configFile, config);

  return {
    installed: true,
    changed: true,
    configFile,
  };
}
