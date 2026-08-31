import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { kiroMcpConfigFile, kiroProjectMcpConfigFile } from './config-paths.js';

export interface InstallKiroMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;

  scope?: 'global' | 'project' | 'both';

  cwd?: string;

  force?: boolean;
}

export interface InstallKiroMcpResult {
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
    throw new Error(`Invalid existing Kiro MCP config at ${file}: parse error. Not overwriting.`);
  }

  if (!isObject(parsed)) {
    throw new Error(
      `Invalid existing Kiro MCP config at ${file}: root must be a JSON object. Not overwriting.`
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
    value.args[0] === 'mcp' &&
    value.disabled === false
  );
}

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, {
      force: true,
    });
  }
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
    throw new Error(
      `Invalid existing Kiro MCP config: mcpServers must be an object in ${configFile}.`
    );
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
    disabled: false,
  };

  const next = {
    ...root,
    mcpServers,
  };

  atomicWriteJson(configFile, next);

  const verify = readConfig(configFile);

  const verifyServers = verify.mcpServers;

  if (!isObject(verifyServers) || !sameServer(verifyServers[serverName], binary)) {
    throw new Error(
      `Kiro MCP configuration was written but verification failed for ${configFile}.`
    );
  }

  return {
    installed: true,
    changed: true,
  };
}

/**
 * Install ToolNet MCP for Kiro CLI.
 *
 * Official MCP schema:
 * {
 *   "mcpServers": {
 *     "toolnet-memory": {
 *       "command": "toolnet-memory",
 *       "args": ["mcp"],
 *       "disabled": false
 *     }
 *   }
 * }
 *
 * Global: ~/.kiro/settings/mcp.json
 * Project: <project>/.kiro/settings/mcp.json
 *
 * Preserves all other MCP servers.
 * Stops on invalid JSON (never overwrites corrupt config).
 */
export function installKiroMcp(options: InstallKiroMcpOptions = {}): InstallKiroMcpResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const scope = options.scope ?? 'global';

  if (options.configFile) {
    const result = installToSingleFile(
      options.configFile,
      binary,
      serverName,
      options.force ?? false
    );
    return {
      ...result,
      configFile: options.configFile,
      serverName,
      command: binary,
      args: ['mcp'],
    };
  }

  if (scope === 'both') {
    const globalFile = kiroMcpConfigFile();
    const projectFile = kiroProjectMcpConfigFile({ cwd: options.cwd });

    const globalResult = installToSingleFile(
      globalFile,
      binary,
      serverName,
      options.force ?? false
    );
    const projectResult = installToSingleFile(
      projectFile,
      binary,
      serverName,
      options.force ?? false
    );

    return {
      installed: true,
      changed: globalResult.changed || projectResult.changed,
      configFile: globalFile,
      serverName,
      command: binary,
      args: ['mcp'],
    };
  }

  const configFile =
    scope === 'project' ? kiroProjectMcpConfigFile({ cwd: options.cwd }) : kiroMcpConfigFile();

  const result = installToSingleFile(configFile, binary, serverName, options.force ?? false);

  return {
    ...result,
    configFile,
    serverName,
    command: binary,
    args: ['mcp'],
  };
}
