import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { agyGlobalMcpConfigFile, agyWorkspaceMcpConfigFile } from './config-paths.js';

export interface InstallAgyMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;

  scope?: 'global' | 'workspace' | 'both';

  cwd?: string;

  force?: boolean;
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
  } catch {
    throw new Error(
      `Invalid existing Agy MCP config at ${file}: parse error. Not overwriting.`
    );
  }

  if (!isObject(parsed)) {
    throw new Error(
      `Invalid existing Agy MCP config at ${file}: root must be a JSON object. Not overwriting.`
    );
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

function installToSingleFile(
  configFile: string,
  binary: string,
  serverName: string,
  force: boolean
): { installed: boolean; changed: boolean } {
  const root = readConfig(configFile);

  const currentServers = root.mcpServers;

  if (currentServers !== undefined && !isObject(currentServers)) {
    throw new Error(`Invalid existing Agy MCP config: mcpServers must be an object in ${configFile}.`);
  }

  const mcpServers: JsonObject = isObject(currentServers)
    ? {
        ...currentServers,
      }
    : {};

  const existing = mcpServers[serverName];

  if (sameServer(existing, binary) && !force) {
    return {
      installed: true,
      changed: false,
    };
  }

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
    throw new Error(`Agy MCP configuration was written but verification failed for ${configFile}.`);
  }

  return {
    installed: true,
    changed: true,
  };
}

/**
 * Install ToolNet MCP for AGY / Antigravity CLI.
 *
 * Official paths:
 * - Global: ~/.gemini/config/mcp_config.json
 * - Workspace: <project>/.agents/mcp_config.json
 *
 * Preserves all other MCP servers.
 * Stops on invalid JSON (never overwrites corrupt config).
 */
export function installAgyMcp(options: InstallAgyMcpOptions = {}): InstallAgyMcpResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const scope = options.scope ?? 'global';

  if (options.configFile) {
    // Explicit file overrides scope
    const result = installToSingleFile(options.configFile, binary, serverName, options.force ?? false);
    return {
      ...result,
      configFile: options.configFile,
      serverName,
      command: binary,
      args: ['mcp'],
    };
  }

  if (scope === 'both') {
    const globalFile = agyGlobalMcpConfigFile();
    const workspaceFile = agyWorkspaceMcpConfigFile({ cwd: options.cwd });

    const globalResult = installToSingleFile(globalFile, binary, serverName, options.force ?? false);
    const workspaceResult = installToSingleFile(workspaceFile, binary, serverName, options.force ?? false);

    return {
      installed: true,
      changed: globalResult.changed || workspaceResult.changed,
      configFile: globalFile,
      serverName,
      command: binary,
      args: ['mcp'],
    };
  }

  const configFile =
    scope === 'workspace'
      ? agyWorkspaceMcpConfigFile({ cwd: options.cwd })
      : agyGlobalMcpConfigFile();

  const result = installToSingleFile(configFile, binary, serverName, options.force ?? false);

  return {
    ...result,
    configFile,
    serverName,
    command: binary,
    args: ['mcp'],
  };
}
