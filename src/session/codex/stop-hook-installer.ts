import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { dirname, join } from 'node:path';

export interface CodexStopHookInstallOptions {
  hooksFile?: string;

  binary?: string;
}

export interface CodexStopHookInstallResult {
  hooksFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionEndInstalled: boolean;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function installCodexStopHook(
  options: CodexStopHookInstallOptions = {}
): CodexStopHookInstallResult {
  const hooksFile =
    options.hooksFile ?? join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'hooks.json');

  mkdirSync(dirname(hooksFile), {
    recursive: true,
  });

  let root: Record<string, unknown> = {};

  if (existsSync(hooksFile)) {
    try {
      root = JSON.parse(readFileSync(hooksFile, 'utf8'));
    } catch {
      throw new Error(
        `Invalid existing Codex hooks.json at ${hooksFile}: parse error. Not overwriting.`
      );
    }
  }

  const hooks =
    root.hooks && typeof root.hooks === 'object' && !Array.isArray(root.hooks)
      ? (root.hooks as Record<string, unknown>)
      : {};

  root.hooks = hooks;

  const binary = options.binary ?? 'toolnet-memory';

  const stopCommand = `${quote(binary)} session:codex-stop-hook`;
  const sessionEndCommand = `${quote(binary)} session:codex-session-end`;

  const desiredStop = {
    hooks: [
      {
        type: 'command',
        command: stopCommand,
        timeout: 30,
      },
    ],
  };

  const desiredSessionEnd = {
    hooks: [
      {
        type: 'command',
        command: sessionEndCommand,
        timeout: 3,
      },
    ],
  };

  const previousStop = Array.isArray(hooks.Stop) ? hooks.Stop : [];
  const cleanedStop = previousStop.filter((item: unknown) => {
    try {
      return !JSON.stringify(item).includes('session:codex-stop-hook');
    } catch {
      return true;
    }
  });

  const previousSessionEnd = Array.isArray(hooks.SessionEnd) ? hooks.SessionEnd : [];
  const cleanedSessionEnd = previousSessionEnd.filter((item: unknown) => {
    try {
      return !JSON.stringify(item).includes('session:codex-session-end');
    } catch {
      return true;
    }
  });

  hooks.Stop = [...cleanedStop, desiredStop];
  hooks.SessionEnd = [...cleanedSessionEnd, desiredSessionEnd];

  const next = JSON.stringify(root, null, 2) + '\n';

  const changed = !existsSync(hooksFile) || readFileSync(hooksFile, 'utf8') !== next;

  writeFileSync(hooksFile, next, {
    encoding: 'utf8',
    mode: 0o600,
  });

  return {
    hooksFile,
    changed,
    stopInstalled: true,
    sessionEndInstalled: true,
  };
}
