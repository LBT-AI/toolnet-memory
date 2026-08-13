import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { claudeSettingsFile } from './config-paths.js';

type JsonObject = Record<string, unknown>;

export interface InstallClaudeHooksOptions {
  settingsFile?: string;

  binary?: string;
}

export interface InstallClaudeHooksResult {
  settingsFile: string;

  changed: boolean;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replace(/'/gu, `'\\''`)}'`;
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
      `Invalid existing Claude settings.json: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isObject(parsed)) {
    throw new Error('Invalid existing Claude settings.json: root must be a JSON object.');
  }

  return parsed;
}

function cleanManagedGroups(value: unknown): unknown[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('Invalid existing Claude settings.json: hook event must be an array.');
  }

  const output: unknown[] = [];

  for (const group of value) {
    if (!isObject(group)) {
      output.push(group);

      continue;
    }

    const handlers = group.hooks;

    if (!Array.isArray(handlers)) {
      output.push(group);

      continue;
    }

    const remaining = handlers.filter((handler) => {
      if (!isObject(handler)) {
        return true;
      }

      const command = handler.command;

      return !(typeof command === 'string' && command.includes('session:claude-hook'));
    });

    if (remaining.length === 0) {
      continue;
    }

    output.push({
      ...group,

      hooks: remaining,
    });
  }

  return output;
}

function handler(command: string): JsonObject {
  return {
    type: 'command',

    command,

    timeout: 10,
  };
}

function atomicWrite(file: string, root: JsonObject): void {
  mkdirSync(dirname(file), {
    recursive: true,

    mode: 0o700,
  });

  const temporary = `${file}.toolnet-${process.pid}-${Date.now()}.tmp`;

  try {
    writeFileSync(temporary, JSON.stringify(root, null, 2) + '\n', {
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

export function installClaudeHooks(
  options: InstallClaudeHooksOptions = {}
): InstallClaudeHooksResult {
  const settingsFile = options.settingsFile ?? claudeSettingsFile();

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const root = readRoot(settingsFile);

  const existingHooks = root.hooks;

  if (existingHooks !== undefined && !isObject(existingHooks)) {
    throw new Error('Invalid existing Claude settings.json: hooks must be an object.');
  }

  const hooks: JsonObject = isObject(existingHooks)
    ? {
        ...existingHooks,
      }
    : {};

  const command = `${shellQuote(binary)} session:claude-hook`;

  const sessionStart = cleanManagedGroups(hooks.SessionStart);

  sessionStart.push({
    matcher: 'startup|resume|clear|compact',

    hooks: [handler(command)],
  });

  hooks.SessionStart = sessionStart;

  const postToolUse = cleanManagedGroups(hooks.PostToolUse);

  postToolUse.push({
    matcher: 'Edit|Write',

    hooks: [handler(command)],
  });

  hooks.PostToolUse = postToolUse;

  const stop = cleanManagedGroups(hooks.Stop);

  stop.push({
    hooks: [handler(command)],
  });

  hooks.Stop = stop;

  const next: JsonObject = {
    ...root,

    hooks,
  };

  const before = JSON.stringify(root);

  const after = JSON.stringify(next);

  if (before === after) {
    return {
      settingsFile,

      changed: false,
    };
  }

  atomicWrite(settingsFile, next);

  return {
    settingsFile,

    changed: true,
  };
}
