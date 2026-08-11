import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { dirname, join } from 'node:path';

export interface InstallOpenCodeMcpOptions {
  configFile?: string;

  binary?: string;

  serverName?: string;
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

function globalConfigDirectory(): string {
  const xdg = process.env.XDG_CONFIG_HOME?.trim();

  if (xdg) {
    return join(xdg, 'opencode');
  }

  return join(homedir(), '.config', 'opencode');
}

function defaultConfigFile(): string {
  return join(globalConfigDirectory(), 'opencode.json');
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
  } catch (error) {
    throw new Error(
      `Invalid existing OpenCode opencode.json: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isObject(parsed)) {
    throw new Error('Invalid existing OpenCode opencode.json: root must be a JSON object.');
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

export function installOpenCodeMcp(
  options: InstallOpenCodeMcpOptions = {}
): InstallOpenCodeMcpResult {
  const configFile = options.configFile ?? defaultConfigFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const serverName = options.serverName ?? 'toolnet-memory';

  /*
   * If the user uses opencode.jsonc, leave it untouched.
   *
   * ToolNet writes only its managed JSON config.
   * OpenCode merges configuration sources.
   */
  const jsoncFile = join(dirname(configFile), 'opencode.jsonc');

  const preservedJsonc = existsSync(jsoncFile) ? jsoncFile : undefined;

  const root = readConfig(configFile);

  const currentMcp = root.mcp;

  if (currentMcp !== undefined && !isObject(currentMcp)) {
    throw new Error('Invalid existing OpenCode config: mcp must be an object.');
  }

  const mcp: JsonObject = isObject(currentMcp)
    ? {
        ...currentMcp,
      }
    : {};

  const existing = mcp[serverName];

  if (sameServer(existing, binary)) {
    return {
      installed: true,

      changed: false,

      configFile,

      serverName,

      command: [binary, 'mcp'],

      preservedJsonc,
    };
  }

  /*
   * ToolNet owns only this single MCP entry.
   *
   * Existing OpenCode providers, models,
   * permissions, plugins and other MCP servers
   * remain untouched.
   */
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
    throw new Error('OpenCode MCP configuration was written but verification failed.');
  }

  return {
    installed: true,

    changed: true,

    configFile,

    serverName,

    command: [binary, 'mcp'],

    preservedJsonc,
  };
}
