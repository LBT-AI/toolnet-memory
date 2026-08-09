import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { homedir } from 'node:os';

import { dirname, join } from 'node:path';

export interface InstallAgyHookOptions {
  hooksFile?: string;

  binary?: string;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function installAgyHooks(options: InstallAgyHookOptions = {}): string {
  const hooksFile = options.hooksFile ?? join(homedir(), '.gemini', 'config', 'hooks.json');

  mkdirSync(dirname(hooksFile), {
    recursive: true,
  });

  let root: Record<string, unknown> = {};

  if (existsSync(hooksFile)) {
    try {
      root = JSON.parse(readFileSync(hooksFile, 'utf8'));
    } catch (error) {
      throw new Error(
        `Invalid existing Agy hooks.json: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const binary = options.binary ?? 'toolnet-memory';

  const command = `${quote(binary)} session:agy-hook`;

  /*
   * Official Antigravity hook schema.
   * Stop = sync when one execution becomes idle.
   * It is intentionally NOT treated as permanent SessionEnd.
   */
  root['toolnet-memory'] = {
    enabled: true,

    PreInvocation: [
      {
        type: 'command',

        command: `${command} pre`,

        timeout: 15,
      },
    ],

    PostInvocation: [
      {
        type: 'command',

        command: `${command} post`,

        timeout: 15,
      },
    ],

    Stop: [
      {
        type: 'command',

        command: `${command} stop`,

        timeout: 30,
      },
    ],
  };

  writeFileSync(hooksFile, JSON.stringify(root, null, 2) + '\n', {
    encoding: 'utf8',

    mode: 0o600,
  });

  return hooksFile;
}
