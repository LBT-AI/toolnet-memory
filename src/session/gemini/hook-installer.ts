import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { geminiSettingsFile } from './config-paths.js';

export interface GeminiHookInstallOptions {
  settingsFile?: string;

  binary?: string;
}

export interface GeminiHookInstallResult {
  settingsFile: string;

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

function readSettings(file: string): JsonObject {
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
      `Invalid existing Gemini settings.json at ${file}: parse error. Not overwriting.`
    );
  }

  if (!isObject(parsed)) {
    throw new Error(`Invalid existing Gemini settings.json at ${file}: root must be an object.`);
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

function isOwnHook(value: unknown): boolean {
  if (!isObject(value)) {
    return false;
  }

  const command = typeof value.command === 'string' ? value.command : '';

  return command.includes('session:gemini-hook');
}

/**
 * Install ToolNet Memory lifecycle hooks into Gemini CLI settings.
 *
 * Gemini merges `hooks` from project and user settings; each event maps to an
 * array of matcher groups holding `{ type: 'command', command }` hooks.
 */
export function installGeminiHooks(
  options: GeminiHookInstallOptions = {}
): GeminiHookInstallResult {
  const settingsFile = options.settingsFile ?? geminiSettingsFile();

  const root = readSettings(settingsFile);

  const binary = options.binary ?? 'toolnet-memory';

  const command = `${quote(binary)} session:gemini-hook`;

  const hooks = isObject(root.hooks) ? { ...root.hooks } : {};

  const events = ['SessionStart', 'SessionEnd'] as const;

  for (const event of events) {
    const groups = Array.isArray(hooks[event]) ? [...(hooks[event] as unknown[])] : [];

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
          name: 'toolnet-memory',
          type: 'command',
          command,
          timeout: event === 'SessionEnd' ? 10_000 : 30_000,
        },
      ],
    });

    hooks[event] = cleaned;
  }

  root.hooks = hooks;

  const next = `${JSON.stringify(root, null, 2)}\n`;

  const changed = !existsSync(settingsFile) || readFileSync(settingsFile, 'utf8') !== next;

  atomicWriteJson(settingsFile, root);

  return {
    settingsFile,
    changed,
    events: [...events],
  };
}
