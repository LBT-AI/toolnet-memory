import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { agyHooksFile } from './config-paths.js';

export interface InstallAgyHookOptions {
  hooksFile?: string;

  binary?: string;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function installAgyHooks(options: InstallAgyHookOptions = {}): string {
  const hooksFile = options.hooksFile ?? agyHooksFile();

  mkdirSync(dirname(hooksFile), {
    recursive: true,

    mode: 0o700,
  });

  let root: Record<string, unknown> = {};

  if (existsSync(hooksFile)) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(readFileSync(hooksFile, 'utf8'));
    } catch (error) {
      throw new Error(
        `Invalid existing Agy hooks.json: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('Invalid existing Agy hooks.json: root must be a JSON object.');
    }

    root = parsed as Record<string, unknown>;
  }

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const command = `${quote(binary)} session:agy-hook`;

  /*
   * Official Antigravity hook schema.
   * Stop = sync when one execution becomes idle.
   * It is intentionally NOT treated as permanent SessionEnd.
   */
  root['toolnet-memory'] = {
    enabled: true,

    /*
     * Prevent raw ToolNet session replay.
     *
     * Compact continuity belongs in PreInvocation.
     * Deep history belongs behind memory_agent_ask.
     */
    PreToolUse: [
      {
        matcher: 'view_file|list_dir|find_by_name|grep_search|run_command',

        hooks: [
          {
            type: 'command',

            command: `${command} pre-tool`,

            timeout: 5,
          },
        ],
      },
    ],

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

  const temporary = `${hooksFile}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temporary, JSON.stringify(root, null, 2) + '\n', {
      encoding: 'utf8',

      mode: 0o600,
    });

    renameSync(temporary, hooksFile);
  } finally {
    rmSync(temporary, {
      force: true,
    });
  }

  return hooksFile;
}
