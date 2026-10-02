import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { bobGlobalSettingsFile, bobWorkspaceSettingsFile } from './config-paths.js';

export interface BobHookInstallOptions {
  home?: string;

  globalSettingsFile?: string;

  workspaceSettingsFile?: string;

  projectRoot?: string;

  binary?: string;
}

export interface BobHookInstallResult {
  settingsFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionStartInstalled: boolean;
}

function readJsonFile(file: string): Record<string, unknown> {
  if (!existsSync(file)) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Invalid existing Bob settings.json at ${file}: parse error. Not overwriting.`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid existing Bob settings.json at ${file}: root must be a JSON object.`);
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

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function installBobHooks(options: BobHookInstallOptions = {}): BobHookInstallResult {
  const settingsFile =
    options.projectRoot !== undefined
      ? bobWorkspaceSettingsFile(options.projectRoot)
      : bobGlobalSettingsFile({ home: options.home });

  const root = readJsonFile(settingsFile);

  const binary = options.binary ?? 'toolnet-memory';

  const stopCommand = `${quote(binary)} hook ibm-bob`;
  const sessionStartCommand = `${quote(binary)} hook ibm-bob`;

  const desiredStop = {
    type: 'command',
    command: stopCommand,
    timeout: 10,
  };

  const desiredSessionStart = {
    type: 'command',
    command: sessionStartCommand,
    timeout: 10,
  };

  const hooks =
    root.hooks && typeof root.hooks === 'object' && !Array.isArray(root.hooks)
      ? (root.hooks as Record<string, unknown>)
      : {};

  root.hooks = hooks;

  const previousStop = Array.isArray(hooks.Stop) ? hooks.Stop : [];
  const cleanedStop = previousStop.filter((item: unknown) => {
    try {
      return !JSON.stringify(item).includes('hook ibm-bob');
    } catch {
      return true;
    }
  });

  const previousSessionStart = Array.isArray(hooks.SessionStart) ? hooks.SessionStart : [];
  const cleanedSessionStart = previousSessionStart.filter((item: unknown) => {
    try {
      return !JSON.stringify(item).includes('hook ibm-bob');
    } catch {
      return true;
    }
  });

  hooks.Stop = [...cleanedStop, { hooks: [desiredStop] }];
  hooks.SessionStart = [...cleanedSessionStart, { hooks: [desiredSessionStart] }];

  const next = JSON.stringify(root, null, 2) + '\n';

  const changed = !existsSync(settingsFile) || readFileSync(settingsFile, 'utf8') !== next;

  atomicWriteJson(settingsFile, root);

  return {
    settingsFile,
    changed,
    stopInstalled: true,
    sessionStartInstalled: true,
  };
}
