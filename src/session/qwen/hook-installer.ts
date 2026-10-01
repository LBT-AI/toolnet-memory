import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { qwenHooksFile } from './config-paths.js';

export interface QwenHookInstallOptions {
  hooksFile?: string;

  binary?: string;

  projectRoot?: string;
}

export interface QwenHookInstallResult {
  hooksFile: string;

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
    throw new Error(`Invalid existing Qwen hooks.json at ${file}: parse error. Not overwriting.`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid existing Qwen hooks.json at ${file}: root must be a JSON object.`);
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

export function installQwenHooks(options: QwenHookInstallOptions = {}): QwenHookInstallResult {
  const hooksFile = options.hooksFile ?? qwenHooksFile({ projectRoot: options.projectRoot });

  const root = readJsonFile(hooksFile);

  const binary = options.binary ?? 'toolnet-memory';

  const stopCommand = `${quote(binary)} session:qwen-hook`;
  const sessionEndCommand = `${quote(binary)} session:qwen-hook`;

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

  const hooks =
    root.hooks && typeof root.hooks === 'object' && !Array.isArray(root.hooks)
      ? (root.hooks as Record<string, unknown>)
      : {};

  root.hooks = hooks;

  const previousStop = Array.isArray(hooks.Stop) ? hooks.Stop : [];
  const cleanedStop = previousStop.filter((item: unknown) => {
    try {
      return !JSON.stringify(item).includes('session:qwen-hook');
    } catch {
      return true;
    }
  });

  const previousSessionEnd = Array.isArray(hooks.SessionEnd) ? hooks.SessionEnd : [];
  const cleanedSessionEnd = previousSessionEnd.filter((item: unknown) => {
    try {
      return !JSON.stringify(item).includes('session:qwen-hook');
    } catch {
      return true;
    }
  });

  hooks.Stop = [...cleanedStop, { hooks: [desiredStop] }];
  hooks.SessionEnd = [...cleanedSessionEnd, { hooks: [desiredSessionEnd] }];

  const next = JSON.stringify(root, null, 2) + '\n';

  const changed = !existsSync(hooksFile) || readFileSync(hooksFile, 'utf8') !== next;

  atomicWriteJson(hooksFile, root);

  return {
    hooksFile,
    changed,
    stopInstalled: true,
    sessionEndInstalled: true,
  };
}
