import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { claudeStateFile } from './config-paths.js';

type JsonObject = Record<string, unknown>;

export interface InstallClaudeMcpOptions {
  stateFile?: string;

  binary?: string;

  serverName?: string;
}

export interface InstallClaudeMcpResult {
  installed: boolean;

  changed: boolean;

  configFile: string;

  serverName: string;

  command: string[];

  repaired: boolean;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRoot(file: string): JsonObject {
  if (!existsSync(file)) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(
      `Invalid existing Claude Code config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isObject(parsed)) {
    throw new Error('Invalid existing Claude Code config: root must be a JSON object.');
  }

  return parsed;
}

function sameServer(value: unknown, binary: string): boolean {
  if (!isObject(value)) {
    return false;
  }

  const args = value.args;

  return (
    value.type === 'stdio' &&
    value.command === binary &&
    Array.isArray(args) &&
    args.length === 1 &&
    args[0] === 'mcp'
  );
}

function atomicWrite(file: string, value: JsonObject): void {
  mkdirSync(dirname(file), {
    recursive: true,
  });

  const temporary = `${file}.toolnet-${process.pid}-${Date.now()}.tmp`;

  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {
      encoding: 'utf8',

      mode: 0o600,
    });

    renameSync(temporary, file);
  } finally {
    rmSync(temporary, {
      force: true,
    });
  }
}

export function installClaudeMcp(options: InstallClaudeMcpOptions = {}): InstallClaudeMcpResult {
  const configFile = options.stateFile ?? claudeStateFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  const root = readRoot(configFile);

  const current = root.mcpServers;

  if (current !== undefined && !isObject(current)) {
    throw new Error('Invalid existing Claude Code config: mcpServers must be an object.');
  }

  const mcpServers: JsonObject = isObject(current)
    ? {
        ...current,
      }
    : {};

  const existing = mcpServers[serverName];

  if (sameServer(existing, binary)) {
    return {
      installed: true,

      changed: false,

      configFile,

      serverName,

      command: [binary, 'mcp'],

      repaired: false,
    };
  }

  const repaired = existing !== undefined;

  /*
   * ToolNet owns only this entry.
   * Everything else in ~/.claude.json is preserved.
   */
  mcpServers[serverName] = {
    type: 'stdio',

    command: binary,

    args: ['mcp'],
  };

  atomicWrite(configFile, {
    ...root,

    mcpServers,
  });

  const verify = readRoot(configFile);

  const verifyServers = verify.mcpServers;

  if (!isObject(verifyServers) || !sameServer(verifyServers[serverName], binary)) {
    throw new Error('Claude Code MCP configuration was written but verification failed.');
  }

  return {
    installed: true,

    changed: true,

    configFile,

    serverName,

    command: [binary, 'mcp'],

    repaired,
  };
}
