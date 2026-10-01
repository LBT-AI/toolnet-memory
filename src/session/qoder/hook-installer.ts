import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { qoderSettingsFile } from './config-paths.js';

export interface QoderHookInstallOptions {
  settingsFile?: string;

  binary?: string;
}

export interface QoderHookInstallResult {
  settingsFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionEndInstalled: boolean;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function readJsonFile(file: string): Record<string, unknown> {
  if (!existsSync(file)) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(
      `Invalid existing Qoder settings.json at ${file}: parse error. Not overwriting.`
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid existing Qoder settings.json at ${file}: root must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
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

export function installQoderHooks(options: QoderHookInstallOptions = {}): QoderHookInstallResult {
  const settingsFile = options.settingsFile ?? qoderSettingsFile();

  const root = readJsonFile(settingsFile);

  const binary = options.binary ?? 'toolnet-memory';

  const stopCommand = `${quote(binary)} session:qoder-hook`;
  const sessionEndCommand = `${quote(binary)} session:qoder-hook`;

  const desiredStop = {
    type: 'command',
    command: stopCommand,
    timeout: 30,
  };

  const desiredSessionEnd = {
    type: 'command',
    command: sessionEndCommand,
    timeout: 3,
  };

  const hooks = Array.isArray(root.hooks)
    ? [...(root.hooks as Array<Record<string, unknown>>)]
    : [];

  const cleanedStop = hooks.filter((item: Record<string, unknown>) => {
    try {
      return !JSON.stringify(item).includes('session:qoder-hook');
    } catch {
      return true;
    }
  });

  const cleanedSessionEnd = cleanedStop.filter((item: Record<string, unknown>) => {
    try {
      return !JSON.stringify(item).includes('session:qoder-hook');
    } catch {
      return true;
    }
  });

  hooks.length = 0;
  hooks.push({ ...desiredStop, event: 'Stop' }, { ...desiredSessionEnd, event: 'SessionEnd' });

  root.hooks = hooks;

  const next = JSON.stringify(root, null, 2) + '\n';

  const changed = !existsSync(settingsFile) || readFileSync(settingsFile, 'utf8') !== next;

  atomicWriteJson(settingsFile, root);

  return {
    settingsFile,
    changed,
    stopInstalled: true,
    sessionEndInstalled: true,
  };
}
