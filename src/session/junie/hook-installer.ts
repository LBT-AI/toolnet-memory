import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { junieConfigFile } from './config-paths.js';

export interface JunieHookInstallOptions {
  configFile?: string;

  binary?: string;

  projectRoot?: string;
}

export interface JunieHookInstallResult {
  configFile: string;

  changed: boolean;

  events: string[];
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
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
    throw new Error(`Invalid existing Junie config.json at ${file}: parse error. Not overwriting.`);
  }

  if (!isObject(parsed)) {
    throw new Error(`Invalid existing Junie config.json at ${file}: root must be an object.`);
  }

  return parsed;
}

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
}

/**
 * Install ToolNet Memory lifecycle hooks into Junie's user config.
 *
 * Junie fires SessionStart with session metadata and SessionEnd/Stop without
 * a session id (Stop carries the last assistant message), so the hook command
 * carries the project root and the runtime keeps a project-scoped marker.
 * Timeouts are seconds, as required by Junie.
 */
export function installJunieHooks(options: JunieHookInstallOptions = {}): JunieHookInstallResult {
  const configFile = options.configFile ?? junieConfigFile();

  const root = readConfig(configFile);

  const binary = options.binary ?? 'toolnet-memory';

  const projectRoot = options.projectRoot ?? process.cwd();

  const command = `${quote(binary)} session:junie-hook --project ${quote(projectRoot)}`;

  const hooks = isObject(root.hooks) ? { ...root.hooks } : {};

  const events: Array<{ name: 'SessionStart' | 'Stop' | 'SessionEnd'; timeout: number }> = [
    { name: 'SessionStart', timeout: 10 },
    { name: 'Stop', timeout: 30 },
    { name: 'SessionEnd', timeout: 8 },
  ];

  const isOwnHook = (value: unknown): boolean => {
    if (!isObject(value) || typeof value.command !== 'string') {
      return false;
    }

    if (!value.command.includes('session:junie-hook')) {
      return false;
    }

    return value.command.includes(quote(projectRoot)) || !value.command.includes('--project');
  };

  for (const event of events) {
    const groups = Array.isArray(hooks[event.name]) ? [...(hooks[event.name] as unknown[])] : [];

    const cleaned = groups
      .map((group) => {
        if (!isObject(group) || !Array.isArray(group.hooks)) {
          return group;
        }

        const remaining = group.hooks.filter((hook) => !isOwnHook(hook));

        return remaining.length > 0 ? { ...group, hooks: remaining } : undefined;
      })
      .filter((group) => group !== undefined);

    cleaned.push({
      hooks: [
        {
          type: 'command',
          command,
          timeout: event.timeout,
        },
      ],
    });

    hooks[event.name] = cleaned;
  }

  root.hooks = hooks;

  const next = `${JSON.stringify(root, null, 2)}\n`;

  const changed = !existsSync(configFile) || readFileSync(configFile, 'utf8') !== next;

  atomicWriteJson(configFile, root);

  return {
    configFile,
    changed,
    events: events.map((event) => event.name),
  };
}
