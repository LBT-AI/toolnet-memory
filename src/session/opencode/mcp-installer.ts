import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { openCodeGlobalConfigFile, openCodeProjectConfigFile } from './config-paths.js';

export interface InstallOpenCodeMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;

  scope?: 'global' | 'project' | 'both';

  cwd?: string;

  force?: boolean;
}

export interface InstallOpenCodeMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;

  serverName: string;

  command: string[];

  preservedJsonc?: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), {
    recursive: true,
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
      `Invalid existing OpenCode config at ${file}: parse error. Not overwriting.`
    );
  }

  if (!isObject(parsed)) {
    throw new Error(
      `Invalid existing OpenCode config at ${file}: root must be a JSON object. Not overwriting.`
    );
  }

  return parsed;
}

function sameServer(value: unknown, binary: string): boolean {
  if (!isObject(value)) {
    return false;
  }

  const command = value.command;

  return (
    value.type === 'local' &&
    value.enabled !== false &&
    Array.isArray(command) &&
    command.length === 2 &&
    command[0] === binary &&
    command[1] === 'mcp'
  );
}

function installToSingleFile(
  configFile: string,
  binary: string,
  serverName: string,
  force: boolean
): { installed: boolean; changed: boolean; preservedJsonc?: string } {
  const jsoncFile = join(dirname(configFile), 'opencode.jsonc');
  const preservedJsonc = existsSync(jsoncFile) ? jsoncFile : undefined;

  const root = readConfig(configFile);

  const currentMcp = root.mcp;

  if (currentMcp !== undefined && !isObject(currentMcp)) {
    throw new Error(`Invalid existing OpenCode config: mcp must be an object in ${configFile}.`);
  }

  const mcp: JsonObject = isObject(currentMcp)
    ? {
        ...currentMcp,
      }
    : {};

  const existing = mcp[serverName];

  if (sameServer(existing, binary) && !force) {
    return {
      installed: true,
      changed: false,
      preservedJsonc,
    };
  }

  mcp[serverName] = {
    type: 'local',
    command: [binary, 'mcp'],
    enabled: true,
  };

  const next = {
    ...root,
    mcp,
  };

  atomicWriteJson(configFile, next);

  const verify = readConfig(configFile);

  if (!isObject(verify.mcp) || !sameServer(verify.mcp[serverName], binary)) {
    throw new Error(`OpenCode MCP configuration was written but verification failed for ${configFile}.`);
  }

  return {
    installed: true,
    changed: true,
    preservedJsonc,
  };
}

/**
 * Install ToolNet MCP for OpenCode.
 *
 * Official MCP schema:
 * {
 *   "mcp": {
 *     "toolnet-memory": {
 *       "type": "local",
 *       "command": ["toolnet-memory", "mcp"],
 *       "enabled": true
 *     }
 *   }
 * }
 *
 * Preserves all other MCP servers.
 * Stops on invalid JSON (never overwrites corrupt config).
 * Does NOT auto-migrate legacy mcpServers entries.
 */
export function installOpenCodeMcp(
  options: InstallOpenCodeMcpOptions = {}
): InstallOpenCodeMcpResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const scope = options.scope ?? 'global';

  if (options.configFile) {
    const result = installToSingleFile(options.configFile, binary, serverName, options.force ?? false);
    return {
      ...result,
      configFile: options.configFile,
      serverName,
      command: [binary, 'mcp'],
    };
  }

  if (scope === 'both') {
    const globalFile = openCodeGlobalConfigFile();
    const projectFile = openCodeProjectConfigFile({ cwd: options.cwd });

    const globalResult = installToSingleFile(globalFile, binary, serverName, options.force ?? false);
    const projectResult = installToSingleFile(projectFile, binary, serverName, options.force ?? false);

    return {
      installed: true,
      changed: globalResult.changed || projectResult.changed,
      configFile: globalFile,
      serverName,
      command: [binary, 'mcp'],
      preservedJsonc: globalResult.preservedJsonc ?? projectResult.preservedJsonc,
    };
  }

  const configFile =
    scope === 'project'
      ? openCodeProjectConfigFile({ cwd: options.cwd })
      : openCodeGlobalConfigFile();

  const result = installToSingleFile(configFile, binary, serverName, options.force ?? false);

  return {
    ...result,
    configFile,
    serverName,
    command: [binary, 'mcp'],
  };
}
