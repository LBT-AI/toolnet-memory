import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { dirname, join } from 'node:path';

export interface CodexContextHookInstallOptions {
  hooksFile?: string;

  binary?: string;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function installCodexContextHook(options: CodexContextHookInstallOptions = {}): string {
  const hooksFile =
    options.hooksFile ?? join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'hooks.json');

  mkdirSync(dirname(hooksFile), {
    recursive: true,
  });

  let root: Record<string, unknown> = {};

  if (existsSync(hooksFile)) {
    try {
      root = JSON.parse(readFileSync(hooksFile, 'utf8'));
    } catch (error) {
      throw new Error(
        `Invalid existing Codex hooks.json: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const hooks =
    root.hooks && typeof root.hooks === 'object' && !Array.isArray(root.hooks)
      ? (root.hooks as Record<string, unknown>)
      : {};

  root.hooks = hooks;

  const current = Array.isArray(hooks.SessionStart) ? (hooks.SessionStart as unknown[]) : [];

  /*
   * Remove only ToolNet's previous SessionStart entry.
   * Every unrelated Codex hook is preserved.
   */
  const cleaned = current.filter((item) => {
    try {
      return !JSON.stringify(item).includes('session:codex-context');
    } catch {
      return true;
    }
  });

  const binary = options.binary ?? 'toolnet-memory';

  cleaned.push({
    matcher: 'startup|resume|clear|compact',

    hooks: [
      {
        type: 'command',

        command: `${quote(binary)} session:codex-context`,

        timeout: 15,

        additionalContextLimit: 1000,

        statusMessage: 'Loading ToolNet project continuity',
      },
    ],
  });

  hooks.SessionStart = cleaned;

  writeFileSync(hooksFile, JSON.stringify(root, null, 2) + '\n', {
    encoding: 'utf8',

    mode: 0o600,
  });

  return hooksFile;
}
