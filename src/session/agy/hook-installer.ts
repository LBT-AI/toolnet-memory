import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { agyPluginRoot } from './config-paths.js';

export interface InstallAgyHookOptions {
  hooksFile?: string;

  binary?: string;

  pluginName?: string;
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
    throw new Error(`Invalid existing Agy hooks.json at ${file}: parse error. Not overwriting.`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid existing Agy hooks.json at ${file}: root must be a JSON object.`);
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

/**
 * Install ToolNet hooks into a hooks.json file.
 *
 * Official Antigravity hook schema:
 * - PreToolUse: matcher + hooks[]
 * - PreInvocation/PostInvocation/Stop: handlers directly, no matcher
 * - Stop decision: "continue" re-enters loop, anything else allows stop
 *
 * Does NOT auto-migrate or remove legacy entries.
 * Only writes the ToolNet hook entry.
 */
export function installAgyHooks(options: InstallAgyHookOptions = {}): string {
  const pluginName = options.pluginName ?? 'toolnet-memory';

  // Write to plugin's hooks.json (official plugin location)
  const pluginHooksFile =
    options.hooksFile ?? join(agyPluginRoot(pluginName), 'hooks.json');

  const root = readJsonFile(pluginHooksFile);

  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const command = `${quote(binary)} session:agy-hook`;

  /*
   * Official Antigravity hook schema.
   * Stop = sync when one execution becomes idle.
   * It is intentionally NOT treated as permanent SessionEnd.
   *
   * PreToolUse uses matcher + hooks[] array.
   * PreInvocation/PostInvocation/Stop use handlers directly (no matcher).
   */
  root['toolnet-memory'] = {
    enabled: true,

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

  atomicWriteJson(pluginHooksFile, root);

  return pluginHooksFile;
}
